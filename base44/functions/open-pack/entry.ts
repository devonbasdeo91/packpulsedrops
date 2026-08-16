import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getTier, GEMS_PER_USD, rollTierValueUsd, usdToGems } from "../../shared/packTiers.ts";
import { resolveCardArt } from "../../shared/cardArt.ts";
import { promoGems } from "../../shared/promo.ts";

const RARITY_WEIGHTS = {
  Common: 55, Base: 55, Rare: 25, 'Short Print': 12, 'Super Rare': 12,
  Refractor: 8, 'Ultra Rare': 6, Auto: 3, 'Secret Rare': 2, Relic: 2,
  'Ghost Rare': 1, '1/1': 1, Diamond: 0.5,
};

// Bonus card weights — favors mid-tier, with extremely small top-tier odds.
// Diamond is 0.1 (vs 0.5 base) so chasing a Diamond bonus is very rare.
const BONUS_RARITY_WEIGHTS = {
  Common: 30, Base: 30, Rare: 25, 'Short Print': 15, 'Super Rare': 15,
  Refractor: 10, 'Ultra Rare': 8, Auto: 4, 'Secret Rare': 2, Relic: 2,
  'Ghost Rare': 0.5, '1/1': 0.3, Diamond: 0.1,
};

function weightOf(r) { return RARITY_WEIGHTS[r] ?? 1; }
function bonusWeightOf(r) { return BONUS_RARITY_WEIGHTS[r] ?? 1; }

