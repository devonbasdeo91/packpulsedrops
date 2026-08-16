import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createNotification } from "../../shared/notifications.ts";

const MAX_PACK_USD = 25;
const INVITEE_BONUS_GEMS = 500;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ error: 'Referral bonuses have been disabled. Gems can only be earned by buying or selling.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const refId = body.referral_code;
    if (!refId) return Response.json({ error: 'No referral code' }, { status: 400 });
    // No self-referrals
    if (refId === user.id) return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
    // Validate referrer exists
    let referrer;
    try {
      referrer = await base44.asServiceRole.entities.User.get(refId);
    } catch {
      return Response.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Read fresh user state from the DB (server is source of truth — auth.me()
    // can be stale, causing race conditions that overwrite concurrent balance
    // changes like deposits or rewards credited between the read and the write).
    const freshUser = await base44.asServiceRole.entities.User.get(user.id);
    // Check the fresh DB record — the session token's referred_by may be stale
    // across concurrent requests, allowing the invitee bonus to be granted
    // multiple times. The DB record is the authoritative source.
    if (freshUser.referred_by) return Response.json({ success: true, already: true });
    // Re-read the fresh balance right before writing — narrows the race
    // window where a concurrent gem change between the initial read and
    // this write would be overwritten, losing or duplicating gems.
    const freshInvitee = await base44.asServiceRole.entities.User.get(user.id);
    await base44.asServiceRole.entities.User.update(user.id, {
      referred_by: refId,
      gems: (freshInvitee.gems || 0) + INVITEE_BONUS_GEMS,
    });

    // Reward the referrer with a random pack worth up to $25: pick a random
    // eligible pack and credit it to their purchased_packs so they can rip it
    // for free from the shop.
    const packs = await base44.asServiceRole.entities.Pack.list('-created_date', 200);
    const eligible = packs.filter((p) => (p.price_usd || 0) <= MAX_PACK_USD);
    let rewardPackName = 'a free pack';
    if (eligible.length > 0) {
      const pack = eligible[Math.floor(Math.random() * eligible.length)];
      rewardPackName = pack.name;
      // Read fresh referrer state before updating purchased_packs to avoid
      // overwriting concurrent pack credits (e.g. another referral or purchase).
      const freshReferrer = await base44.asServiceRole.entities.User.get(refId);
      const purchased = Array.isArray(freshReferrer.purchased_packs) ? [...freshReferrer.purchased_packs] : [];
      // Store the pack credit with the silver tier so open-pack uses the
      // correct value range on redemption (referral packs are silver-tier).
      purchased.push(pack.id + '|silver');
      await base44.asServiceRole.entities.User.update(refId, { purchased_packs: purchased });
      await createNotification(base44, refId, {
        type: 'info',
        title: 'Referral reward unlocked! 🎁',
        message: `${user.full_name || user.email?.split('@')[0] || 'A friend'} joined with your link — you earned a free "${pack.name}" pack (${pack.category}). Rip it from the shop!`,
        link: '/shop',
        metadata: { pack_id: pack.id, pack_name: pack.name, reward: 'referral_pack' },
      });
    } else {
      // No eligible packs — fall back to a gem bonus so the referrer isn't empty-handed.
      // Read fresh referrer balance to avoid overwriting concurrent gem changes.
      const freshReferrer = await base44.asServiceRole.entities.User.get(refId);
      await base44.asServiceRole.entities.User.update(refId, {
        gems: (freshReferrer.gems || 0) + 1000,
      });
      await createNotification(base44, refId, {
        type: 'info',
        title: 'Referral reward unlocked! 🎁',
        message: `${user.full_name || user.email?.split('@')[0] || 'A friend'} joined with your link — you earned 1,000 bonus gems!`,
        link: '/shop',
      });
    }

    return Response.json({ success: true, invitee_bonus: INVITEE_BONUS_GEMS, referrer_reward: rewardPackName });
  } catch (error) {
    console.error('apply-referral error', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}