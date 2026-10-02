import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { editOpportunityDetails, type PartnerOpportunity } from "@/lib/partner-workspace.functions";
import {
  opportunityEditFields,
  OPPORTUNITY_EDIT_TYPES,
  type OpportunityEditFields,
} from "@/lib/partner-opportunity-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELDS = [
  ["title", "Title", 200],
  ["description", "Description", 2000],
  ["location", "Location", 200],
  ["age_range", "Age range", 60],
  ["eligibility", "Eligibility and supports", 500],
  ["application_url", "Application link", 500],
  ["contact_email", "Contact email", 200],
] as const;

/** Mount for one selected draft; parent keys by ID and revision. */
export function OpportunityEditDialog({
  opportunity,
  onClose,
  onSaved,
}: {
  opportunity: PartnerOpportunity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(editOpportunityDetails);
  const [values, setValues] = useState<OpportunityEditFields>(() => ({
    title: opportunity.title,
    description: opportunity.description ?? "",
    opportunity_type: opportunity.opportunity_type as OpportunityEditFields["opportunity_type"],
    location: opportunity.location ?? "",
    age_range: opportunity.age_range ?? "",
    eligibility: opportunity.eligibility ?? "",
    application_url: opportunity.application_url ?? "",
    contact_email: opportunity.contact_email ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = opportunityEditFields.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0]);
      setError(issue.message);
      setInvalidField(field);
      const form = event.currentTarget as HTMLFormElement;
      const control = form.querySelector<HTMLElement>(
        `#opportunity-edit-${field === "opportunity_type" ? "type" : field}`,
      );
      control?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setInvalidField(null);
    try {
      await save({
        data: { ...parsed.data, id: opportunity.id, expected_updated_at: opportunity.updated_at },
      });
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save. Your edits are still here.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit opportunity</DialogTitle>
          <DialogDescription>
            Save your changes as a draft. Submit it for review from the list when it is ready.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {FIELDS.map(([key, label, maxLength]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`opportunity-edit-${key}`} className="text-sm font-medium">
                  {label}
                </label>
                {key === "description" || key === "eligibility" ? (
                  <Textarea
                    id={`opportunity-edit-${key}`}
                    value={values[key]}
                    maxLength={maxLength}
                    aria-invalid={invalidField === key || undefined}
                    aria-describedby={invalidField === key ? "opportunity-edit-error" : undefined}
                    onChange={(e) =>
                      setValues((current) => ({ ...current, [key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    id={`opportunity-edit-${key}`}
                    value={values[key]}
                    maxLength={maxLength}
                    aria-invalid={invalidField === key || undefined}
                    aria-describedby={invalidField === key ? "opportunity-edit-error" : undefined}
                    required={key === "title"}
                    type={
                      key === "contact_email" ? "email" : key === "application_url" ? "url" : "text"
                    }
                    onChange={(e) =>
                      setValues((current) => ({ ...current, [key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
            <div className="space-y-1">
              <label htmlFor="opportunity-edit-type" className="text-sm font-medium">
                Opportunity type
              </label>
              <select
                id="opportunity-edit-type"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={values.opportunity_type}
                aria-invalid={invalidField === "opportunity_type" || undefined}
                aria-describedby={
                  invalidField === "opportunity_type" ? "opportunity-edit-error" : undefined
                }
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    opportunity_type: e.target.value as OpportunityEditFields["opportunity_type"],
                  }))
                }
              >
                {OPPORTUNITY_EDIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          {error && (
            <p id="opportunity-edit-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
