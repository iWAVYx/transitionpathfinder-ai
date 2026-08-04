import Stripe from 'stripe';
import {
  type StripeEnv,
  classifyStripeKey,
  resolveServerStripeEnv,
  assertRequestedStripeEnv,
  stripeEnvForAppEnv,
  webhookEnvAllowed,
} from '@/lib/billing/stripe-env';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type { StripeEnv };
export {
  classifyStripeKey,
  resolveServerStripeEnv,
  assertRequestedStripeEnv,
  stripeEnvForAppEnv,
  webhookEnvAllowed,
};

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  return env === 'sandbox'
    ? getEnv('STRIPE_SANDBOX_API_KEY')
    : getEnv('STRIPE_LIVE_API_KEY');
}

const API_VERSION = '2026-03-25.dahlia' as const;

/**
 * Builds a Stripe client for the requested environment.
 *
 * - `mk_…` connection identifiers keep the Lovable connector gateway path
 *   (and require LOVABLE_API_KEY).
 * - `sk_test_` / `rk_test_` raw keys talk to api.stripe.com directly, with no
 *   gateway and no LOVABLE_API_KEY — this is what the isolated staging Worker
 *   uses.
 * - Live keys in a sandbox context, and unrecognized formats, fail closed.
 *
 * Credential values are never logged.
 */
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const kind = classifyStripeKey(connectionApiKey);

  if (kind === 'unknown') {
    throw new Error(
      `Stripe credential for ${env} is not a recognized key format.`,
    );
  }
  if (kind === 'direct_live' && env === 'sandbox') {
    throw new Error('Refusing to use a live Stripe key in the sandbox environment.');
  }
  if (kind === 'direct_test' && env === 'live') {
    throw new Error('Refusing to use a test Stripe key in the live environment.');
  }

  if (kind !== 'gateway') {
    // Raw Stripe secret/restricted key — normal client, no gateway proxy.
    return new Stripe(connectionApiKey, { apiVersion: API_VERSION });
  }

  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  return new Stripe(connectionApiKey, {
    apiVersion: API_VERSION,
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ?? (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}


export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

/**
 * Verifies the Stripe webhook signature (HMAC-SHA256 over `timestamp.body`)
 * without the SDK, so it never needs the gateway proxy.
 */
export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ id?: string; type: string; data: { object: any } }> {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const secret =
    env === 'sandbox'
      ? getEnv('PAYMENTS_SANDBOX_WEBHOOK_SECRET')
      : getEnv('PAYMENTS_LIVE_WEBHOOK_SECRET');

  if (!signature || !body) {
    throw new Error('Missing signature or body');
  }

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) v1Signatures.push(value);
  }

  if (!timestamp || v1Signatures.length === 0) {
    throw new Error('Invalid signature format');
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) {
    throw new Error('Webhook timestamp too old');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString('hex');

  if (!v1Signatures.includes(expected)) {
    throw new Error('Invalid webhook signature');
  }

  return JSON.parse(body);
}
