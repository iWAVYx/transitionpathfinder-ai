import { convert, type HtmlToTextOptions, type SelectorDefinition } from "html-to-text";
import type { ReactElement } from "react";

const EMAIL_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

const PLAIN_TEXT_SELECTORS: SelectorDefinition[] = [
  { selector: "img", format: "skip" },
  { selector: "[data-skip-in-text=true]", format: "skip" },
  {
    selector: "a",
    options: {
      linkBrackets: false,
      hideLinkHrefIfSameAsText: true,
    },
  },
];

type RenderEmailOptions = {
  plainText?: boolean;
  htmlToTextOptions?: HtmlToTextOptions;
};

async function loadReactDomServer() {
  return import("react-dom/server.edge").catch(() => import("react-dom/server"));
}

/**
 * Render transactional email markup without React Email's optional Prettier
 * formatter. None of the app's email paths request pretty output, and keeping
 * that formatter in the Worker adds the entire Prettier parser to every build.
 */
export async function renderEmail(
  element: ReactElement,
  options: RenderEmailOptions = {},
): Promise<string> {
  const reactDomServer = await loadReactDomServer();
  let renderError: unknown;
  const stream = await reactDomServer.renderToReadableStream(element, {
    progressiveChunkSize: Number.POSITIVE_INFINITY,
    onError(error) {
      if (renderError === undefined) renderError = error;
    },
  });

  await stream.allReady;
  if (renderError !== undefined) throw renderError;

  const markup = await new Response(stream).text();
  if (options.plainText) {
    const { selectors = [], ...htmlToTextOptions } =
      options.htmlToTextOptions ?? {};
    return convert(markup, {
      wordwrap: false,
      ...htmlToTextOptions,
      selectors: [...PLAIN_TEXT_SELECTORS, ...selectors],
    });
  }

  return `${EMAIL_DOCTYPE}${markup.replace(/<!DOCTYPE.*?>/, "")}`;
}
