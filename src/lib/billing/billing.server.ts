/**
 * Server-only billing helpers. Kept out of `billing.functions.ts` so that
 * module stays a thin wrapper (server-function splitting deletes runtime
 * siblings from those files).
 */
import type Stripe from "stripe";

const ID_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Finds the Stripe Customer carrying this userId (searchable metadata),
 * falling back to email match, and creates one as a last resort.
 *
 * Personal customers only — an organization never shares this record.
 */
export async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !ID_RE.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}' AND metadata['subjectType']:'user'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({
      email: options.email,
      limit: 10,
    });
    // Never reuse an organization's customer for a person.
    const customer = existing.data.find(
      (c) => c.metadata?.["organizationId"] == null,
    );
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            userId: options.userId,
            subjectType: "user",
          },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: {
      subjectType: "user",
      ...(options.userId ? { userId: options.userId } : {}),
    },
  });
  return created.id;
}

/**
 * Resolves the Stripe Customer that belongs to an *organization*. Schools and
 * districts get their own customer record so an administrator's personal
 * subscription is never billed against, or refunded from, the school's.
 */
export async function resolveOrCreateOrgCustomer(
  stripe: Stripe,
  options: {
    organizationId: string;
    name: string;
    email?: string;
    collectionMethod?: "charge_automatically" | "send_invoice";
  },
): Promise<string> {
  if (!ID_RE.test(options.organizationId.replace(/-/g, ""))) {
    throw new Error("Invalid organizationId");
  }
  const found = await stripe.customers.search({
    query: `metadata['organizationId']:'${options.organizationId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  const created = await stripe.customers.create({
    name: options.name,
    ...(options.email ? { email: options.email } : {}),
    metadata: {
      subjectType: "organization",
      organizationId: options.organizationId,
    },
  });
  return created.id;
}

/** Rows a CSV bulk invite produced, after validation. */
export interface ParsedInviteRow {
  email: string;
  role: string;
  licenseType: "pathway" | "staff" | "admin";
  studentName?: string;
  lineNumber: number;
}

export interface CsvParseResult {
  rows: ParsedInviteRow[];
  errors: { lineNumber: number; message: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLE_TO_LICENSE: Record<string, "pathway" | "staff" | "admin"> = {
  student: "pathway",
  parent: "pathway",
  guardian: "pathway",
  educator: "staff",
  teacher: "staff",
  case_manager: "staff",
  counselor: "staff",
  school_admin: "admin",
  district_admin: "admin",
};

/**
 * Parses a bulk-invite CSV with header `email,role,student_name`.
 * Every row is validated; bad rows are reported rather than silently skipped,
 * and duplicates within the file collapse to one invitation.
 */
export function parseInviteCsv(text: string, maxRows = 500): CsvParseResult {
  const rows: ParsedInviteRow[] = [];
  const errors: { lineNumber: number; message: string }[] = [];
  const seen = new Set<string>();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows, errors: [{ lineNumber: 0, message: "The file is empty." }] };
  }

  let start = 0;
  const header = lines[0]?.toLowerCase() ?? "";
  if (header.startsWith("email")) start = 1;

  for (let i = start; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    if (rows.length >= maxRows) {
      errors.push({
        lineNumber,
        message: `Stopped at ${maxRows} rows. Split the file and upload again.`,
      });
      break;
    }
    const parts = (lines[i] ?? "").split(",").map((p) => p.trim());
    const email = (parts[0] ?? "").toLowerCase();
    const role = (parts[1] ?? "").toLowerCase().replace(/[\s-]+/g, "_");
    const studentName = parts[2] ?? "";

    if (!EMAIL_RE.test(email)) {
      errors.push({ lineNumber, message: `"${parts[0] ?? ""}" is not a valid email address.` });
      continue;
    }
    const licenseType = ROLE_TO_LICENSE[role];
    if (!licenseType) {
      errors.push({
        lineNumber,
        message: `"${parts[1] ?? ""}" is not a role we can invite. Use student, parent, educator, case_manager, counselor, school_admin, or district_admin.`,
      });
      continue;
    }
    if (seen.has(email)) {
      errors.push({ lineNumber, message: `${email} appears more than once; only the first row was kept.` });
      continue;
    }
    seen.add(email);
    rows.push({
      email,
      role,
      licenseType,
      ...(studentName ? { studentName } : {}),
      lineNumber,
    });
  }

  return { rows, errors };
}
