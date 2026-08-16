import { secrets } from "base44:runtime";

// HMAC-SHA256 signed, short-lived, single-use-per-day token that proves a
// user went through the share-issuance step before claiming the daily share
// bonus. Without this token, the claim endpoint refuses to grant gems —
// closing the hole where an attacker could directly POST to claim-share-bonus
// and farm free gems without any share interaction.
//
// Token format: <payloadB64>.<sigB64>
//   payload = JSON { uid, day, exp }
//   sig    = base64url(HMAC-SHA256(secret, payloadB64))
//
// Single-use is enforced by the `last_share_bonus` field on the User entity
// (one claim per day), and short-lived by the `exp` timestamp (5 minutes).

const TOKEN_TTL_SECONDS = 300; // 5 minutes

function b64urlEncode(buf: Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function hmacSign(secret: string, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    strToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, strToBytes(msg));
  return new Uint8Array(sig);
}

async function hmacVerify(secret: string, msg: string, sigB64: string): Promise<boolean> {
  const expected = await hmacSign(secret, msg);
  const got = b64urlDecode(sigB64);
  if (expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ got[i];
  return diff === 0;
}

export function dayStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export async function issueShareToken(userId: string, day: string): Promise<string> {
  const secret = secrets.get("Internal_Auth_Secret");
  if (!secret) throw new Error("Server signing secret not configured");
  const payload = JSON.stringify({
    uid: userId,
    day,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  const payloadB64 = b64urlEncode(strToBytes(payload));
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export async function verifyShareToken(
  token: string,
  userId: string,
  day: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || typeof token !== "string") return { valid: false, reason: "Missing token" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "Malformed token" };
  const [payloadB64, sigB64] = parts;
  const secret = secrets.get("Internal_Auth_Secret");
  if (!secret) return { valid: false, reason: "Server error" };
  const ok = await hmacVerify(secret, payloadB64, sigB64);
  if (!ok) return { valid: false, reason: "Invalid signature" };
  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch {
    return { valid: false, reason: "Malformed payload" };
  }
  if (payload.uid !== userId) return { valid: false, reason: "Token user mismatch" };
  if (payload.day !== day) return { valid: false, reason: "Token expired or wrong day" };
  if (typeof payload.exp !== "number" || Math.floor(Date.now() / 1000) > payload.exp) {
    return { valid: false, reason: "Token expired" };
  }
  return { valid: true };
}