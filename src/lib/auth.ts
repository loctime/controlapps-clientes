// Auth mínima por password compartida. Todo acá tiene que correr también en el
// runtime edge del middleware, así que solo Web Crypto — nada de node:crypto.

export const AUTH_COOKIE = "clientes_session";
export const SESSION_DAYS = 30;

export function getPanelPassword() {
  const value = process.env.PANEL_PASSWORD?.trim();
  return value ? value : null;
}

function getSecret() {
  const secret = process.env.PANEL_SECRET?.trim();
  if (secret) return secret;
  // Fallback para que un deploy sin PANEL_SECRET siga funcionando.
  return `fallback:${getPanelPassword() ?? ""}`;
}

async function sign(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

export async function createSessionToken() {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiresAt);

  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, await sign(payload));
}
