import * as XLSX from 'xlsx';
import type { AnalysisResult } from './analysis.js';

export function generateExcelExport(
  analysis: AnalysisResult,
  rawData: Record<string, unknown>[],
  subjectColumns: string[]
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Academic Performance Analysis Summary'],
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
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Subject Analysis Sheet
  const subjectHeaders = ['Subject', 'Total Students', 'Passed', 'Failed', 'Pass Rate', 'Fail Rate', 'Average Score', 'Highest', 'Lowest', 'Topper'];
  const subjectRows = Object.entries(analysis.subjectWiseStats).map(([subject, stats]) => [
    subject,
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
  XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subject Analysis');

  // Top Students Sheet
  const topHeaders = ['Rank', 'Student', 'Average Score', 'Subjects'];
  const topRows = analysis.topStudents.map((s, i) => [i + 1, s.name, `${s.average.toFixed(2)}%`, s.totalSubjects]);
  const topSheet = XLSX.utils.aoa_to_sheet([topHeaders, ...topRows]);
  XLSX.utils.book_append_sheet(workbook, topSheet, 'Top Students');

  // Raw Data Sheet
  if (rawData.length > 0) {
    const rawSheet = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(workbook, rawSheet, 'Raw Data');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
