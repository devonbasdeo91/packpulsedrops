import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from "../../shared/gmailSend.ts";

function buildHtml(user, newPulls, changes) {
  const name = user.full_name || (user.email ? user.email.split('@')[0] : 'collector');
  let body = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">`;
  body += `<h2 style="margin:0 0 8px">Hey ${esc(name)},</h2>`;
  body += `<p style="color:#6b7280;margin:0 0 24px">Here's your daily PackPulseDrops vault digest.</p>`;

  if (newPulls.length) {
    body += `<h3 style="margin:0 0 10px">🆕 New pulls (${newPulls.length})</h3>`;
    body += `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">`;
    for (const p of newPulls) {
      body += `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(p.card_name)}</b><br><span style="color:#6b7280;font-size:13px">${esc(p.rarity)}${p.pack_name ? ' · ' + esc(p.pack_name) : ''}</span></td><td style="text-align:right;color:#b45309;font-weight:bold;white-space:nowrap">${(p.value_gems || 0).toLocaleString()} gems</td></tr>`;
    }
    body += `</table>`;
  }

  if (changes.length) {
    body += `<h3 style="margin:0 0 10px">📈 Vault price changes (${changes.length})</h3>`;
    body += `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">`;
    for (const c of changes) {
      const up = c.delta >= 0;
      body += `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(c.name)}</b><br><span style="color:#6b7280;font-size:13px">${esc(c.rarity || '')}</span></td><td style="text-align:right;white-space:nowrap"><span style="color:#9ca3af;text-decoration:line-through">${c.old.toLocaleString()}</span> → <b>${c.current.toLocaleString()}</b> gems<br><span style="color:${up ? '#059669' : '#dc2626'}">${up ? '▲' : '▼'} ${Math.abs(c.delta).toLocaleString()}</span></td></tr>`;
    }
    body += `</table>`;
  }

  if (!newPulls.length && !changes.length) {
    body += `<p style="color:#6b7280">Nothing new in your vault today — rip a pack to add to your collection!</p>`;
  }

  body += `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#9ca3af;font-size:12px">You're receiving this because you have cards in your PackPulseDrops vault.</p></div>`;
  return body;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail not connected' }, { status: 500 });

    let senderEmail;
    try {
      senderEmail = await resolveGmailSender(accessToken);
    } catch (e) {
      console.error('gmail sender error', e.message);
      return Response.json({ error: e.message }, { status: 500 });
    }

    const cards = await base44.asServiceRole.entities.Card.list('-created_date', 10000);
    const cardValue = new Map();
    for (const c of cards || []) {
      cardValue.set(`${(c.name || '').toLowerCase()}|${c.category || ''}`, c.value_gems || 0);
    }

    const pulls = await base44.asServiceRole.entities.Pull.list('-created_date', 10000);
    const byUser = new Map();
    for (const p of pulls || []) {
      const uid = p.created_by_id;
      if (!uid) continue;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(p);
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    const now = new Date().toISOString();
    let sent = 0, skipped = 0;
    const errors = [];

    for (const user of users || []) {
      if (!user.email) { skipped++; continue; }
      const userPulls = byUser.get(user.id) || [];
      if (userPulls.length === 0) { skipped++; continue; }

      const since = user.last_vault_summary ? new Date(user.last_vault_summary) : null;
      const newPulls = since
        ? userPulls.filter((p) => new Date(p.created_date) > since)
        : userPulls.slice(0, 10);

      const seen = new Set();
      const changes = [];
      for (const p of userPulls) {
        const key = `${(p.card_name || '').toLowerCase()}|${p.category || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const current = cardValue.get(key);
        if (current === undefined) continue;
        const old = p.value_gems || 0;
        if (current !== old) {
          changes.push({ name: p.card_name, rarity: p.rarity, old, current, delta: current - old });
        }
      }

      if (newPulls.length === 0 && changes.length === 0) { skipped++; continue; }

      try {
        await sendGmail(accessToken, senderEmail, user.email, 'Your PackPulseDrops vault digest', buildHtml(user, newPulls, changes));
        await base44.asServiceRole.entities.User.update(user.id, { last_vault_summary: now });
        sent++;
      } catch (e) {
        console.error('digest send failed for', user.email, e);
        errors.push({ user_id: user.id, error: e.message });
      }
    }

    return Response.json({ sent, skipped, errors });
  } catch (error) {
    console.error('send-vault-digest error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}