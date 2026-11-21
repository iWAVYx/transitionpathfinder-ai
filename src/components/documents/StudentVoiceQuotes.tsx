import { PublicationPullQuote } from "@/components/publication/PublicationPage";

export type StudentVoiceQuote = { id: string; prompt: string; answer: string };

/** Present supplied student responses verbatim; never generate or infer an answer. */
export function StudentVoiceQuotes({ responses }: { responses: StudentVoiceQuote[] }) {
  if (responses.length === 0) return null;
  return <div data-report-voice-responses>
    {responses.map(response => <div key={response.id} data-report-voice-response={response.id}>
      <PublicationPullQuote attribution={response.prompt}>{`"${response.answer}"`}</PublicationPullQuote>
    </div>)}
  </div>;
}
