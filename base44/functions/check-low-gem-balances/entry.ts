import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from "../../shared/gmailSend.ts";

const THRESHOLD = 50;
const COOLDOWN_HOURS = 24;

function buildHtml(user, gems) {
  const name = user.full_name || (user.email ? user.email.split('@')[0] : 'collector');
  let body = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">`;
  body += `<h2 style="margin:0 0 8px">Hey ${esc(name)},</h2>`;
  body += `<p style="color:#6b7280;margin:0 0 24px">Your gem balance is running low — you have <b style="color:#b45309">${gems} gems</b> left.</p>`;
  body += `<p style="margin:0 0 16px">Don't miss out on ripping packs, chasing rare pulls, and trading on the marketplace!</p>`;
  body += `<div style="text-align:center;margin:28px 0"><span style="display:inline-block;background:linear-gradient(to right,#fcd34d,#f97316);color:#000;font-weight:bold;padding:14px 32px;border-radius:9999px;font-size:16px">Log in to PackPulseDrops to top up</span></div>`;
  body += `<p style="color:#6b7280;margin:0 0 8px">Head to the <b>Shop</b> to grab more gems and get back in the game.</p>`;
  body += `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#9ca3af;font-size:12px">You're receiving this because your gem balance dropped below ${THRESHOLD}. Top up to keep the pulls going!</p></div>`;
  return body;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const dryRun = !!body.dry_run;
    const threshold = typeof body.threshold === 'number' ? body.threshold : THRESHOLD;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail not connected' }, { status: 500 });

    let senderEmail;
    try {
      senderEmail = await resolveGmailSender(accessToken);
    } catch (e) {
      console.error('gmail sender error', e.message);
      return Response.json({ error: e.message }, { status: 500 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const now = new Date();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    let notified = 0, cleared = 0, skipped = 0;
    const errors = [];
    const lowGemUsers = [];

    for (const user of users || []) {
      const gems = typeof user.gems === 'number' ? user.gems : 0;

      if (gems < threshold) {
        if (!user.email) { skipped++; continue; }

        const lastNotified = user.low_gem_notified_at ? new Date(user.low_gem_notified_at) : null;
        const inCooldown = lastNotified && (now.getTime() - lastNotified.getTime()) < cooldownMs;

        lowGemUsers.push({ id: user.id, gems, inCooldown });

        if (inCooldown) { skipped++; continue; }
        if (dryRun) continue;

        try {
          await sendGmail(accessToken, senderEmail, user.email, 'Your PackPulseDrops gems are running low', buildHtml(user, gems));
          await base44.asServiceRole.entities.User.update(user.id, { low_gem_notified_at: now.toISOString() });
          notified++;
        } catch (e) {
          console.error('low-gem notify failed for', user.email, e);
          errors.push({ user_id: user.id, error: e.message });
        }
      } else if (user.low_gem_notified_at && !dryRun) {
        try {
          await base44.asServiceRole.entities.User.update(user.id, { low_gem_notified_at: null });
          cleared++;
        } catch {
          /* ignore */
        }
      }
    }

    return Response.json({
      success: true,
      dryRun,
      threshold,
      total: (users || []).length,
      lowGemCount: lowGemUsers.length,
      notified,
      cleared,
      skipped,
      errors,
      lowGemUsers: dryRun ? lowGemUsers : undefined,
    });
  } catch (error) {
    console.error('check-low-gem-balances error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}