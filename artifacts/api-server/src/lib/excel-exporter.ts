import * as XLSX from 'xlsx';
import type { AnalysisResult } from './analysis.js';

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
  sheet['!cols'] = widths.map((width) => ({ wch: width }));
}

export function generateExcelExport(
  analysis: AnalysisResult,
  rawData: Record<string, unknown>[],
  subjectColumns: string[]
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Academic Performance Analysis Summary', ''],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['Metric', 'Value'],
    ['Total Students', analysis.totalStudents],
    ['Total Subjects', analysis.totalSubjects],
    ['Department Pass Rate', `${analysis.departmentPassRate.toFixed(2)}%`],
    ['Average Score', `${analysis.averageScore.toFixed(2)}%`],
    ['Students Passed All', analysis.studentsPassedAll],
    ['Students Failed Any', analysis.studentsFailedAny],
    ['Pass Criteria', `${analysis.passPercentage}%`],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  setColumnWidths(summarySheet, [34, 22]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // Subject Analysis Sheet
  const subjectHeaders = ['Subject', 'Pass Threshold', 'Total Students', 'Passed', 'Failed', 'Pass Rate', 'Fail Rate', 'Average Score', 'Highest', 'Lowest', 'Topper'];
  const subjectRows = Object.entries(analysis.subjectWiseStats).map(([subject, stats]) => [
    subject,
    `${stats.passPercentageUsed.toFixed(2)}%`,
    stats.totalCount,
    stats.passedCount,
    stats.failedCount,
    `${stats.passRate.toFixed(2)}%`,
    `${stats.failRate.toFixed(2)}%`,
    stats.averageScore.toFixed(2),
    stats.highestScore.toFixed(2),
    stats.lowestScore.toFixed(2),
    stats.topper.name,
  ]);
  const subjectSheet = XLSX.utils.aoa_to_sheet([subjectHeaders, ...subjectRows]);
  setColumnWidths(subjectSheet, [22, 16, 14, 10, 10, 11, 11, 14, 10, 10, 26]);
  XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subject Performance');

  // Top Students Sheet
  const topHeaders = ['Rank', 'Student', 'Average Score', 'Subjects Considered'];
  const topRows = analysis.topStudents.map((s, i) => [i + 1, s.name, `${s.average.toFixed(2)}%`, s.totalSubjects]);
  const topSheet = XLSX.utils.aoa_to_sheet([topHeaders, ...topRows]);
  setColumnWidths(topSheet, [8, 28, 16, 20]);
  XLSX.utils.book_append_sheet(workbook, topSheet, 'Top Performers');

  // Raw Data Sheet
  if (rawData.length > 0) {
    const rawSheet = XLSX.utils.json_to_sheet(rawData);
    const rawHeaders = Object.keys(rawData[0] ?? {});
    const rawColWidths = rawHeaders.map((header) => Math.min(Math.max(header.length + 2, 12), 28));
    setColumnWidths(rawSheet, rawColWidths);
    XLSX.utils.book_append_sheet(workbook, rawSheet, 'Raw Data');
  } else {
    const emptyRawSheet = XLSX.utils.aoa_to_sheet([['No raw data available']]);
    setColumnWidths(emptyRawSheet, [28]);
    XLSX.utils.book_append_sheet(workbook, emptyRawSheet, 'Raw Data');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
