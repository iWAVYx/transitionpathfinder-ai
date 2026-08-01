import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, GraduationCap, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exportWindowDaysLeft,
  getOrgCoverage,
  labelForCoverageState,
  type CoverageStudentRow,
} from "@/lib/billing/coverage.functions";
import {
  setStudentCoverageState,
  type CoverageState,
} from "@/lib/billing/licensing.functions";

const STATES: { value: CoverageState; label: string; note: string }[] = [
  {
    value: "graduated",
    label: "Graduated",
    note: "Releases the sponsored pathway license and opens an export window.",
  },
  {
    value: "transferred",
    label: "Transferred",
    note: "Re-points the student at the receiving school; records stay intact.",
  },
  {
    value: "archived",
    label: "Archived",
    note: "Releases the license and opens an export window.",
  },
  {
    value: "active",
    label: "Reactivate",
    note: "Returns the student to active coverage.",
  },
];

function fullName(row: CoverageStudentRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ");
}

/**
 * Coverage continuity for one organization: which sponsored students are
 * active, graduated, transferred, or archived, and the controls to move a
 * student between those states. Every change requires a written reason and
 * lands in the immutable entitlement audit trail.
 */
export function CoveragePanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const fetchCoverage = useServerFn(getOrgCoverage);
  const changeState = useServerFn(setStudentCoverageState);

  const [target, setTarget] = useState<CoverageStudentRow | null>(null);
  const [nextState, setNextState] = useState<CoverageState>("graduated");
  const [reason, setReason] = useState("");
  const [toOrg, setToOrg] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["org-coverage", orgId],
    queryFn: () => fetchCoverage({ data: { organizationId: orgId } }),
  });

  const students = data?.students ?? [];
  const targets = data?.transferTargets ?? [];

  const activeCount = useMemo(
    () => students.filter((s) => s.coverage_state === "active").length,
    [students],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const result = await changeState({
        data: {
          studentId: target.id,
          state: nextState,
          reason: reason.trim(),
          ...(nextState === "transferred" ? { toOrganizationId: toOrg } : {}),
        },
      });
      if (result && "error" in result) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      const released = result?.releasedAllocations ?? 0;
      toast.success(
        released > 0
          ? `Coverage updated — ${released} license${released === 1 ? "" : "s"} returned to your pool.`
          : "Coverage updated.",
      );
      setTarget(null);
      setReason("");
      setToOrg("");
      queryClient.invalidateQueries({ queryKey: ["org-coverage", orgId] });
      queryClient.invalidateQueries({ queryKey: ["license-overview", orgId] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit", orgId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reasonTooShort = reason.trim().length < 10;
  const missingTarget = nextState === "transferred" && !toOrg;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" /> Student Coverage Continuity
          </CardTitle>
          <CardDescription>
            Graduating or archiving a student returns their sponsored pathway
            license to your pool and opens a time-boxed export window for the
            family. Transfers move coverage without disturbing records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No students are attached to this organization yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <Users className="mr-1.5 h-3 w-3" /> {activeCount} active
                </Badge>
                {(data?.byState ?? [])
                  .filter((row) => row.state !== "active")
                  .map((row) => (
                    <Badge key={row.state} variant="outline">
                      {labelForCoverageState(row.state)} · {row.count}
                    </Badge>
                  ))}
              </div>

              <ul className="divide-y rounded-lg border">
                {students.map((row) => {
                  const daysLeft = exportWindowDaysLeft(
                    row.export_window_ends_at,
                  );
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {fullName(row)}
                          </span>
                          <Badge
                            variant={
                              row.coverage_state === "active"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[11px]"
                          >
                            {labelForCoverageState(row.coverage_state)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[row.school, row.grade_band]
                            .filter(Boolean)
                            .join(" · ") || "No school on file"}
                        </p>
                        {daysLeft !== null && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Export window closes in {daysLeft} day
                            {daysLeft === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="sm:ml-auto"
                        onClick={() => {
                          setTarget(row);
                          setNextState(
                            row.coverage_state === "active"
                              ? "graduated"
                              : "active",
                          );
                          setReason("");
                          setToOrg("");
                        }}
                      >
                        Change Coverage
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Change Coverage{target ? ` — ${fullName(target)}` : ""}
            </DialogTitle>
            <DialogDescription>
              Manual coverage changes are recorded permanently, so a written
              reason is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New Coverage State</Label>
              <Select
                value={nextState}
                onValueChange={(v) => setNextState(v as CoverageState)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {STATES.find((s) => s.value === nextState)?.note}
              </p>
            </div>

            {nextState === "transferred" && (
              <div className="space-y-1.5">
                <Label>Receiving School Or District</Label>
                <Select value={toOrg} onValueChange={setToOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this student's coverage changing? (at least 10 characters)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTarget(null)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending || reasonTooShort || missingTarget}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
