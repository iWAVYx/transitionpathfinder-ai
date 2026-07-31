/**
 * Canonical public contact addresses for TransitionForward.
 *
 * Single source of truth — never hardcode a contact address in a component
 * or server route. Transactional mail is sent from the verified Resend
 * sender subdomain (updates.transitionforwardct.com) but replies are routed
 * to the human-monitored support inbox below.
 */

/** Help links, in-app support, and transactional Reply-To. */
export const SUPPORT_EMAIL = "support@transitionforwardct.com";

/** Pricing, licensing, district and partner inquiries. */
export const SALES_EMAIL = "sales@transitionforwardct.com";

/** Administrative and security escalation (privacy, disclosure, legal). */
export const ADMIN_EMAIL = "admin@transitionforwardct.com";

export const CONTACT_EMAILS = {
  support: SUPPORT_EMAIL,
  sales: SALES_EMAIL,
  admin: ADMIN_EMAIL,
} as const;

export type ContactAudience = keyof typeof CONTACT_EMAILS;

export function mailtoHref(audience: ContactAudience, subject?: string): string {
  const address = CONTACT_EMAILS[audience];
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
}
