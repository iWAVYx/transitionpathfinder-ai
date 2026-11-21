import { readReportBatches, readReportPages } from "./report-query-pages";
type Page<T> = { data: T[] | null; error: unknown; count: number | null };
export function organizationReadError() {
  return new Error("Workspace information could not be fully loaded. Please try again.");
}
function readError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Records changed")
    ? new Error("Workspace records changed while loading. Please try again.")
    : organizationReadError();
}
export async function readOrganizationPages<T>(
  fetch: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  try {
    return await readReportPages(fetch);
  } catch (error) {
    throw readError(error);
  }
}
export async function readOrganizationBatches<T>(
  ids: string[],
  fetch: (ids: string[], from: number, to: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  try {
    return await readReportBatches(ids, fetch);
  } catch (error) {
    throw readError(error);
  }
}
