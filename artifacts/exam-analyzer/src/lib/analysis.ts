import type {
  AnalysisResponse,
  AnalysisResult,
  Anomaly,
  SubjectStats,
  TopStudent,
} from "@workspace/api-client-react";

const IDENTIFIER_PATTERNS = new Set([
  "student_id",
  "studentid",
  "student id",
  "student_name",
  "studentname",
  "student name",
  "reg_no",
  "regno",
  "reg no",
  "registration_no",
  "registrationno",
  "roll_no",
  "rollno",
  "roll no",
  "roll_number",
  "rollnumber",
  "total",
  "grand_total",
  "grandtotal",
  "sum",
  "average",
  "avg",
  "mean",
  "percentage",
  "percent",
  "%",
]);

function normalizeCol(column: string): string {
  return column.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
}

function getSubjectColumns(columns: string[]): string[] {
  return columns.filter((column) => !IDENTIFIER_PATTERNS.has(normalizeCol(column)));
}

function normalizePassThreshold(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
    return fallback;
  }

  return parsed;
}

function normalizeSubjectPassPercentages(
  subjectColumns: string[],
  passPercentage: number,
  subjectPassPercentages?: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    subjectColumns.map((subject) => [
      subject,
      normalizePassThreshold(subjectPassPercentages?.[subject], passPercentage),
    ]),
  );
}

function analyzeResults(
  rows: Record<string, unknown>[],
  columns: string[],
  passPercentage: number,
  subjectPassPercentages?: Record<string, number>,
): AnalysisResult {
  const subjectColumns = getSubjectColumns(columns);
  const normalizedThresholds = normalizeSubjectPassPercentages(
    subjectColumns,
    passPercentage,
    subjectPassPercentages,
  );

  const studentNameColumn =
    columns.find((column) => normalizeCol(column) === "student_name") ??
    columns.find((column) => normalizeCol(column) === "student_id") ??
    null;

  const getName = (row: Record<string, unknown>, index: number): string => {
    if (studentNameColumn) {
      return String(row[studentNameColumn] ?? `Student_${index + 1}`);
    }

    return `Student_${index + 1}`;
  };

  const subjectWiseStats: Record<string, SubjectStats> = {};

  for (const subject of subjectColumns) {
    const threshold = normalizedThresholds[subject];
    const values: Array<{ score: number; name: string }> = [];

    rows.forEach((row, index) => {
      const value = row[subject];
      if (value === null || value === undefined || value === "") {
        return;
      }

      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        values.push({ score: numericValue, name: getName(row, index) });
      }
    });

    if (values.length === 0) {
      continue;
    }

    const scores = values.map((value) => value.score);
    const passed = values.filter((value) => value.score >= threshold);
    const failed = values.filter((value) => value.score < threshold);
    const topper = values.reduce((current, next) =>
      current.score >= next.score ? current : next,
    );

    subjectWiseStats[subject] = {
      passedCount: passed.length,
      failedCount: failed.length,
      totalCount: values.length,
      passPercentageUsed: threshold,
      passRate: (passed.length / values.length) * 100,
      failRate: (failed.length / values.length) * 100,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      topper: { name: topper.name, score: topper.score },
    };
  }

  const totalStudents = rows.length;
  const totalSubjects = subjectColumns.length;

  let studentsPassedAll = 0;
  const studentAverages: TopStudent[] = [];

  rows.forEach((row, index) => {
    let passedAll = true;
    const scores: number[] = [];

    for (const subject of subjectColumns) {
      const threshold = normalizedThresholds[subject];
      const value = row[subject];
      if (value === null || value === undefined || value === "") {
        passedAll = false;
        continue;
      }

      const numericValue = Number(value);
      if (Number.isNaN(numericValue) || numericValue < threshold) {
        passedAll = false;
      }
      if (!Number.isNaN(numericValue)) {
        scores.push(numericValue);
      }
    }

    if (passedAll && scores.length === subjectColumns.length) {
      studentsPassedAll += 1;
    }

    if (scores.length > 0) {
      studentAverages.push({
        name: getName(row, index),
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        totalSubjects: scores.length,
      });
    }
  });

  studentAverages.sort((left, right) => right.average - left.average);

  const allScores: number[] = [];
  for (const subject of subjectColumns) {
    rows.forEach((row) => {
      const value = row[subject];
      if (value === null || value === undefined || value === "") {
        return;
      }

      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        allScores.push(numericValue);
      }
    });
  }

  const anomalies: Anomaly[] = [];
  for (const subject of subjectColumns) {
    const threshold = normalizedThresholds[subject];
    const values = rows
      .map((row) => row[subject])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(Number)
      .filter((value) => !Number.isNaN(value));

    if (values.length === 0) {
      anomalies.push({
        type: "empty_subject",
        subject,
        description: `No valid scores found for ${subject}`,
      });
      continue;
    }

    const zeroScores = values.filter((value) => value === 0).length;
    if (zeroScores > 0) {
      anomalies.push({
        type: "zero_scores",
        subject,
        count: zeroScores,
        description: `${zeroScores} students have zero scores in ${subject}`,
      });
    }

    const perfectScores = values.filter((value) => value === 100).length;
    if (perfectScores > values.length * 0.3) {
      anomalies.push({
        type: "excessive_perfect_scores",
        subject,
        count: perfectScores,
        description: `Unusually high number of perfect scores in ${subject} (${perfectScores} students)`,
      });
    }

    const passRate = (values.filter((value) => value >= threshold).length / values.length) * 100;
    if (passRate < 20) {
      anomalies.push({
        type: "low_pass_rate",
        subject,
        passRate,
        description: `Very low pass rate in ${subject} (${passRate.toFixed(1)}%)`,
      });
    }
  }

  return {
    totalStudents,
    totalSubjects,
    subjectWiseStats,
    subjectPassPercentages: normalizedThresholds,
    departmentPassRate: totalStudents > 0 ? (studentsPassedAll / totalStudents) * 100 : 0,
    overallTopStudent: studentAverages[0],
    topStudents: studentAverages.slice(0, 10),
    studentsPassedAll,
    studentsFailedAny: totalStudents - studentsPassedAll,
    averageScore:
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0,
    anomalies,
    passPercentage,
    subjects: subjectColumns,
  };
}

export function reanalyzeAnalysisResponse(
  analysisData: AnalysisResponse,
  passPercentage: number,
  subjectPassPercentages?: Record<string, number>,
): AnalysisResponse {
  const rawData = (analysisData.rawData ?? []) as Record<string, unknown>[];
  const columns = analysisData.columns ?? [];

  if (!analysisData.validation.isValid || rawData.length === 0 || columns.length === 0) {
    return analysisData;
  }

  const analysis = analyzeResults(rawData, columns, passPercentage, subjectPassPercentages);

  return {
    ...analysisData,
    analysis,
    rawData,
    columns,
    subjectColumns: getSubjectColumns(columns),
  };
}