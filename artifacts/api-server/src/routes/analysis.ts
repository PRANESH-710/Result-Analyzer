import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@workspace/db';
import { analysisHistoryTable } from '@workspace/db/schema';
import { parseExcelBuffer } from '../lib/excel-parser.js';
import { validateData, analyzeResults, getSubjectCols } from '../lib/analysis.js';
import { generateMarkdownReport, generatePdfReport } from '../lib/report-generator.js';
import { generateExcelExport } from '../lib/excel-exporter.js';

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parseSubjectPassPercentages(value: unknown): Record<string, number> | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : undefined;
  } catch {
    return undefined;
  }
}

function requireAuth(req: Request, res: Response): boolean {
  if (!(req.session as any).username) {
    res.status(401).json({ error: 'Not authenticated.' });
    return false;
  }
  return true;
}

function getSessionUsername(req: Request): string {
  return String((req.session as any).username ?? '');
}

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  const ext = req.file.originalname.toLowerCase();
  if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
    res.status(400).json({ error: 'Only Excel files (.xlsx, .xls) are supported.' });
    return;
  }

  const passPercentage = parseFloat(req.body?.passPercentage) || 40;
  const subjectPassPercentages = parseSubjectPassPercentages(req.body?.subjectPassPercentages);

  try {
    const { rows, columns } = parseExcelBuffer(req.file.buffer);
    const validation = validateData(rows, columns);

    if (!validation.isValid) {
      res.json({ validation, analysis: null, rawData: [], columns, subjectColumns: [] });
      return;
    }

    const subjectColumns = getSubjectCols(columns);
    const analysis = analyzeResults(rows, columns, passPercentage, subjectPassPercentages);
    const payload = { validation, analysis, rawData: rows, columns, subjectColumns };

    try {
      await db.insert(analysisHistoryTable).values({
        ownerUsername: getSessionUsername(req),
        name: req.file.originalname,
        passPercentage: Math.round(analysis?.passPercentage ?? passPercentage),
        subjectPassPercentages: analysis?.subjectPassPercentages ?? subjectPassPercentages ?? {},
        analysisData: payload,
      });
    } catch (error) {
      console.error('Failed to persist analysis history', error);
    }

    res.json(payload);
  } catch (err: any) {
    res.status(400).json({ error: `Failed to process file: ${err.message}` });
  }
});

router.post('/reanalyze', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const rawData = Array.isArray(req.body?.rawData) ? req.body.rawData : [];
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : [];
  const passPercentage = parseFloat(req.body?.passPercentage) || 40;
  const subjectPassPercentages =
    req.body?.subjectPassPercentages && typeof req.body.subjectPassPercentages === 'object'
      ? (req.body.subjectPassPercentages as Record<string, number>)
      : undefined;

  if (rawData.length === 0 || columns.length === 0) {
    res.status(400).json({ error: 'Raw data and columns are required.' });
    return;
  }

  const validation = validateData(rawData, columns);
  if (!validation.isValid) {
    res.json({ validation, analysis: null, rawData: [], columns, subjectColumns: [] });
    return;
  }

  const subjectColumns = getSubjectCols(columns);
  const analysis = analyzeResults(rawData, columns, passPercentage, subjectPassPercentages);

  res.json({ validation, analysis, rawData, columns, subjectColumns });
});

router.post('/export/excel', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { analysisData, rawData, subjectColumns } = req.body;
  if (!analysisData) {
    res.status(400).json({ error: 'Analysis data required.' });
    return;
  }

  try {
    const buffer = generateExcelExport(analysisData, rawData || [], subjectColumns || []);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="examination_analysis.xlsx"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

router.post('/export/markdown', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { analysisData, showStudentIds } = req.body;
  if (!analysisData) {
    res.status(400).json({ error: 'Analysis data required.' });
    return;
  }

  try {
    const markdown = generateMarkdownReport(analysisData, !!showStudentIds);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="examination_analysis.md"');
    res.send(markdown);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

router.post('/export/pdf', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { analysisData, showStudentIds } = req.body;
  if (!analysisData) {
    res.status(400).json({ error: 'Analysis data required.' });
    return;
  }

  try {
    const buffer = await generatePdfReport(analysisData, !!showStudentIds);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="examination_analysis.pdf"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const username = getSessionUsername(req);
  const rows = await db
    .select()
    .from(analysisHistoryTable)
    .where(eq(analysisHistoryTable.ownerUsername, username))
    .orderBy(desc(analysisHistoryTable.createdAt))
    .limit(100);

  res.json({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      passPercentage: row.passPercentage,
      subjectPassPercentages: row.subjectPassPercentages,
      analysisData: row.analysisData,
    })),
  });
});

router.delete('/history/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid history id.' });
    return;
  }

  const username = getSessionUsername(req);
  const deleted = await db
    .delete(analysisHistoryTable)
    .where(and(eq(analysisHistoryTable.id, id), eq(analysisHistoryTable.ownerUsername, username)))
    .returning({ id: analysisHistoryTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: 'History item not found.' });
    return;
  }

  res.json({ success: true });
});

router.delete('/history', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const username = getSessionUsername(req);
  await db.delete(analysisHistoryTable).where(eq(analysisHistoryTable.ownerUsername, username));
  res.json({ success: true });
});

export default router;
