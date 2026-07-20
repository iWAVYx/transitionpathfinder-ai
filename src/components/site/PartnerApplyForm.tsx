import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitPartnerApplication } from "@/lib/partner-submissions.functions";

const ORG_TYPES = [
  "four-year-college",
  "community-college",
  "technical-trade",
  "supported-employment",
  "community-org",
  "mentor-alumni",
  "agency",
  "other",
] as const;

const ORG_TYPE_LABEL: Record<(typeof ORG_TYPES)[number], string> = {
  "four-year-college": "Four-year college / university",
  "community-college": "Community / two-year college",
  "technical-trade": "Technical or trade school",
  "supported-employment": "Supported employment / job coaching",
  "community-org": "Community organization / nonprofit",
  "mentor-alumni": "Mentor or alumni program",
  "agency": "State agency (BRS, DDS, etc.)",
  "other": "Something else",
};

const Schema = z.object({
  contact_name: z.string().trim().min(1, "Please share your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  organization: z.string().trim().min(1, "Add your organization name").max(200),
  org_type: z.enum(ORG_TYPES),
  region: z.string().trim().min(1, "City, county, or state we serve").max(200),
  serves_iep: z.enum(["yes", "exploring", "unsure"]),
  program_summary: z
    .string()
    .trim()
    .min(20, "A sentence or two about what students gain")
    .max(2000),
});

type FormValues = z.infer<typeof Schema>;

const SERVES_IEP_LABEL: Record<"yes" | "exploring" | "unsure", string> = {
  yes: "Actively serves students with IEPs",
  exploring: "Exploring how to better support students with IEPs",
  unsure: "Unsure — open to a conversation",
};

export function PartnerApplyForm() {
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitPartnerApplication);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      contact_name: "",
      email: "",
      organization: "",
      org_type: "community-org",
      region: "Connecticut",
      serves_iep: "yes",
      program_summary: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await submit({
        data: {
          organization_name: values.organization,
          organization_type: ORG_TYPE_LABEL[values.org_type],
          contact_name: values.contact_name,
          contact_email: values.email,
          region: values.region,
          services_offered: values.program_summary,
          audience_served: SERVES_IEP_LABEL[values.serves_iep],
          consent_to_contact: true,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border bg-card p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-2xl font-medium leading-tight">
              Application received. Thank you.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We review every partner submission by hand. Expect a reply within five school days
              from a real person, with next steps for vetting and inclusion in the pilot
              directory.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-5 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
      aria-labelledby="partner-apply-heading"
    >
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 id="partner-apply-heading" className="font-display text-xl font-medium">
            Apply to the Partner Pathway Network
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us about your program. We'll follow up to vet, photograph, and write your
            plain-language listing — at no cost during the pilot.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your Name" error={form.formState.errors.contact_name?.message}>
          <Input {...form.register("contact_name")} placeholder="First and last name" maxLength={200} />
        </Field>
        <Field label="Work Email" error={form.formState.errors.email?.message}>
          <Input
            type="email"
            {...form.register("email")}
            placeholder="you@organization.org"
            maxLength={255}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization" error={form.formState.errors.organization?.message}>
          <Input
            {...form.register("organization")}
            placeholder="e.g. Capital Community College"
            maxLength={200}
          />
        </Field>
        <Field label="Region You Serve" error={form.formState.errors.region?.message}>
          <Input {...form.register("region")} placeholder="e.g. Hartford County, CT" maxLength={200} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization Type">
          <Select
            defaultValue="community-org"
            onValueChange={(v) => form.setValue("org_type", v as FormValues["org_type"])}
          >
            <SelectTrigger aria-label="Organization Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ORG_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Do you currently serve students with IEPs?">
          <Select
            defaultValue="yes"
            onValueChange={(v) => form.setValue("serves_iep", v as FormValues["serves_iep"])}
          >
            <SelectTrigger aria-label="Do you currently serve students with IEPs?">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — actively</SelectItem>
              <SelectItem value="exploring">Exploring how to better support them</SelectItem>
              <SelectItem value="unsure">Not sure — happy to talk it through</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Tell us about your program"
        error={form.formState.errors.program_summary?.message}
      >
        <Textarea
          rows={5}
          maxLength={2000}
          {...form.register("program_summary")}
          placeholder="What do students do, learn, and gain? Eligibility, cost, and how someone applies. Plain language — exactly how you'd explain it to a family at a school open house."
        />
      </Field>

      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          We never share your contact info publicly without your written approval.
        </p>
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
          {form.formState.isSubmitting ? "Submitting…" : "Apply to the Partner Pathway Network"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
