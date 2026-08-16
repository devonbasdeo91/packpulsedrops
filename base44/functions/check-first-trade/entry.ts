import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

/**
 * Called by the "First Trade Referral" workflow immediately after a Trade is
 * accepted. Determines whether either party is a referred user completing
 * their first-ever accepted trade — the condition for the milestone bonus.
 *
 * Returns { proceed: bool } so the workflow can branch: proceed → wait 24h
 * then grant, otherwise end. Does NOT grant anything itself.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tradeId = body.trade_id;
    if (!tradeId) return Response.json({ error: 'trade_id required' }, { status: 400 });

    const trade = await base44.asServiceRole.entities.Trade.get(tradeId);
    if (!trade) return Response.json({ error: 'Trade not found' }, { status: 404 });
    if (trade.status !== 'accepted') {
      return Response.json({ proceed: false, reason: 'trade_not_accepted' });
    }

    // Check both parties — either could be the referred user completing their
    // first trade. A user qualifies if: (1) they have a referrer, (2) they
    // haven't already received the first-trade bonus, and (3) this is their
    // only accepted trade (i.e. their first).
    const parties = [
      { id: trade.requester_id, name: trade.requester_name, role: 'requester' },
      { id: trade.recipient_id, name: trade.recipient_name, role: 'recipient' },
    ].filter((p) => p.id);

    const qualifying = [];
    for (const party of parties) {
      const user = await base44.asServiceRole.entities.User.get(party.id);
      if (!user) continue;
      if (!user.referred_by) continue; // not referred — no milestone to grant
      if (user.first_trade_bonus_at) continue; // already bonused

      // Count this user's accepted trades (both sides). If this trade is the
      // only one, it's their first.
      const [asRequester, asRecipient] = await Promise.all([
        base44.asServiceRole.entities.Trade.filter(
          { requester_id: party.id, status: 'accepted' }, '-created_date', 50
        ),
        base44.asServiceRole.entities.Trade.filter(
          { recipient_id: party.id, status: 'accepted' }, '-created_date', 50
        ),
      ]);
      const seen = new Set();
      const all = [...(asRequester || []), ...(asRecipient || [])].filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      if (all.length === 1) {
        qualifying.push({
          user_id: party.id,
          user_name: party.name,
          referrer_id: user.referred_by,
        });
      }
    }

    return Response.json({
      proceed: qualifying.length > 0,
      trade_id: tradeId,
      qualifying,
    });
  } catch (error) {
    console.error('check-first-trade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}