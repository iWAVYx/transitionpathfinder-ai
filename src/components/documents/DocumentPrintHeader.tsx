import { toTitleCase } from "@/lib/title-case";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** Compact approved branding shared by screen and print documents, without site navigation. */
export function DocumentPrintHeader({ title }: { title: string }) {
  return (
    <div data-document-print-header className="block border-b border-border pb-3 mb-5">
      <BrandLogo size="sm" />
      <p className="mt-2 text-sm font-semibold text-foreground">{toTitleCase(title)}</p>
    </div>
  );
}
