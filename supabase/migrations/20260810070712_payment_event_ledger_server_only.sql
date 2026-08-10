-- The Stripe event ledger is an internal idempotency mechanism. No browser
-- role needs direct access, including platform administrators; operational
-- inspection runs through trusted server or database tooling.

REVOKE ALL PRIVILEGES ON TABLE public.processed_payment_events
  FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.processed_payment_events TO service_role;
