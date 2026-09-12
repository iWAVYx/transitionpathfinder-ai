const TRANSIENT_GATEWAY_ERROR =
  /(?:\b502\b|\b503\b|\b504\b|bad gateway|gateway timeout|service unavailable|upstream[^\n]*tim(?:e|ed)[ -]?out)/i;

export function isTransientGatewayError(error) {
  if (!error) return false;
  const details = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ");
  return TRANSIENT_GATEWAY_ERROR.test(details);
}

export async function retryTransientGatewayRead(
  read,
  {
    attempts = 3,
    delaysMs = [1_000, 2_000],
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError("attempts must be a positive integer");
  }

  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await read();
    if (!result?.error || !isTransientGatewayError(result.error) || attempt === attempts) {
      return result;
    }

    const delay = delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 0;
    console.warn(
      `[staging-preflight] temporary gateway failure; retrying read ${attempt + 1}/${attempts}`,
    );
    if (delay > 0) await sleep(delay);
  }

  return result;
}
