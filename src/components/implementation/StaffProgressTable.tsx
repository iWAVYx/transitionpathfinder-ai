import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type StaffProgressRow = {
  key: string;
  name: string;
  role: string;
  status: "active" | "pending" | "inactive";
  joined?: string | null;
  progress?: number; // 0-100 optional
  detail?: string;
};

function statusBadge(s: StaffProgressRow["status"]) {
  if (s === "active") return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Active</Badge>;
  if (s === "pending") return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Pending</Badge>;
  return <Badge variant="secondary">Inactive</Badge>;
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
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-5 py-2 font-medium">Onboarding</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-5 py-3">
                    <div className="font-medium">{r.name}</div>
                    {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                  </td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">{r.role.replace(/_/g, " ")}</td>
                  <td className="px-3 py-3">{statusBadge(r.status)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {r.joined ? new Date(r.joined).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-[width]"
                          style={{ width: `${Math.max(r.progress ?? 0, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{r.progress ?? 0}%</span>
                    </div>
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
