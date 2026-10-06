import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentVoiceQuotes } from "../../src/components/documents/StudentVoiceQuotes";

it("preserves every supplied prompt and answer without treating student text as markup", () => {
  const html = renderToStaticMarkup(<StudentVoiceQuotes responses={[
    { id: "first", prompt: "What helps you?", answer: "Quiet & written instructions." },
    { id: "second", prompt: "What should change?", answer: '<script>Not a command</script>' },
  ]} />);
  expect(html).toContain("What helps you?");
  expect(html).toContain("Quiet &amp; written instructions.");
  expect(html).toContain("What should change?");
  expect(html).toContain("&lt;script&gt;Not a command&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html.match(/<blockquote>/g)).toHaveLength(2);
});
it("renders no quote when no responses were supplied", () => {
  expect(renderToStaticMarkup(<StudentVoiceQuotes responses={[]} />)).toBe("");
});

it("retains all supplied responses beyond three quotes", () => {
  const responses = Array.from({ length: 5 }, (_, i) => ({ id: `voice-${i}`, prompt: `Question ${i + 1}`, answer: `Student answer ${i + 1}` }));
  const html = renderToStaticMarkup(<StudentVoiceQuotes responses={responses} />);
  expect(html.match(/<blockquote>/g)).toHaveLength(5);
  for (const response of responses) expect(html).toContain(response.answer);
});
