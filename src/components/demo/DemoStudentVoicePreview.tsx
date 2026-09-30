import type { DemoProfile } from "@/lib/demo/demo-profiles";

/** Read-only fictional responses; never mounts the signed-in capture workflow. */
export function DemoStudentVoicePreview({ profile }: { profile: DemoProfile }) {
  return (
    <section
      className="rounded-2xl border bg-card p-5"
      aria-label={`Sample voice responses for ${profile.shortName}`}
    >
      <h2 className="font-display text-xl">In {profile.shortName}'s words</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Fictional responses from the selected sample profile. These help shape the sample Pathway
        Report.
      </p>
      <dl className="mt-4 divide-y">
        {profile.voice.map(({ prompt, answer }) => (
          <div key={prompt} className="py-3">
            <dt className="text-sm font-semibold">{prompt}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
