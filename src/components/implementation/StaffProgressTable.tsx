import { membershipStatusLabel, type MembershipAccessStatus } from "@/lib/membership-status";
export { membershipAccessStatus } from "@/lib/membership-status";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type StaffProgressRow = {
  key: string;
  name: string;
  role: string;
  status: MembershipAccessStatus;
  joined?: string | null;
  progress?: number; // 0-100 optional
  detail?: string;
};

function statusBadge(status: StaffProgressRow["status"]) {
  const label = membershipStatusLabel(status);
  if (status === "active")
    return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">{label}</Badge>;
  if (status === "pending" || status === "invited")
    return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function StaffProgressTable({
  title = "Staff Progress",
  subtitle,
  rows,
  emptyLabel = "No staff yet.",
}: {
  title?: string;
  subtitle?: string;
  rows: StaffProgressRow[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-soft">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-medium">{title}</h2>
          <Badge variant="secondary" className="ml-auto">
            {rows.length}
          </Badge>
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Added</th>
                <th className="px-5 py-2 font-medium">Training Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-5 py-3">
                    <div className="font-medium">{r.name}</div>
                    {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                  </td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">
                    {r.role.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-3">{statusBadge(r.status)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {r.joined && !Number.isNaN(Date.parse(r.joined))
                      ? new Date(r.joined).toLocaleDateString()
                      : "Not recorded"}
                  </td>
                  <td className="px-5 py-3">
                    {r.progress != null &&
                    Number.isFinite(r.progress) &&
                    r.progress >= 0 &&
                    r.progress <= 100 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-[width]"
                            style={{ width: `${r.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{r.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
