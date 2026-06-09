import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitFeedback } from "@/lib/validation/validation.functions";

const TYPES = [
  ["bug", "Bug Report"],
  ["confusing", "Confusing Experience"],
  ["feature_request", "Feature Request"],
  ["missing_resource", "Missing Resource"],
  ["missing_partner", "Missing Partner / Opportunity"],
  ["data_access", "Data or Access Issue"],
  ["design_usability", "Design / Usability"],
  ["general", "General Feedback"],
] as const;

const HIDE_ON = ["/onboarding", "/login", "/auth", "/demo", "/owner"];

export function FeedbackButton() {
  const location = useLocation();
  const submit = useServerFn(submitFeedback);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    feedback_type: "bug" as (typeof TYPES)[number][0],
    title: "",
    description: "",
    priority_suggestion: "medium" as "low" | "medium" | "high" | "critical",
  });

  if (HIDE_ON.some((p) => location.pathname.startsWith(p))) return null;

  async function send() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description required");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          ...form,
          related_page: location.pathname,
        },
      });
      toast.success("Thanks for the feedback!");
      setOpen(false);
      setForm({
        feedback_type: "bug",
        title: "",
        description: "",
        priority_suggestion: "medium",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="fixed bottom-4 right-4 z-40 shadow-lg"
          aria-label="Send feedback or report an issue"
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what's confusing, broken, or missing. We read every submission.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.feedback_type}
              onValueChange={(v) => setForm({ ...form, feedback_type: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.priority_suggestion}
              onValueChange={(v) =>
                setForm({ ...form, priority_suggestion: v as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low priority</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Short title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={200}
          />
          <Textarea
            placeholder="Describe what happened or what would help"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">
            Current page: <code>{location.pathname}</code>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
