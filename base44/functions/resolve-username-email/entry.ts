import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public (pre-login): resolves a unique username and triggers a password reset
// email server-side when the account exists. Never returns the email address
// to the caller — always responds 200 with { ok: true } so the caller can show
// a generic "check your email" message without leaking which usernames exist.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — pre-login endpoint, guests allowed
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const username = (body.username || '').trim().toLowerCase();
    if (!username) return Response.json({ ok: true });

    // Targeted lookup by username — never loads the full user list, so there
    // is no bulk data to enumerate. Usernames are stored lowercased (see
    // set-username), so this matches exactly.
    const matches = await base44.asServiceRole.entities.User.filter({ username }, '-created_date', 1);
    const match = matches[0];
    if (match?.email) {
      try {
        await base44.asServiceRole.auth.resetPasswordRequest(match.email);
      } catch (e) {
        console.error('resolve-username-email reset request failed', e);
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('resolve-username-email error', error);
    return Response.json({ ok: true });
  }
}