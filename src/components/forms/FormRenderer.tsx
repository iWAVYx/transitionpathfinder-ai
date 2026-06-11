import { useState } from "react";
import type { FormField, FormSchema } from "@/lib/forms.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormRenderer({
  schema,
  initial,
  onSave,
  saving,
}: {
  schema: FormSchema;
  initial?: Record<string, unknown>;
  onSave: (answers: Record<string, unknown>, status: "draft" | "completed") => void;
  saving?: boolean;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial ?? {});
  const [error, setError] = useState<string | null>(null);

  function setVal(id: string, v: unknown) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function submit(status: "draft" | "completed") {
    if (status === "completed") {
      for (const f of schema.fields) {
        if (f.required) {
          const v = values[f.id];
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "") ||
            (Array.isArray(v) && v.length === 0)
          ) {
            setError(`Please answer: ${f.label}`);
            return;
          }
        }
      }
    }
    setError(null);
    onSave(values, status);
  }

  return (
    <div className="space-y-6">
      {schema.fields.map((f) => (
        <Field key={f.id} field={f} value={values[f.id]} onChange={(v) => setVal(f.id, v)} />
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:flex-wrap sm:gap-3">
        <Button
          onClick={() => submit("completed")}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? "Saving…" : "Mark complete"}
        </Button>
        <Button
          variant="outline"
          onClick={() => submit("draft")}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Save draft
        </Button>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseLabel = (
    <span className="mb-1.5 block text-sm font-medium">
      {field.label} {field.required && <span className="text-primary">*</span>}
    </span>
  );

  if (field.type === "text") {
    return (
      <label className="block">
        {baseLabel}
        <input
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-base sm:py-2 sm:text-sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="block">
        {baseLabel}
        <textarea
          rows={4}
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-base sm:py-2 sm:text-sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (field.type === "single-select") {
    return (
      <div>
        {baseLabel}
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === "multi-select" || field.type === "checklist") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {baseLabel}
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const active = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === "scale") {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    const cur = typeof value === "number" ? value : min;
    return (
      <div>
        {baseLabel}
        <div className="flex gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-11 w-11 rounded-full border text-sm font-semibold",
                cur === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
