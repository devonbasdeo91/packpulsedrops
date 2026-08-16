import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { createNotification } from "../../shared/notifications.ts";

const INVITEE_BONUS_GEMS = 250;
const REFERRER_BONUS_GEMS = 500;

/**
 * Called by the "First Trade Referral" workflow after a 24-hour hold. Re-verifies
 * that the trade is still accepted (not reversed) and that the qualifying user(s)
 * haven't already been bonused, then grants milestone gems to both the referred
 * user and their referrer.
 *
 * Idempotency: the `first_trade_bonus_at` timestamp on the User entity is set
 * atomically as part of the grant, so a replayed workflow run or a concurrent
 * call won't double-grant.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ disabled: true, reason: 'Referral trade bonuses have been disabled.' });

    const tradeId = body.trade_id;
    if (!tradeId) return Response.json({ error: 'trade_id required' }, { status: 400 });

    // Re-fetch the trade — if it was reversed (deleted or status changed away
    // from "accepted") in the 24h window, abort without granting anything.
    const trade = await base44.asServiceRole.entities.Trade.get(tradeId);
    if (!trade) return Response.json({ granted: false, reason: 'trade_deleted' });
    if (trade.status !== 'accepted') {
      return Response.json({ granted: false, reason: 'trade_reversed', current_status: trade.status });
    }

    const parties = [
      { id: trade.requester_id, name: trade.requester_name },
      { id: trade.recipient_id, name: trade.recipient_name },
    ].filter((p) => p.id);

    const granted = [];

    for (const party of parties) {
      // Fresh read — the user's gem balance or bonus flag may have changed
      // since the check step ran 24 hours ago.
      const user = await base44.asServiceRole.entities.User.get(party.id);
      if (!user) continue;
      if (!user.referred_by) continue; // not referred
      if (user.first_trade_bonus_at) continue; // already bonused (idempotency guard)

      const referrer = await base44.asServiceRole.entities.User.get(user.referred_by);
      if (!referrer) continue; // referrer account gone

      // --- Grant the invitee bonus ---
      // Re-read fresh balance right before writing — the read at the top of
      // the loop can be stale if a concurrent gem change landed between then
      // and this write, which would overwrite that change.
      const freshInvitee = await base44.asServiceRole.entities.User.get(party.id);
      await base44.asServiceRole.entities.User.update(party.id, {
        gems: (freshInvitee.gems || 0) + INVITEE_BONUS_GEMS,
        first_trade_bonus_at: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.Transaction.create({
        user_id: party.id,
        type: 'trade',
        amount_gems: INVITEE_BONUS_GEMS,
        description: 'First trade completed — referral milestone bonus',
        related_id: tradeId,
        counterparty_name: referrer.full_name || referrer.email?.split('@')[0] || 'Referrer',
      });
      await createNotification(base44, party.id, {
        type: 'info',
        title: '🎉 First trade bonus!',
        message: `You completed your first trade — ${INVITEE_BONUS_GEMS} bonus gems added to your wallet!`,
        link: '/wallet',
        metadata: { trade_id: tradeId, bonus: INVITEE_BONUS_GEMS },
      });

      // --- Grant the referrer bonus (fresh read to avoid balance race) ---
      const freshReferrer = await base44.asServiceRole.entities.User.get(user.referred_by);
      await base44.asServiceRole.entities.User.update(user.referred_by, {
        gems: (freshReferrer.gems || 0) + REFERRER_BONUS_GEMS,
      });
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.referred_by,
        type: 'trade',
        amount_gems: REFERRER_BONUS_GEMS,
        description: `Referral milestone — ${user.full_name || user.email?.split('@')[0] || 'Your invitee'} completed their first trade`,
        related_id: tradeId,
        counterparty_name: user.full_name || user.email?.split('@')[0] || 'Invitee',
      });
      await createNotification(base44, user.referred_by, {
        type: 'info',
        title: '🎁 Your referral completed their first trade!',
        message: `${user.full_name || user.email?.split('@')[0] || 'Your invitee'} completed their first trade — you earned ${REFERRER_BONUS_GEMS} bonus gems!`,
        link: '/wallet',
        metadata: { trade_id: tradeId, bonus: REFERRER_BONUS_GEMS, invitee_id: party.id },
      });

      granted.push({
        invitee_id: party.id,
        invitee_name: party.name,
        referrer_id: user.referred_by,
        invitee_bonus: INVITEE_BONUS_GEMS,
        referrer_bonus: REFERRER_BONUS_GEMS,
      });
    }

    return Response.json({ granted: granted.length > 0, details: granted });
  } catch (error) {
    console.error('grant-referral-trade-bonus error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}