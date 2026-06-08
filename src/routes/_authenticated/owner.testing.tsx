import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  listTestingScripts,
  upsertTestingStep,
  resetTestingScript,
  type ScriptWithRuns,
  type StepRun,
} from "@/lib/owner/testing-scripts.functions";

export const Route = createFileRoute("/_authenticated/owner/testing")({
  head: () => ({ meta: [{ title: "Testing Scripts — Admin Hub" }] }),
  component: OwnerTestingPage,
});

type Priority = "low" | "medium" | "high" | "critical";

type Draft = {
  passed: boolean | null;
  notes: string;
  issue_found: string;
  priority: Priority;
  assigned_follow_up: string;
};

function toDraft(run: StepRun | undefined): Draft {
  return {
    passed: run?.passed ?? null,
    notes: run?.notes ?? "",
    issue_found: run?.issue_found ?? "",
    priority: (run?.priority as Priority) ?? "medium",
    assigned_follow_up: run?.assigned_follow_up ?? "",
  };
}

function OwnerTestingPage() {
  const list = useServerFn(listTestingScripts);
  const upsert = useServerFn(upsertTestingStep);
  const reset = useServerFn(resetTestingScript);

  const [scripts, setScripts] = useState<ScriptWithRuns[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function refresh() {
    list().then((r) => {
      setScripts(r.scripts);
      const next: Record<string, Draft> = {};
      for (const s of r.scripts) {
        for (const step of s.steps) {
          next[`${s.key}:${step.key}`] = toDraft(s.runs[step.key]);
        }
      }
      setDrafts(next);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDraft(key: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function save(scriptKey: string, stepKey: string, passed: boolean) {
    const key = `${scriptKey}:${stepKey}`;
    const d = drafts[key];
    setSaving(key);
    try {
      await upsert({
        data: {
          script_key: scriptKey,
          step_key: stepKey,
          completed: true,
          passed,
          issue_found: d.issue_found || null,
          notes: d.notes || null,
          priority: d.priority,
          assigned_follow_up: d.assigned_follow_up || null,
        },
      });
      toast.success(passed ? "Marked as passing" : "Logged as failing");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function handleReset(scriptKey: string) {
    if (
      !confirm(
        "Reset all logged results for this script? This deletes pass/fail history for every step.",
      )
    )
      return;
    try {
      await reset({ data: { script_key: scriptKey } });
      toast.success("Script reset");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    }
  }

  return (
    <OwnerShell
      title="Testing Scripts"
      description="Repeatable end-to-end checks for each role. Log pass / fail and follow-ups inline; results persist."
    >
      {!scripts ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {scripts.map((script) => {
            const total = script.steps.length;
            const passed = script.steps.filter(
              (st) => script.runs[st.key]?.passed === true,
            ).length;
            const failed = script.steps.filter(
              (st) => script.runs[st.key]?.passed === false,
            ).length;
            const pct = Math.round((passed / total) * 100);

            return (
              <section
                key={script.key}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      <h2 className="font-display text-lg text-foreground">
                        {script.label}
                      </h2>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {script.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300">
                      {passed} pass
                    </Badge>
                    {failed > 0 && (
                      <Badge variant="outline" className="text-rose-700 dark:text-rose-300">
                        {failed} fail
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {total - passed - failed} pending
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReset(script.key)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                  </div>
                </header>

                <Progress value={pct} className="mb-4 h-1.5" />

                <Accordion type="multiple" className="space-y-2">
                  {script.steps.map((step, idx) => {
                    const key = `${script.key}:${step.key}`;
                    const run = script.runs[step.key];
                    const d = drafts[key] ?? toDraft(run);
                    const status =
                      run?.passed === true
                        ? "pass"
                        : run?.passed === false
                          ? "fail"
                          : "pending";
                    return (
                      <AccordionItem
                        key={step.key}
                        value={step.key}
                        className="rounded-xl border border-border/60 bg-background/40"
                      >
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex w-full items-center gap-3 text-left">
                            {status === "pass" ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : status === "fail" ? (
                              <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            )}
                            <span className="text-xs font-mono text-muted-foreground">
                              {idx + 1}.
                            </span>
                            <span className="flex-1 text-sm text-foreground">
                              {step.title}
                            </span>
                            {run?.updated_at && (
                              <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
                                {new Date(run.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <p className="mb-3 text-sm text-muted-foreground">
                            {step.detail}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Notes
                              </label>
                              <Textarea
                                rows={3}
                                value={d.notes}
                                onChange={(e) =>
                                  setDraft(key, { notes: e.target.value })
                                }
                                placeholder="What did you observe?"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Issue found (if failing)
                              </label>
                              <Textarea
                                rows={3}
                                value={d.issue_found}
                                onChange={(e) =>
                                  setDraft(key, { issue_found: e.target.value })
                                }
                                placeholder="Describe the bug or blocker."
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Priority
                              </label>
                              <Select
                                value={d.priority}
                                onValueChange={(v) =>
                                  setDraft(key, { priority: v as Priority })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Assigned follow-up
                              </label>
                              <Input
                                value={d.assigned_follow_up}
                                onChange={(e) =>
                                  setDraft(key, {
                                    assigned_follow_up: e.target.value,
                                  })
                                }
                                placeholder="Person or team to follow up"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={saving === key}
                              onClick={() => save(script.key, step.key, true)}
                            >
                              {saving === key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Mark passing
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving === key}
                              onClick={() => save(script.key, step.key, false)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Log failure
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>
            );
          })}
        </div>
      )}
    </OwnerShell>
  );
}
