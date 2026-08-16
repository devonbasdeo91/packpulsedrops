import { secrets } from "base44:runtime";

// HMAC-SHA256 signed token embedded in price-reduction email buttons.
// When a seller clicks "Apply Price Reduction" in the email, the link
// carries this token — the apply-price-reduction function verifies it
// before updating the listing, so the link can't be forged or reused
// for a different listing/price.
//
// Token format: <payloadB64>.<sigB64>
//   payload = JSON { lid, price, exp }
//   sig    = base64url(HMAC-SHA256(secret, payloadB64))

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — email may sit unread

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

export async function issuePriceReductionToken(listingId: string, suggestedPrice: number): Promise<string> {
  const secret = secrets.get("Internal_Auth_Secret");
  if (!secret) throw new Error("Server signing secret not configured");
  const payload = JSON.stringify({
    lid: listingId,
    price: suggestedPrice,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  const payloadB64 = b64urlEncode(strToBytes(payload));
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export async function verifyPriceReductionToken(
  token: string
): Promise<{ valid: boolean; listing_id?: string; suggested_price?: number; reason?: string }> {
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
  if (typeof payload.exp !== "number" || Math.floor(Date.now() / 1000) > payload.exp) {
    return { valid: false, reason: "Token expired" };
  }
  return { valid: true, listing_id: payload.lid, suggested_price: payload.price };
}