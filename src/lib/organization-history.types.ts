export type HistoryStudent = { id: string; first_name: string | null; last_name: string | null };
export type HistoryOrganization = { scope: "school" | "district"; id: string };
export type OrganizationHistoryRoster = { organization_id: string; students: HistoryStudent[] };
