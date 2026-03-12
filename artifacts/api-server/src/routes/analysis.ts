import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { parseExcelBuffer } from '../lib/excel-parser.js';
import { validateData, analyzeResults, getSubjectCols } from '../lib/analysis.js';
import { generateMarkdownReport } from '../lib/report-generator.js';
import { generateExcelExport } from '../lib/excel-exporter.js';

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parseSubjectPassPercentages(value: unknown): Record<string, number> | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, number> : undefined;
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

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
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

    res.json({ validation, analysis, rawData: rows, columns, subjectColumns });
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
      ? req.body.subjectPassPercentages as Record<string, number>
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

router.post('/export/pdf', (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { analysisData, showStudentIds } = req.body;
  if (!analysisData) {
    res.status(400).json({ error: 'Analysis data required.' });
    return;
  }

  try {
    // Generate markdown and convert to a simple HTML-based PDF via a plaintext report
    const markdown = generateMarkdownReport(analysisData, !!showStudentIds);
    // For PDF, we return a text/plain fallback since we don't have a heavy PDF lib on server
    // The frontend can handle conversion or we return the markdown as PDF placeholder
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="examination_analysis.pdf"');
    // Create a minimal PDF manually
    const pdfContent = createSimplePdf(markdown);
    res.send(pdfContent);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

function createSimplePdf(markdown: string): Buffer {
  const lines = markdown
    .split('\n')
    .map((line) =>
      line
        .replace(/\|/g, ' ')
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/^#+\s*/g, '')
        .trim()
    )
    .filter((line) => line.length > 0);

  const pdfTextLines = lines.slice(0, 180);
  let yPos = 760;
  const textOps: string[] = ['BT', '/F1 11 Tf'];

  for (const line of pdfTextLines) {
    const printable = line.substring(0, 95).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    textOps.push(`1 0 0 1 44 ${yPos} Tm (${printable}) Tj`);
    yPos -= 14;
    if (yPos < 40) break;
  }
  textOps.push('ET');

  const contentStream = `${textOps.join('\n')}\n`;

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf-8')} >>\nstream\n${contentStream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += obj;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}

export default router;