function weightedPick(pool, n, weightFn = weightOf) {
  const remaining = [...pool];
  const picked = [];
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const total = remaining.reduce((s, c) => s + weightFn(c.rarity), 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      roll -= weightFn(remaining[j].rarity);
      if (roll <= 0) { idx = j; break; }
    }
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

function dayStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const packId = body.pack_id;
    const method = body.method || 'gems';
    if (!packId) return Response.json({ error: 'Missing pack id' }, { status: 400 });
    if (!['gems', 'free', 'referral', 'credit', 'welcome'].includes(method)) {
      return Response.json({ error: 'Invalid method' }, { status: 400 });
    }

    const pack = await base44.asServiceRole.entities.Pack.get(packId);
    if (!pack) return Response.json({ error: 'Pack not found' }, { status: 404 });

    // Re-read fresh user state (server is source of truth — never trust client balances).
    // Fall back to auth.me() data if the User entity record doesn't exist yet
    // (can happen for newly registered users whose entity hasn't been created).
    let fresh;
    try {
      fresh = await base44.asServiceRole.entities.User.get(user.id);
    } catch {
      fresh = user;
    }
    const gems = fresh.gems || 0;
    const packCredits = fresh.pack_credits || 0;
    const referralCredits = fresh.referral_credits || 0;
    const lastFree = fresh.last_free_pack || '';
    const streak = fresh.streak || 0;

    // Tier is determined by the payment method:
    // - gems: client-supplied tier is trusted because the price is validated
    //   against it (a Diamond pull costs the Diamond price in gems).
    // - credit: the tier is read from the stored pack credit record
    //   ("packId|tier"), NOT the client-supplied body.tier, to prevent tier
    //   escalation (buying a $1 Silver credit and requesting Diamond pulls).
    // - free/referral/welcome: always silver (the cheapest tier) — these are
    //   complimentary credits and should never yield high-tier value ranges.
    let tierKey = body.tier || 'silver';
    let tier = getTier(tierKey);
    const updates = {};
    if (method === 'gems') {
      const price = promoGems(Math.round((tier.price_usd || 1) / GEMS_PER_USD));
      if (gems < price) {
        return Response.json({ error: 'Not enough gems' }, { status: 400 });
      }
      updates.gems = gems - price;
    } else if (method === 'free') {
      if (lastFree === dayStr(0)) {
        return Response.json({ error: 'Free pack already claimed today' }, { status: 400 });
      }
      updates.last_free_pack = dayStr(0);
      updates.streak = lastFree === dayStr(-1) ? streak + 1 : 1;
      tierKey = 'silver';
      tier = getTier(tierKey);
    } else if (method === 'referral') {
      if (referralCredits < 1) {
        return Response.json({ error: 'No referral credits' }, { status: 400 });
      }
      updates.referral_credits = referralCredits - 1;
      tierKey = 'silver';
      tier = getTier(tierKey);
    } else if (method === 'credit') {
      const purchased = Array.isArray(fresh.purchased_packs) ? [...fresh.purchased_packs] : [];
      // Find a credit entry for this pack — supports both old (plain packId)
      // and new (packId|tier) formats. The stored tier is authoritative;
      // the client-supplied body.tier is ignored to prevent escalation.
      let creditIdx = -1;
      let creditTier = 'silver';
      for (let i = 0; i < purchased.length; i++) {
        const entry = purchased[i];
        if (entry === packId) {
          creditIdx = i;
          creditTier = 'silver';
          break;
        }
        if (typeof entry === 'string' && entry.startsWith(packId + '|')) {
          creditIdx = i;
          creditTier = entry.slice(packId.length + 1);
          break;
        }
      }
      if (creditIdx === -1) {
        return Response.json({ error: 'No purchased credit for this pack' }, { status: 400 });
      }
      purchased.splice(creditIdx, 1);
      updates.purchased_packs = purchased;
      tierKey = creditTier;
      tier = getTier(tierKey);
    } else if (method === 'welcome') {
      if (packCredits < 1) {
        return Response.json({ error: 'No welcome pack credits' }, { status: 400 });
      }
      updates.pack_credits = packCredits - 1;
      tierKey = 'silver';
      tier = getTier(tierKey);
    }

    // Card pool for this pack
    const pool = await base44.asServiceRole.entities.Card.filter({ pack_id: packId }, '-created_date', 100);
    if (!pool || pool.length === 0) {
      return Response.json({ error: 'This pack has no cards yet' }, { status: 400 });
    }
    const count = 1;
    const tierWeightOf = (r) => tier.weights[r] ?? 1;
    const picks = weightedPick(pool, count, tierWeightOf);

    // Bonus card: some packs have a chance to drop a second card.
    // The bonus uses a separate weight table with very small top-tier odds.
    const bonusChance = pack.bonus_card_chance || 0;
    let bonusTriggered = false;
    if (bonusChance > 0 && Math.random() < bonusChance) {
      const remaining = pool.filter(c => !picks.some(p => p.id === c.id));
      if (remaining.length > 0) {
        const bonus = weightedPick(remaining, 1, bonusWeightOf);
        if (bonus.length > 0) {
          picks.push(bonus[0]);
          bonusTriggered = true;
        }
      }
    }

    // Ensure every pulled card has artwork BEFORE recording the pull, so each
    // pull carries its art from creation and the vault renders it instantly
    // with no tap and no on-demand generation.
    const picksWithArt = await Promise.all(picks.map(async (c) => {
      let image_url = c.image_url || '';
      if (!image_url) {
        image_url = await resolveCardArt(base44, { cardName: c.name, category: c.category, rarity: c.rarity, card: c });
      }
      // Card value is rolled from the purchased tier's range: 15% chance of
      // the tier max, otherwise a low-biased value (house edge). Capped at
      // the platform-wide $125 ceiling.
      const value_gems = usdToGems(rollTierValueUsd(tier));
      return { ...c, image_url, value_gems };
    }));

    // Re-read fresh user state right before creating pulls — narrows the race
    // window for double-claiming (two concurrent requests both passing the
    // initial eligibility check). If a concurrent request already claimed
    // the free pack, used the referral/welcome credit, or spent the gems,
    // abort before creating pulls so the user can't get duplicate packs.
    {
      const preCheck = await base44.asServiceRole.entities.User.get(user.id);
      if (method === 'free' && (preCheck.last_free_pack || '') === dayStr(0)) {
        return Response.json({ error: 'Free pack already claimed today' }, { status: 400 });
      }
      if (method === 'referral' && (preCheck.referral_credits || 0) < 1) {
        return Response.json({ error: 'No referral credits' }, { status: 400 });
      }
      if (method === 'welcome' && (preCheck.pack_credits || 0) < 1) {
        return Response.json({ error: 'No welcome pack credits' }, { status: 400 });
      }
      if (method === 'gems') {
        const ckPrice = promoGems(Math.round((tier.price_usd || 1) / GEMS_PER_USD));
        if ((preCheck.gems || 0) < ckPrice) {
          return Response.json({ error: 'Not enough gems' }, { status: 400 });
        }
      }
      if (method === 'credit') {
        const fp = Array.isArray(preCheck.purchased_packs) ? preCheck.purchased_packs : [];
        const hasCredit = fp.some(e => e === packId || (typeof e === 'string' && e.startsWith(packId + '|')));
        if (!hasCredit) {
          return Response.json({ error: 'No purchased credit for this pack' }, { status: 400 });
        }
      }
    }

    // Record pulls (user-scoped → created_by_id = the user)
    await base44.entities.Pull.bulkCreate(picksWithArt.map((c) => ({
      card_name: c.name,
      category: c.category,
      rarity: c.rarity,
      value_gems: c.value_gems || 0,
      pack_name: pack.name,
      subset: c.subset || '',
      image_url: c.image_url,
    })));

    // Apply gem/credit deductions server-side — done immediately after pull
    // creation (before the non-critical feed publish) to minimize the race
    // window between the initial fresh read and the deduction.
    // Re-read the fresh user right before writing — the initial read at the
    // top of this function can be stale if a concurrent gem change (daily
    // reward, marketplace sale, pack purchase) landed between that read and
    // this write, which would overwrite that change and lose/gain gems.
    // Fall back to auth.updateMe() if the User entity doesn't exist yet.
    try {
      // Re-read the fresh user right before writing for ALL methods — the
      // initial read at the top can be stale if a concurrent change (daily
      // reward, marketplace sale, another pack open, Stripe webhook) landed
      // between that read and this write, which would overwrite that change.
      const freshUser = await base44.asServiceRole.entities.User.get(user.id);
      if (updates.gems !== undefined) {
        const price = promoGems(Math.round((tier.price_usd || 1) / GEMS_PER_USD));
        if ((freshUser.gems || 0) < price) {
          return Response.json({ error: 'Not enough gems' }, { status: 400 });
        }
        updates.gems = (freshUser.gems || 0) - price;
      }
      if (updates.referral_credits !== undefined) {
        updates.referral_credits = Math.max(0, (freshUser.referral_credits || 0) - 1);
      }
      if (updates.pack_credits !== undefined) {
        updates.pack_credits = Math.max(0, (freshUser.pack_credits || 0) - 1);
      }
      if (updates.purchased_packs !== undefined) {
        // Re-read purchased_packs from the fresh user and splice the credit
        // from the fresh array — prevents overwriting a concurrent webhook
        // pack addition between the initial read and this write.
        const freshPurchased = Array.isArray(freshUser.purchased_packs) ? [...freshUser.purchased_packs] : [];
        for (let i = 0; i < freshPurchased.length; i++) {
          const entry = freshPurchased[i];
          if (entry === packId || (typeof entry === 'string' && entry.startsWith(packId + '|'))) {
            freshPurchased.splice(i, 1);
            break;
          }
        }
        updates.purchased_packs = freshPurchased;
      }
      if (updates.last_free_pack !== undefined) {
        // Re-check: if a concurrent request already claimed today, don't
        // overwrite the streak. Use the fresh last_free_pack to recompute.
        if ((freshUser.last_free_pack || '') === dayStr(0)) {
          delete updates.last_free_pack;
          delete updates.streak;
        } else {
          const lastFreeFresh = freshUser.last_free_pack || '';
          updates.streak = lastFreeFresh === dayStr(-1) ? (freshUser.streak || 0) + 1 : 1;
        }
      }
      await base44.asServiceRole.entities.User.update(user.id, updates);
    } catch {
      await base44.auth.updateMe(updates);
    }

    // Publish the best pull to the public live feed (drives the ticker + leaderboard).
    const best = picks.reduce((b, c) => (!b || (c.value_gems || 0) > (b.value_gems || 0) ? c : b), null);
    if (best) {
      const name = user.full_name || "Collector";
      try {
        await base44.asServiceRole.entities.PullFeedEvent.create({
          card_name: best.name,
          category: best.category,
          rarity: best.rarity,
          pack_name: pack.name,
          value_gems: best.value_gems || 0,
          puller_name: name,
        });
      } catch (e) {
        console.error("pullfeed event error", e);
      }
    }

    return Response.json({
      tier: tierKey,
      picks: picksWithArt.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        rarity: c.rarity,
        value_gems: c.value_gems || 0,
        subset: c.subset || '',
        image_url: c.image_url || '',
      })),
      new_gems: updates.gems !== undefined ? updates.gems : gems,
      new_pack_credits: updates.pack_credits !== undefined ? updates.pack_credits : packCredits,
      new_referral_credits: updates.referral_credits !== undefined ? updates.referral_credits : referralCredits,
      last_free_pack: updates.last_free_pack !== undefined ? updates.last_free_pack : lastFree,
      streak: updates.streak !== undefined ? updates.streak : streak,
      bonus_triggered: bonusTriggered,
    });
  } catch (error) {
    console.error('open-pack error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}