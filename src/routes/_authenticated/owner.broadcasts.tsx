import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Megaphone, Download, Trash2, Eye, EyeOff, Users, BarChart3, CalendarIcon } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  APP_ROLES,
  createAnnouncement,
  deleteAnnouncement,
  exportRecipientsByRole,
  getAnnouncementEngagement,
  listAnnouncements,
  togglePublishAnnouncement,
  type Announcement,
  type AnnouncementEngagement,
  type RecipientRow,
} from "@/lib/broadcasts.functions";
import { loadXlsx } from "@/lib/browser-only-libs";

export const Route = createFileRoute("/_authenticated/owner/broadcasts")({
  head: () => ({ meta: [{ title: "Broadcasts — Admin Hub" }] }),
  component: BroadcastsPage,
});

const ROLE_OPTIONS = ["all", ...APP_ROLES] as const;

function csvEscape(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: RecipientRow[]) {
  const header = ["email", "full_name", "first_name", "last_name", "roles", "user_id"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.full_name),
        csvEscape(r.first_name),
        csvEscape(r.last_name),
        csvEscape(r.roles.join("|")),
        csvEscape(r.user_id),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadEngagementCsv(filename: string, daily: Array<{ date: string; views: number; clicks: number }>) {
  const header = ["date", "views", "clicks"];
  const lines = [header.join(",")];
  for (const d of daily) {
    lines.push([csvEscape(d.date), d.views, d.clicks].join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadEngagementXlsx(
  filename: string,
  daily: Array<{ date: string; views: number; clicks: number }>,
  meta: { announcementId: string; range: string; from?: string; to?: string; role: string },
) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  const dailyRows: (string | number)[][] = [
    ["Date", "Views", "Clicks"],
    ...daily.map((d) => [d.date, d.views, d.clicks]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(dailyRows);
  ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "Daily");

  const metaRows: (string | number)[][] = [
    ["Announcement ID", meta.announcementId],
    ["Range", meta.range],
    ["From", meta.from ?? ""],
    ["To", meta.to ?? ""],
    ["Role", meta.role],
    ["Exported at", new Date().toISOString()],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
  wsMeta["!cols"] = [{ wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "Filters");

  XLSX.writeFile(wb, filename);
}

function BroadcastsPage() {
  const create = useServerFn(createAnnouncement);
  const list = useServerFn(listAnnouncements);
  const del = useServerFn(deleteAnnouncement);
  const toggle = useServerFn(togglePublishAnnouncement);
  const exportFn = useServerFn(exportRecipientsByRole);
  const engagementFn = useServerFn(getAnnouncementEngagement);

  const [openEngagement, setOpenEngagement] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Record<string, AnnouncementEngagement | "loading">>({});
  const [engRange, setEngRange] = useState<"7d" | "30d" | "90d" | "custom">("7d");
  const [engFrom, setEngFrom] = useState<string>("");
  const [engTo, setEngTo] = useState<string>("");
  const [engRole, setEngRole] = useState<string>("all");

  const loadEngagement = async (id: string, opts?: { range?: typeof engRange; from?: string; to?: string; role?: string }) => {
    const range = opts?.range ?? engRange;
    const from = opts?.from ?? engFrom;
    const to = opts?.to ?? engTo;
    const role = opts?.role ?? engRole;
    if (openEngagement === id && !opts) {
      setOpenEngagement(null);
      return;
    }
    setOpenEngagement(id);
    setEngagement((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const res = await engagementFn({ data: { id, range, from: from || undefined, to: to || undefined, role } });
      setEngagement((prev) => ({ ...prev, [id]: res }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load engagement.");
      setOpenEngagement(null);
    }
  };


  const [items, setItems] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [severity, setSeverity] = useState<"info" | "success" | "warning" | "critical">("info");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [exportRoles, setExportRoles] = useState<string[]>(["parent", "guardian"]);
  const [exporting, setExporting] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const refresh = () => {
    setItems(null);
    list()
      .then((r) => setItems(r.announcements))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRole = (role: string, set: string[], setSet: (v: string[]) => void) => {
    if (set.includes(role)) setSet(set.filter((r) => r !== role));
    else setSet([...set, role]);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      toast.error("Pick at least one target audience.");
      return;
    }
    setSaving(true);
    try {
      const expires_at =
        expiresInDays && Number(expiresInDays) > 0
          ? new Date(Date.now() + Number(expiresInDays) * 86_400_000).toISOString()
          : null;
      await create({
        data: {
          title: title.trim(),
          body: body.trim(),
          link_url: linkUrl.trim() || undefined,
          link_label: linkLabel.trim() || undefined,
          target_roles: selectedRoles,
          severity,
          published: true,
          expires_at,
        },
      });
      toast.success("Announcement posted.");
      setTitle("");
      setBody("");
      setLinkUrl("");
      setLinkLabel("");
      setExpiresInDays("");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create announcement.");
    } finally {
      setSaving(false);
    }
  };

  const onExport = async (downloadAfter: boolean) => {
    if (exportRoles.length === 0) {
      toast.error("Pick at least one role to export.");
      return;
    }
    setExporting(true);
    try {
      const res = await exportFn({ data: { roles: exportRoles } });
      setPreviewCount(res.recipients.length);
      if (downloadAfter) {
        if (res.recipients.length === 0) {
          toast.message("No recipients match those roles.");
        } else {
          downloadCsv(`recipients-${exportRoles.join("-")}.csv`, res.recipients);
          toast.success(`Exported ${res.recipients.length} recipients.`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const sevBadge = useMemo(
    () => ({
      info: "bg-sky-100 text-sky-800",
      success: "bg-emerald-100 text-emerald-800",
      warning: "bg-amber-100 text-amber-800",
      critical: "bg-red-100 text-red-800",
    }),
    [],
  );

  return (
    <OwnerShell
      title="Broadcasts"
      description="Post in-app announcements to selected roles, or export recipients by role for an external marketing tool."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create announcement */}
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">New in-app announcement</h2>
          </div>
          <form onSubmit={onCreate} className="space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={4}
                maxLength={5000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="linkLabel">CTA label (optional)</Label>
                <Input
                  id="linkLabel"
                  maxLength={100}
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Learn more"
                />
              </div>
              <div>
                <Label htmlFor="linkUrl">CTA URL (optional)</Label>
                <Input
                  id="linkUrl"
                  maxLength={1000}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expires">Expires in (days, blank = never)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Target audience</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((r) => {
                  const checked = selectedRoles.includes(r);
                  return (
                    <label
                      key={r}
                      className={
                        "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
                        (checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground/70 hover:bg-muted")
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRole(r, selectedRoles, setSelectedRoles)}
                      />
                      {r}
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Use "all" to show to every signed-in user.
              </p>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Post announcement
            </Button>
          </form>
        </section>

        {/* Export by role */}
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Export recipients by role</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            For mass email campaigns (newsletters, announcements), download a CSV of users matching
            the roles below and import into your marketing tool (Mailchimp, Resend Broadcasts,
            Brevo, etc.). The platform sender is reserved for transactional email only.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {APP_ROLES.map((r) => {
              const checked = exportRoles.includes(r);
              return (
                <label
                  key={r}
                  className={
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
                    (checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/70 hover:bg-muted")
                  }
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleRole(r, exportRoles, setExportRoles)}
                  />
                  {r}
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport(false)} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Count recipients
            </Button>
            <Button size="sm" onClick={() => onExport(true)} disabled={exporting}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Download CSV
            </Button>
            {previewCount !== null && (
              <span className="text-xs text-muted-foreground">
                {previewCount} recipient{previewCount === 1 ? "" : "s"} match.
              </span>
            )}
          </div>
        </section>
      </div>

      {/* Existing announcements */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Recent announcements</h2>
        {items === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No announcements yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => {
              const eng = engagement[a.id];
              const isOpen = openEngagement === a.id;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={sevBadge[a.severity]}>{a.severity}</Badge>
                        {!a.published && <Badge variant="secondary">unpublished</Badge>}
                        {a.expires_at && new Date(a.expires_at) < new Date() && (
                          <Badge variant="secondary">expired</Badge>
                        )}
                        <span className="text-sm font-medium">{a.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {a.target_roles.map((r) => (
                          <span
                            key={r}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            {r}
                          </span>
                        ))}
                        <span className="text-[10px] text-muted-foreground">
                          · {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        title="View engagement"
                        onClick={() => loadEngagement(a.id)}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await toggle({ data: { id: a.id, published: !a.published } });
                          refresh();
                        }}
                      >
                        {a.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm("Delete this announcement?")) return;
                          await del({ data: { id: a.id } });
                          refresh();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Range</span>
                        </div>
                        <div className="flex gap-1">
                          {(["7d", "30d", "90d", "custom"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setEngRange(r);
                                loadEngagement(a.id, { range: r, from: engFrom, to: engTo, role: engRole });
                              }}
                              className={
                                "rounded px-2 py-1 text-[11px] font-medium " +
                                (engRange === r
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background border border-border text-muted-foreground hover:text-foreground")
                              }
                            >
                              {r === "custom" ? "Custom" : r}
                            </button>
                          ))}
                        </div>
                        {engRange === "custom" && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              className="h-7 w-36 text-xs"
                              value={engFrom}
                              onChange={(e) => {
                                setEngFrom(e.target.value);
                                if (engTo) loadEngagement(a.id, { range: "custom", from: e.target.value, to: engTo, role: engRole });
                              }}
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                              type="date"
                              className="h-7 w-36 text-xs"
                              value={engTo}
                              onChange={(e) => {
                                setEngTo(e.target.value);
                                if (engFrom) loadEngagement(a.id, { range: "custom", from: engFrom, to: e.target.value, role: engRole });
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Role</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ROLE_OPTIONS.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setEngRole(r);
                                loadEngagement(a.id, { range: engRange, from: engFrom, to: engTo, role: r });
                              }}
                              className={
                                "rounded px-2 py-1 text-[11px] font-medium " +
                                (engRole === r
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background border border-border text-muted-foreground hover:text-foreground")
                              }
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {eng === "loading" || !eng ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading engagement…
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label="Views" value={eng.views} />
                            <Stat label="Unique viewers" value={eng.unique_viewers} />
                            <Stat label="Clicks" value={eng.clicks} />
                            <Stat label="Unique clickers" value={eng.unique_clickers} />
                          </div>

                          {eng.daily.length > 0 && (
                            <div>
                              <div className="mb-1 flex items-center justify-between">
                                <div className="text-xs font-semibold text-muted-foreground">
                                  Daily trend
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadEngagementCsv(
                                        `engagement-${a.id.slice(0, 8)}-${engRange}.csv`,
                                        eng.daily,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                  >
                                    <Download className="h-3 w-3" />
                                    Export CSV
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadEngagementXlsx(
                                        `engagement-${a.id.slice(0, 8)}-${engRange}.xlsx`,
                                        eng.daily,
                                        {
                                          announcementId: a.id,
                                          range: engRange,
                                          from: engRange === "custom" ? engFrom : undefined,
                                          to: engRange === "custom" ? engTo : undefined,
                                          role: engRole,
                                        },
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                  >
                                    <Download className="h-3 w-3" />
                                    Export XLSX
                                  </button>
                                </div>
                              </div>
                              <DailyChart data={eng.daily} />
                            </div>
                          )}

                          <div>
                            <div className="mb-1 text-xs font-semibold text-muted-foreground">
                              By role
                            </div>
                            {eng.by_role.length === 0 ? (
                              <div className="text-xs text-muted-foreground">No activity yet.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="text-muted-foreground">
                                    <tr className="text-left">
                                      <th className="py-1 pr-3 font-medium">Role</th>
                                      <th className="py-1 pr-3 font-medium">Views</th>
                                      <th className="py-1 pr-3 font-medium">Clicks</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {eng.by_role.map((r) => (
                                      <tr key={r.role} className="border-t border-border/60">
                                        <td className="py-1 pr-3">{r.role}</td>
                                        <td className="py-1 pr-3">{r.views}</td>
                                        <td className="py-1 pr-3">{r.clicks}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="mb-1 text-xs font-semibold text-muted-foreground">
                              Recent activity
                            </div>
                            {eng.recent.length === 0 ? (
                              <div className="text-xs text-muted-foreground">No events yet.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="text-muted-foreground">
                                    <tr className="text-left">
                                      <th className="py-1 pr-3 font-medium">When</th>
                                      <th className="py-1 pr-3 font-medium">User</th>
                                      <th className="py-1 pr-3 font-medium">Role</th>
                                      <th className="py-1 pr-3 font-medium">Event</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {eng.recent.map((r, i) => (
                                      <tr key={i} className="border-t border-border/60">
                                        <td className="py-1 pr-3 whitespace-nowrap">
                                          {new Date(r.created_at).toLocaleString()}
                                        </td>
                                        <td className="py-1 pr-3">
                                          {r.full_name || r.email || r.user_id.slice(0, 8)}
                                        </td>
                                        <td className="py-1 pr-3">{r.role ?? "—"}</td>
                                        <td className="py-1 pr-3">
                                          <Badge
                                            variant="secondary"
                                            className={
                                              r.event_type === "click"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-sky-100 text-sky-800"
                                            }
                                          >
                                            {r.event_type}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </OwnerShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function DailyChart({ data }: { data: Array<{ date: string; views: number; clicks: number }> }) {
  const pad = 24;
  const barGap = 2;
  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.views, d.clicks)));
  const h = 128;
  const totalBarWidth = Math.max(4, (300 - pad * 2) / data.length - barGap);
  const barW = Math.max(2, totalBarWidth / 2);
  const innerW = data.length * (barW * 2 + barGap) + barGap;
  const w = innerW + pad * 2;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h + pad + 16} className="block">
        <g transform={`translate(${pad}, ${pad})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = h - t * h;
            return (
              <line key={t} x1={0} x2={innerW} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.1} />
            );
          })}
          {data.map((d, i) => {
            const x = i * (barW * 2 + barGap) + barGap;
            const vh = (d.views / maxVal) * h;
            const ch = (d.clicks / maxVal) * h;
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={h - vh}
                  width={barW}
                  height={vh}
                  rx={2}
                  className="fill-sky-400"
                />
                <rect
                  x={x + barW}
                  y={h - ch}
                  width={barW}
                  height={ch}
                  rx={2}
                  className="fill-emerald-400"
                />
              </g>
            );
          })}
        </g>
        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = pad + i * (barW * 2 + barGap) + barGap + barW;
          const label = new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <text
              key={d.date + "-label"}
              x={x}
              y={h + pad + 12}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 9 }}
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-sky-400" />
          Views
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
          Clicks
        </span>
      </div>
    </div>
  );
}
