-- Forward-only billing grant hygiene.
--
-- Supabase projects can carry broad default table privileges even when the
-- creating migration grants a narrower set. Rebuild the effective grants for
-- payment authority tables so RLS is defense in depth, not the only barrier.

REVOKE ALL PRIVILEGES ON TABLE public.billing_accounts
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.subscriptions
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.processed_payment_events
  FROM PUBLIC, anon, authenticated;

-- Signed-in callers only read rows allowed by the existing RLS policies.
-- All payment-state writes continue to run through the signature-verified
-- webhook with the service role.
GRANT SELECT ON TABLE public.billing_accounts TO authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT ON TABLE public.processed_payment_events TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.billing_accounts TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.processed_payment_events TO service_role;