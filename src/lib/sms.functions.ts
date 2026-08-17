import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// E.164 format: leading +, 8-15 digits
const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{7,14}$/, "Phone must be in E.164 format, e.g. +15555550123");

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// In-memory verification code store (best-effort; 10-min TTL).
// Per-worker only — fine for low-volume SMS verification.
const codeStore = new Map<string, { code: string; phone: string; expiresAt: number; attempts: number }>();
function rememberCode(userId: string, phone: string, code: string) {
  codeStore.set(userId, { code, phone, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
}
function takeCode(userId: string) {
  const e = codeStore.get(userId);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    codeStore.delete(userId);
    return null;
  }
  return e;
}

async function sendTwilioSms(to: string, body: string): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER;
  if (!LOVABLE_API_KEY) throw new Error("SMS is not configured yet (missing Lovable key).");
  if (!TWILIO_API_KEY) throw new Error("SMS isn't connected yet. Ask an admin to connect Twilio in Settings.");
  if (!TWILIO_FROM) throw new Error("SMS sender number isn't configured. Add TWILIO_FROM_NUMBER.");

  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Twilio send failed", res.status, text);
    throw new Error("Could not send the text. Please try again in a minute.");
  }
}

/** Returns whether the SMS provider is wired up at all (does NOT confirm the user has opted in). */
export const getSmsProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const ready = Boolean(
      process.env.LOVABLE_API_KEY &&
        process.env.TWILIO_API_KEY &&
        (process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER),
    );
    return { ready };
  });

export const requestSmsVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ phone: PhoneSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await sendTwilioSms(
      data.phone,
      `Your TransitionForward verification code is ${code}. It expires in 10 minutes.`,
    );
    rememberCode(userId, data.phone, code);
    return { ok: true };
  });

export const confirmSmsVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code.") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const entry = takeCode(userId);
    if (!entry) throw new Error("That code expired. Send a fresh one.");
    entry.attempts += 1;
    if (entry.attempts > 5) {
      codeStore.delete(userId);
      throw new Error("Too many attempts. Send a fresh code.");
    }
    if (entry.code !== data.code) throw new Error("That code didn't match. Try again.");

    const { error } = await supabase
      .from("notification_prefs")
      .upsert(
        {
          user_id: userId,
          sms_phone_e164: entry.phone,
          sms_verified_at: new Date().toISOString(),
          sms_enabled: true,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not save your phone. Try again.");

    codeStore.delete(userId);
    return { ok: true, phone: entry.phone };
  });

export const disconnectSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    codeStore.delete(userId);
    const { error } = await supabase
      .from("notification_prefs")
      .upsert(
        { user_id: userId, sms_phone_e164: null, sms_verified_at: null, sms_enabled: false },
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not remove your phone. Try again.");
    return { ok: true };
  });
