import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Public leaderboard — auth is optional (guests can view rankings).
    // Attempt auth so the access context is logged, but don't require it.
    try { await base44.auth.me(); } catch {}

    // Service role bypasses Pull RLS so we can aggregate across ALL collectors
    const pulls = await base44.asServiceRole.entities.Pull.list('-created_date', 5000);
    const packs = await base44.asServiceRole.entities.Pack.list('-created_date', 100);
    const cards = await base44.asServiceRole.entities.Card.list('-created_date', 2000);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);

    // Map pack_id → pack_name, then pack_name → total unique card names (set size)
    const packNameById = {};
    for (const p of packs) packNameById[p.id] = p.name;
    const setTotals = {};
    for (const c of cards) {
      const pname = packNameById[c.pack_id];
      if (!pname) continue;
      if (!setTotals[pname]) setTotals[pname] = new Set();
      setTotals[pname].add(c.name);
    }

    // Map user_id → display name
    const userNameById = {};
    for (const u of users) {
      // Never fall back to username (which is an email address on this
      // platform) — that would leak PII on the public leaderboard. Use
      // only the OAuth full_name, or a generic anonymous handle.
      userNameById[u.id] = u.full_name || 'Collector';
    }

    // Aggregate per collector
    const stats = {};
    for (const pull of pulls) {
      const uid = pull.created_by_id;
      if (!uid) continue;
      if (!stats[uid]) stats[uid] = { vault_value: 0, packs: {}, unique_cards: new Set() };
      stats[uid].vault_value += pull.value_gems || 0;
      stats[uid].unique_cards.add(pull.card_name);
      if (!stats[uid].packs[pull.pack_name]) stats[uid].packs[pull.pack_name] = new Set();
      stats[uid].packs[pull.pack_name].add(pull.card_name);
    }

    // Build rankings — a "completed set" = user has pulled every unique card in a pack
    const rankings = [];
    for (const [uid, s] of Object.entries(stats)) {
      let completed_sets = 0;
      for (const [pname, pulledNames] of Object.entries(s.packs)) {
        const total = setTotals[pname];
        if (total && pulledNames.size >= total.size) completed_sets++;
      }
      rankings.push({
        user_id: uid,
        name: userNameById[uid] || 'Collector',
        vault_value: s.vault_value,
        completed_sets: completed_sets,
        unique_cards: s.unique_cards.size,
      });
    }

    // Primary sort: vault value (the page re-sorts client-side by selected tab)
    rankings.sort((a, b) => b.vault_value - a.vault_value);

    return Response.json({ rankings: rankings.slice(0, 100) });
  } catch (error) {
    console.error('get-collector-leaderboard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}