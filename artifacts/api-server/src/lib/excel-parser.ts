import * as XLSX from 'xlsx';

export interface ParseResult {
  rows: Record<string, unknown>[];
  columns: string[];
}

export function parseExcelBuffer(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

  if (jsonData.length === 0) {
    return { rows: [], columns: [] };
  }

  const rows = jsonData as Record<string, unknown>[];
  const columns = Object.keys(rows[0]);

  // Try to parse numeric values
  for (const row of rows) {
    for (const col of columns) {
      const val = row[col];
      if (val !== null && val !== undefined && val !== '') {
        const num = Number(val);
        if (!isNaN(num)) {
          row[col] = num;
        }
      }
    }
  }

  return { rows, columns };
}
