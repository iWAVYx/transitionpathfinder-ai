-- PostgREST can only infer an ON CONFLICT target from a non-partial unique
-- index. Keep the exactly-one-subject checks and make the webhook's compound
-- subject keys directly usable by atomic upserts.

CREATE UNIQUE INDEX billing_accounts_subject_environment_uidx
  ON public.billing_accounts (user_id, organization_id, environment)
  NULLS NOT DISTINCT;

DROP INDEX IF EXISTS public.billing_accounts_user_uidx;
DROP INDEX IF EXISTS public.billing_accounts_org_uidx;

CREATE UNIQUE INDEX access_entitlements_subject_plan_uidx
  ON public.access_entitlements (organization_id, user_id, plan_type)
  NULLS NOT DISTINCT;

DROP INDEX IF EXISTS public.access_entitlements_org_plan_uidx;
DROP INDEX IF EXISTS public.access_entitlements_user_plan_uidx;

-- A regular unique index still allows multiple NULL subscription ids for
-- grants and pilots, while making subscription-backed pools upsertable.
DROP INDEX IF EXISTS public.license_pools_subscription_type_uidx;
CREATE UNIQUE INDEX license_pools_subscription_type_uidx
  ON public.license_pools (subscription_id, license_type, source);