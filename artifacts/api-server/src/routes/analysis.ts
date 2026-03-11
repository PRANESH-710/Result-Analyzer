import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { parseExcelBuffer } from '../lib/excel-parser.js';
import { validateData, analyzeResults, getSubjectCols } from '../lib/analysis.js';
import { generateMarkdownReport } from '../lib/report-generator.js';
import { generateExcelExport } from '../lib/excel-exporter.js';

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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

  try {
    const { rows, columns } = parseExcelBuffer(req.file.buffer);
    const validation = validateData(rows, columns);

    if (!validation.isValid) {
      res.json({ validation, analysis: null, rawData: [], columns, subjectColumns: [] });
      return;
    }

    const subjectColumns = getSubjectCols(columns);
    const analysis = analyzeResults(rows, columns, passPercentage);

    res.json({ validation, analysis, rawData: rows, columns, subjectColumns });
  } catch (err: any) {
    res.status(400).json({ error: `Failed to process file: ${err.message}` });
  }
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
  // Simple PDF generation using raw PDF syntax
  const lines = markdown.split('\n').filter(l => l.trim());
  const pdfLines: string[] = [];
  
  const header = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`;
  
  // Clean text for PDF
  const cleanText = lines
    .map(l => l.replace(/[#*|]/g, '').trim())
    .filter(l => l.length > 0)
    .slice(0, 100);
  
  let yPos = 750;
  const textOps: string[] = [];
  for (const line of cleanText) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    textOps.push(`BT /F1 12 Tf 50 ${yPos} Td (${escaped.substring(0, 80)}) Tj ET`);
    yPos -= 18;
    if (yPos < 50) break;
  }

  const streamContent = textOps.join('\n');
  const stream = `stream\n${streamContent}\nendstream`;
  
  const page = `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${stream.length} >>\n${stream}\nendobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`;

  const xrefOffset = (header + '\n' + page).length;
  const xref = `xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000274 00000 n\n0000000${String(xrefOffset).padStart(6, '0')} 00000 n`;
  
  const fullPdf = `${header}\n${page}\n${xref}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset + page.length}\n%%EOF`;
  
  return Buffer.from(fullPdf, 'utf-8');
}

export default router;
