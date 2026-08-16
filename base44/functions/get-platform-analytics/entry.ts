import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';

const DAY_MS = 86400000;

function dayKey(d) {
  const dt = new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build pack lookup by name: { price_gems, cards_per_pack }
    const packs = await base44.asServiceRole.entities.Pack.list('-created_date', 500);
    const packMap = {};
    for (const p of packs) {
      packMap[p.name] = { price_gems: p.price_gems || 0, cards_per_pack: p.cards_per_pack || 5 };
    }

    // Aggregate pulls (newest 10000 — plenty for a young platform)
    const pulls = await base44.asServiceRole.entities.Pull.list('-created_date', 10000);

    let totalPacks = 0;
    let totalGems = 0;
    let todayPacks = 0;
    let todayGems = 0;
    const todayKey = dayKey(new Date());
    const daily = {};

    for (const pull of pulls) {
      const pm = packMap[pull.pack_name] || { price_gems: 0, cards_per_pack: 5 };
      const cpp = pm.cards_per_pack || 5;
      const perPullGems = (pm.price_gems || 0) / cpp;
      const packFraction = 1 / cpp;
      totalPacks += packFraction;
      totalGems += perPullGems;
      const k = dayKey(pull.created_date);
      if (!daily[k]) daily[k] = { packs: 0, gems: 0 };
      daily[k].packs += packFraction;
      daily[k].gems += perPullGems;
      if (k === todayKey) {
        todayPacks += packFraction;
        todayGems += perPullGems;
      }
    }

    // Last 14 days series
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const k = dayKey(d);
      const e = daily[k] || { packs: 0, gems: 0 };
      days.push({ date: k, packs: Math.round(e.packs * 10) / 10, gems: Math.round(e.gems) });
    }

    // Signups over time (last 14 days)
    const users = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    const signupsDaily = {};
    for (const u of users) {
      const k = dayKey(u.created_date);
      signupsDaily[k] = (signupsDaily[k] || 0) + 1;
    }
    const signupDays = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const k = dayKey(d);
      signupDays.push({ date: k, signups: signupsDaily[k] || 0 });
    }

    // Most popular packs by pull count
    const packCounts = {};
    for (const pull of pulls) {
      const name = pull.pack_name || 'Unknown';
      if (!packCounts[name]) packCounts[name] = { name, pulls: 0, gems: 0, category: pull.category || '' };
      packCounts[name].pulls += 1;
      const pm = packMap[name] || { price_gems: 0, cards_per_pack: 5 };
      packCounts[name].gems += (pm.price_gems || 0) / (pm.cards_per_pack || 5);
    }
    const popularPacks = Object.values(packCounts)
      .sort((a, b) => b.pulls - a.pulls)
      .slice(0, 8)
      .map((p) => ({ ...p, gems: Math.round(p.gems) }));

    // Revenue from Stripe: sum net (amount - refunds) of all paid charges
    const stripe = getStripeClient();
    let revenueCents = 0;
    let txCount = 0;
    const recent = [];
    let lastCharge = null;
    let firstPage = true;
    for (let i = 0; i < 50; i++) {
      const params = { limit: 100 };
      if (lastCharge) params.starting_after = lastCharge;
      const res = await stripe.charges.list(params);
      for (const ch of res.data) {
        if (ch.paid) {
          const net = ch.amount - (ch.amount_refunded || 0);
          revenueCents += net;
          if (net > 0) txCount++;
          if (firstPage && recent.length < 10 && net > 0) {
            recent.push({
              id: ch.id,
              amount_usd: net / 100,
              created: new Date(ch.created * 1000).toISOString(),
              description: ch.description || (ch.metadata && ch.metadata.gems ? ch.metadata.gems + ' gems' : 'Pack purchase'),
            });
          }
        }
      }
      firstPage = false;
      if (!res.has_more) break;
      lastCharge = res.data[res.data.length - 1].id;
    }

    return Response.json({
      total_packs_opened: Math.round(totalPacks),
      total_gems_spent: Math.round(totalGems),
      today_packs_opened: Math.round(todayPacks),
      today_gems_spent: Math.round(todayGems),
      revenue_usd: revenueCents / 100,
      transaction_count: txCount,
      daily: days,
      total_users: users.length,
      signups_daily: signupDays,
      popular_packs: popularPacks,
      recent,
    });
  } catch (error) {
    console.error('get-platform-analytics error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}