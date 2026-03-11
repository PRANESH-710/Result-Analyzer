export interface SubjectStats {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  passRate: number;
  failRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  topper: { name: string; score: number };
}

export interface TopStudent {
  name: string;
  average: number;
  totalSubjects: number;
}

export interface Anomaly {
  type: string;
  subject?: string;
  description: string;
  count?: number;
  passRate?: number;
}

export interface AnalysisResult {
  totalStudents: number;
  totalSubjects: number;
  subjectWiseStats: Record<string, SubjectStats>;
  departmentPassRate: number;
  overallTopStudent: TopStudent | null;
  topStudents: TopStudent[];
  studentsPassedAll: number;
  studentsFailedAny: number;
  averageScore: number;
  anomalies: Anomaly[];
  passPercentage: number;
  subjects: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const IDENTIFIER_PATTERNS = new Set([
  'student_id', 'studentid', 'student id',
  'student_name', 'studentname', 'student name',
  'reg_no', 'regno', 'reg no', 'registration_no', 'registrationno',
  'roll_no', 'rollno', 'roll no', 'roll_number', 'rollnumber',
  'total', 'grand_total', 'grandtotal', 'sum',
  'average', 'avg', 'mean',
  'percentage', 'percent', '%'
]);

function normalizeCol(col: string): string {
  return col.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
}

export function isIdentifierCol(col: string): boolean {
  return IDENTIFIER_PATTERNS.has(normalizeCol(col));
}

export function getSubjectCols(columns: string[]): string[] {
  return columns.filter(c => !isIdentifierCol(c));
}

export function validateData(rows: Record<string, unknown>[], columns: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('The uploaded file is empty or contains no data.');
    return { isValid: false, errors, warnings };
  }

  const subjectCols = getSubjectCols(columns);

  if (subjectCols.length === 0) {
    errors.push('No subject columns found. Please ensure your file contains at least one subject with numeric scores.');
    return { isValid: false, errors, warnings };
  }

  if (rows.length < 5) {
    warnings.push('Dataset contains fewer than 5 students. Analysis may not be statistically meaningful.');
  }

  for (const subject of subjectCols) {
    const vals = rows.map(r => r[subject]).filter(v => v !== null && v !== undefined && v !== '');
    if (vals.length === 0) {
      warnings.push(`Subject '${subject}' has no valid scores.`);
      continue;
    }
    const nums = vals.map(v => Number(v));
    const invalid = nums.filter(n => isNaN(n));
    if (invalid.length > 0) {
      errors.push(`Subject '${subject}' contains ${invalid.length} non-numeric values.`);
      continue;
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min < 0) errors.push(`Subject '${subject}' contains scores below 0.`);
    if (max > 100) errors.push(`Subject '${subject}' contains scores above 100.`);
    const missing = rows.filter(r => r[subject] === null || r[subject] === undefined || r[subject] === '').length;
    const missingPct = (missing / rows.length) * 100;
    if (missingPct > 50) warnings.push(`Subject '${subject}' has ${missingPct.toFixed(1)}% missing values.`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function analyzeResults(
  rows: Record<string, unknown>[],
  columns: string[],
  passPercentage: number
): AnalysisResult {
  const subjectCols = getSubjectCols(columns);

  // Ensure Student_Name col
  const hasStudentName = columns.some(c => normalizeCol(c) === 'student_name');
  const hasStudentId = columns.some(c => normalizeCol(c) === 'student_id');
  const nameCol = hasStudentName
    ? columns.find(c => normalizeCol(c) === 'student_name')!
    : hasStudentId
    ? columns.find(c => normalizeCol(c) === 'student_id')!
    : null;

  function getName(row: Record<string, unknown>, idx: number): string {
    if (nameCol) return String(row[nameCol] ?? `Student_${idx + 1}`);
    return `Student_${idx + 1}`;
  }

  const subjectStats: Record<string, SubjectStats> = {};
  for (const subject of subjectCols) {
    const vals: { score: number; name: string }[] = [];
    rows.forEach((row, i) => {
      const v = row[subject];
      if (v !== null && v !== undefined && v !== '') {
        const n = Number(v);
        if (!isNaN(n)) {
          vals.push({ score: n, name: getName(row, i) });
        }
      }
    });

    if (vals.length === 0) continue;

    const scores = vals.map(v => v.score);
    const passed = vals.filter(v => v.score >= passPercentage);
    const failed = vals.filter(v => v.score < passPercentage);
    const topper = vals.reduce((a, b) => (a.score >= b.score ? a : b));

    subjectStats[subject] = {
      passedCount: passed.length,
      failedCount: failed.length,
      totalCount: vals.length,
      passRate: (passed.length / vals.length) * 100,
      failRate: (failed.length / vals.length) * 100,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      topper: { name: topper.name, score: topper.score },
    };
  }

  const totalStudents = rows.length;
  const totalSubjects = subjectCols.length;

  let studentsPassedAll = 0;
  const studentAverages: TopStudent[] = [];

  rows.forEach((row, i) => {
    let passedAll = true;
    const scores: number[] = [];
    for (const subject of subjectCols) {
      const v = row[subject];
      if (v === null || v === undefined || v === '') {
        passedAll = false;
        continue;
      }
      const n = Number(v);
      if (isNaN(n) || n < passPercentage) {
        passedAll = false;
      }
      if (!isNaN(n)) scores.push(n);
    }
    if (passedAll && scores.length === subjectCols.length) studentsPassedAll++;
    if (scores.length > 0) {
      studentAverages.push({
        name: getName(row, i),
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        totalSubjects: scores.length,
      });
    }
  });

  studentAverages.sort((a, b) => b.average - a.average);

  const allScores: number[] = [];
  for (const subject of subjectCols) {
    rows.forEach(row => {
      const v = row[subject];
      if (v !== null && v !== undefined && v !== '') {
        const n = Number(v);
        if (!isNaN(n)) allScores.push(n);
      }
    });
  }

  const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const departmentPassRate = totalStudents > 0 ? (studentsPassedAll / totalStudents) * 100 : 0;

  const anomalies: Anomaly[] = [];
  for (const subject of subjectCols) {
    const vals = rows.map(r => r[subject]).filter(v => v !== null && v !== undefined && v !== '').map(Number).filter(n => !isNaN(n));
    if (vals.length === 0) {
      anomalies.push({ type: 'empty_subject', subject, description: `No valid scores found for ${subject}` });
      continue;
    }
    const zeros = vals.filter(v => v === 0).length;
    if (zeros > 0) {
      anomalies.push({ type: 'zero_scores', subject, count: zeros, description: `${zeros} students have zero scores in ${subject}` });
    }
    const perfect = vals.filter(v => v === 100).length;
    if (perfect > vals.length * 0.3) {
      anomalies.push({ type: 'excessive_perfect_scores', subject, count: perfect, description: `Unusually high number of perfect scores in ${subject} (${perfect} students)` });
    }
    const pr = vals.filter(v => v >= passPercentage).length / vals.length * 100;
    if (pr < 20) {
      anomalies.push({ type: 'low_pass_rate', subject, passRate: pr, description: `Very low pass rate in ${subject} (${pr.toFixed(1)}%)` });
    }
  }

  return {
    totalStudents,
    totalSubjects,
    subjectWiseStats: subjectStats,
    departmentPassRate,
    overallTopStudent: studentAverages[0] || null,
    topStudents: studentAverages.slice(0, 10),
    studentsPassedAll,
    studentsFailedAny: totalStudents - studentsPassedAll,
    averageScore,
    anomalies,
    passPercentage,
    subjects: subjectCols,
  };
}
