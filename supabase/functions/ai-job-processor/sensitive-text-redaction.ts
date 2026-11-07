export type SensitiveDataCategory =
  | "address"
  | "date_of_birth"
  | "email"
  | "government_id"
  | "phone"
  | "school"
  | "student_id"
  | "student_name";

export type SensitiveTextContext = {
  studentFirstName?: string | null;
  studentLastName?: string | null;
  schoolName?: string | null;
  dateOfBirth?: string | null;
};

export type SensitiveTextRedactionReport = {
  total: number;
  counts: Partial<Record<SensitiveDataCategory, number>>;
};

export const PRIVACY_SAFE_FILE_NAME = "privacy-safe-document.txt";
export const PRIVACY_SAFE_MIME_TYPE = "text/plain";

type Candidate = {
  start: number;
  end: number;
  category: SensitiveDataCategory;
  replacement: string;
  priority: number;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addPatternMatches(
  candidates: Candidate[],
  input: string,
  pattern: RegExp,
  category: SensitiveDataCategory,
  replacement: string,
  priority = 10,
) {
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || !match[0]) continue;
    candidates.push({
      start: match.index,
      end: match.index + match[0].length,
      category,
      replacement,
      priority,
    });
  }
}

function addLiteralMatches(
  candidates: Candidate[],
  input: string,
  value: string | null | undefined,
  category: SensitiveDataCategory,
  replacement: string,
  priority = 20,
  minimumLength = 3,
) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < minimumLength) return;
  addPatternMatches(
    candidates,
    input,
    new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, trimmed.length < 3 ? "g" : "gi"),
    category,
    replacement,
    priority,
  );
}

function dateOfBirthVariants(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return [];

  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return [];

  const parsed = new Date(Date.UTC(Number(year), monthNumber - 1, dayNumber));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== monthNumber - 1 ||
    parsed.getUTCDate() !== dayNumber
  ) {
    return [];
  }

  const shortYear = year.slice(-2);
  const monthName = MONTH_NAMES[monthNumber - 1];
  const shortMonthName = monthName.slice(0, 3);
  const variants = new Set<string>([`${year}-${month}-${day}`]);
  for (const separator of ["/", "-", "."]) {
    for (const formattedMonth of [month, String(monthNumber)]) {
      for (const formattedDay of [day, String(dayNumber)]) {
        variants.add(`${formattedMonth}${separator}${formattedDay}${separator}${year}`);
        variants.add(`${formattedMonth}${separator}${formattedDay}${separator}${shortYear}`);
      }
    }
  }
  for (const name of new Set([monthName, shortMonthName, `${shortMonthName}.`])) {
    variants.add(`${name} ${dayNumber}, ${year}`);
    variants.add(`${name} ${dayNumber} ${year}`);
  }
  return [...variants];
}

function chooseNonOverlappingCandidates(candidates: Candidate[]) {
  const chosen: Candidate[] = [];
  const sorted = [...candidates].sort(
    (a, b) => a.start - b.start || b.priority - a.priority || b.end - b.start - (a.end - a.start),
  );

  for (const candidate of sorted) {
    if (chosen.some((item) => candidate.start < item.end && candidate.end > item.start)) continue;
    chosen.push(candidate);
  }

  return chosen.sort((a, b) => a.start - b.start);
}

