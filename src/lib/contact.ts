/**
 * Canonical legal identity and public contact addresses for TransitionForward.
 *
 * Single source of truth — never hardcode a legal entity name or contact
 * address in a component, email template, or server route. Transactional mail
 * is sent from the verified Resend sender subdomain
 * (updates.transitionforwardct.com) but replies are routed to the
 * human-monitored inboxes below on the root domain.
 */

/** Consumer-facing product brand. */
export const PRODUCT_NAME = "TransitionForward";

/** Registered legal entity behind the product. */
export const LEGAL_ENTITY_NAME = "Transition Forward LLC";

/**
 * Required attribution wording. Used in the footer, Terms, Privacy, consent
 * language, invoices, receipts, checkout, contracts, and formal emails.
 * This is an attribution statement, not a DBA claim.
 */
export const LEGAL_ATTRIBUTION = `${PRODUCT_NAME} is a service of ${LEGAL_ENTITY_NAME}.`;

/** Copyright line owner. */
export function legalCopyright(year: number = new Date().getFullYear()): string {
  return `© ${year} ${LEGAL_ENTITY_NAME}`;
}

/** Help links, in-app support, and transactional Reply-To. */
export const SUPPORT_EMAIL = "support@transitionforwardct.com";

/** Pricing, licensing, district and partner inquiries. */
export const SALES_EMAIL = "sales@transitionforwardct.com";

/** Administrative and legal escalation. */
export const ADMIN_EMAIL = "admin@transitionforwardct.com";

/** Invoices, receipts, subscriptions, purchase orders. */
export const BILLING_EMAIL = "billing@transitionforwardct.com";

/** Privacy requests: access, correction, deletion, FERPA questions. */
export const PRIVACY_EMAIL = "privacy@transitionforwardct.com";

/** Vulnerability reports and security incidents. */
export const SECURITY_EMAIL = "security@transitionforwardct.com";

export const CONTACT_EMAILS = {
  support: SUPPORT_EMAIL,
  sales: SALES_EMAIL,
  admin: ADMIN_EMAIL,
  billing: BILLING_EMAIL,
  privacy: PRIVACY_EMAIL,
  security: SECURITY_EMAIL,
} as const;

export type ContactAudience = keyof typeof CONTACT_EMAILS;

export function mailtoHref(audience: ContactAudience, subject?: string): string {
  const address = CONTACT_EMAILS[audience];
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
}
