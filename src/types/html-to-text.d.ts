declare module "html-to-text" {
  export type SelectorDefinition = {
    selector: string;
    format?: string;
    options?: Record<string, unknown>;
  };

  export type HtmlToTextOptions = {
    selectors?: SelectorDefinition[];
    wordwrap?: false | number;
    [key: string]: unknown;
  };

  export function convert(html: string, options?: HtmlToTextOptions): string;
}
