const STUDENT_ID_PATTERNS = new Set([
  "student_id",
  "studentid",
  "student id",
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
]);

const STUDENT_NAME_PATTERNS = new Set([
  "student_name",
  "studentname",
  "student name",
  "name",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
}

function findValueByPatterns(
  row: Record<string, unknown>,
  patterns: Set<string>,
): string | undefined {
  for (const [key, value] of Object.entries(row)) {
    if (!patterns.has(normalizeKey(key))) {
      continue;
    }

    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    return String(value);
  }

  return undefined;
}

export function getStudentIdValue(row: Record<string, unknown>): string | undefined {
  return findValueByPatterns(row, STUDENT_ID_PATTERNS);
}

export function getStudentNameValue(
  row: Record<string, unknown>,
  fallback: string,
): string {
  return findValueByPatterns(row, STUDENT_NAME_PATTERNS) ?? fallback;
}