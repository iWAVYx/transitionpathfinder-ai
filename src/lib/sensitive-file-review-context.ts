import type { SensitiveTextContext } from "@/lib/sensitive-text-redaction";

/**
 * React effects must depend on the privacy values that influence redaction,
 * not on the identity of a caller-created context object. Keeping that list in
 * one typed helper makes equivalent inline objects semantically stable while
 * ensuring every meaningful context change still restarts the review.
 */
export function sensitiveTextContextDependencies(
  context?: SensitiveTextContext,
): readonly [
  SensitiveTextContext["studentFirstName"],
  SensitiveTextContext["studentLastName"],
  SensitiveTextContext["schoolName"],
  SensitiveTextContext["dateOfBirth"],
] {
  return [
    context?.studentFirstName,
    context?.studentLastName,
    context?.schoolName,
    context?.dateOfBirth,
  ];
}
