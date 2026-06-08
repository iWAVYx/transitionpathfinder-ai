import { TrustNote } from "./TrustNote";

type Props = {
  variant?: "inline" | "banner";
  className?: string;
};

/**
 * Standard AI disclaimer. Thin wrapper around <TrustNote variant="ai" /> so
 * all AI-supportive copy stays consistent across the app.
 */
export function AIDisclaimer({ variant = "inline", className = "" }: Props) {
  return (
    <TrustNote
      variant="ai"
      display={variant === "banner" ? "banner" : "card"}
      className={className}
    />
  );
}
