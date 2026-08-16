import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function dayStr(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const REWARDS = {
  rip_3_packs: 50,
  rip_5_packs: 100,
  complete_trade: 75,
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ error: 'Daily challenge rewards have been disabled. Gems can only be earned by buying or selling.' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch { /* no body */ }
    const challengeType = body.challenge_type;
    if (!challengeType || !REWARDS[challengeType]) {
      return Response.json({ error: 'Invalid challenge type' }, { status: 400 });
    }

    const today = dayStr();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Check not already claimed today — filter by user + date + type so the
    // query stays efficient and correct even with thousands of records (the
    // old unfiltered query loaded only 100 records and could miss the user's
    // own claim, allowing double-claiming).
    const existing = await base44.asServiceRole.entities.DailyChallenge.filter(
      { created_by_id: user.id, date: today, challenge_type: challengeType },
      '-created_date', 1
    );
    const alreadyClaimed = existing && existing.length > 0;
    if (alreadyClaimed) {
      return Response.json({ already_claimed: true, gems_awarded: 0 });
    }

    // Verify completion from source data
    let progress = 0;
    if (challengeType === 'rip_3_packs' || challengeType === 'rip_5_packs') {
      const pulls = await base44.entities.Pull.filter({}, '-created_date', 10000);
      progress = pulls.filter((p) => new Date(p.created_date) >= start).length;
    } else if (challengeType === 'complete_trade') {
      const trades = await base44.entities.Trade.filter({ status: 'accepted' }, '-updated_date', 10000);
      progress = trades.filter((t) => {
        const ts = new Date(t.updated_date || t.created_date);
        return ts >= start && (t.requester_id === user.id || t.recipient_id === user.id);
      }).length;
    }

    const target = challengeType === 'rip_3_packs' ? 3 : challengeType === 'rip_5_packs' ? 5 : 1;
    if (progress < target) {
      return Response.json({ error: 'Challenge not yet complete' }, { status: 400 });
    }

    // Grant gems — re-read the fresh balance right before writing to prevent
    // a TOCTOU race that would overwrite a concurrent deposit.
    const reward = REWARDS[challengeType];
    const fresh = await base44.asServiceRole.entities.User.get(user.id);

    // Check for an active guest-purchase challenge incentive bonus (48h window).
    const INCENTIVE_BONUS = 100;
    let bonusGems = 0;
    let incentiveCleared = false;
    if (fresh.challenge_incentive_expires_at) {
      const expiry = new Date(fresh.challenge_incentive_expires_at);
      if (expiry > new Date()) {
        bonusGems = INCENTIVE_BONUS;
        incentiveCleared = true;
      } else {
        // Expired — clear the stale field so it doesn't linger.
        incentiveCleared = true;
      }
    }

    const totalReward = reward + bonusGems;
    const updateData = { gems: (fresh.gems || 0) + totalReward };
    if (incentiveCleared) updateData.challenge_incentive_expires_at = null;
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Record the claim
    await base44.entities.DailyChallenge.create({
      challenge_type: challengeType,
      date: today,
      gems_awarded: totalReward,
    });

    return Response.json({
      granted: true,
      gems_awarded: totalReward,
      base_reward: reward,
      incentive_bonus: bonusGems,
      gems: (fresh.gems || 0) + totalReward,
    });
  } catch (error) {
    console.error('claim-daily-challenge error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}