export function redactSensitiveText(
  input: string,
  context: SensitiveTextContext = {},
): { text: string; report: SensitiveTextRedactionReport } {
  const candidates: Candidate[] = [];

  addPatternMatches(
    candidates,
    input,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "email",
    "[REDACTED: EMAIL]",
  );
  addPatternMatches(
    candidates,
    input,
    /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g,
    "phone",
    "[REDACTED: PHONE]",
  );
  addPatternMatches(
    candidates,
    input,
    /\b\d{3}-\d{2}-\d{4}\b/g,
    "government_id",
    "[REDACTED: GOVERNMENT ID]",
    30,
  );
  addPatternMatches(
    candidates,
    input,
    /\b(?:date\s+of\s+birth|birth\s*date|dob)\s*[:#-]?\s*(?:[01]?\d[-/.][0-3]?\d[-/.](?:\d{4}|\d{2})|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,)?\s+\d{4})/gi,
    "date_of_birth",
    "Date of birth: [REDACTED]",
    25,
  );
  addPatternMatches(
    candidates,
    input,
    /\b(?:student|state|school)\s*(?:id|identifier|number|no\.?)\s*[:#-]?\s*[A-Z0-9][A-Z0-9._-]{2,}\b/gi,
    "student_id",
    "Student ID: [REDACTED]",
    25,
  );
  addPatternMatches(
    candidates,
    input,
    /\b(?:medicaid|insurance|member)\s*(?:id|identifier|number|no\.?)\s*[:#-]?\s*[A-Z0-9][A-Z0-9._-]{2,}\b/gi,
    "government_id",
    "Benefit ID: [REDACTED]",
    25,
  );
  addPatternMatches(
    candidates,
    input,
    /\b(?:home\s+address|mailing\s+address|address)\s*[:#-]\s*[^\r\n]{4,120}/gi,
    "address",
    "Address: [REDACTED]",
    25,
  );
  addPatternMatches(
    candidates,
    input,
    /\b(?:student|child|parent|guardian|mother|father|caregiver)(?:[ \t]+(?:full[ \t]+)?name)?[ \t]*[:#-][ \t]*[a-z][a-z'’-]+(?:[ \t]+[a-z][a-z'’-]+){0,3}/gi,
    "student_name",
    "Person name: [REDACTED]",
    25,
  );

  const firstName = context.studentFirstName?.trim();
  const lastName = context.studentLastName?.trim();
  if (firstName && lastName) {
    addLiteralMatches(
      candidates,
      input,
      `${firstName} ${lastName}`,
      "student_name",
      `${firstName} [REDACTED: LAST NAME]`,
      35,
    );
  }
  addLiteralMatches(candidates, input, lastName, "student_name", "[REDACTED: LAST NAME]", 20, 2);
  addLiteralMatches(candidates, input, context.schoolName, "school", "[REDACTED: SCHOOL]", 20);
  for (const variant of dateOfBirthVariants(context.dateOfBirth)) {
    addLiteralMatches(candidates, input, variant, "date_of_birth", "[REDACTED: DATE OF BIRTH]", 30);
  }

  const chosen = chooseNonOverlappingCandidates(candidates);
  const counts: SensitiveTextRedactionReport["counts"] = {};
  let cursor = 0;
  let text = "";

  for (const candidate of chosen) {
    text += input.slice(cursor, candidate.start) + candidate.replacement;
    cursor = candidate.end;
    counts[candidate.category] = (counts[candidate.category] ?? 0) + 1;
  }
  text += input.slice(cursor);

  return { text, report: { total: chosen.length, counts } };
}

export function createPrivacySafeFileName() {
  return PRIVACY_SAFE_FILE_NAME;
}

export function createPrivacySafeTextFile(text: string) {
  return new File([text], createPrivacySafeFileName(), {
    type: PRIVACY_SAFE_MIME_TYPE,
    lastModified: Date.now(),
  });
}

export function assertPrivacySafeDerivedUpload(fileNameOrPath: string, mimeType: string | null) {
  const normalizedName = fileNameOrPath.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const hasSafeName =
    normalizedName === PRIVACY_SAFE_FILE_NAME ||
    normalizedName.endsWith(`-${PRIVACY_SAFE_FILE_NAME}`);
  if (!hasSafeName || mimeType?.toLowerCase().trim() !== PRIVACY_SAFE_MIME_TYPE) {
    throw new Error(
      "Only a reviewed TransitionForward privacy-safe text copy can continue through this protected upload.",
    );
  }
}
