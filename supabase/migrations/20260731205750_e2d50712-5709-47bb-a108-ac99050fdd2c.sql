CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  quantity integer NOT NULL DEFAULT 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view their org subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.effective_org_access(auth.uid()) a
      WHERE a.organization_id = public.subscriptions.organization_id
    )
  );

CREATE POLICY "Platform admins can view subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.processed_payment_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.processed_payment_events TO service_role;

ALTER TABLE public.processed_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view processed payment events"
  ON public.processed_payment_events FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));