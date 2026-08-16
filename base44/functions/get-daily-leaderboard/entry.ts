import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Public leaderboard — auth is optional (guests can view rankings).
    // Attempt auth so the access context is logged, but don't require it.
    try { await base44.auth.me(); } catch {}

    // Service role bypasses Pull RLS so we can aggregate across ALL collectors
    const pulls = await base44.asServiceRole.entities.Pull.list('-created_date', 5000);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);

    // Map user_id → display name
    const userNameById = {};
    for (const u of users) {
      // Never fall back to username (which is an email address on this
      // platform) — that would leak PII on the public leaderboard. Use
      // only the OAuth full_name, or a generic anonymous handle.
      userNameById[u.id] = u.full_name || 'Collector';
    }

    // Today's date boundary (UTC) — a daily board resets at midnight UTC
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayKey = todayStart.toISOString().slice(0, 10);

    // Aggregate gems earned today per collector
    const stats = {};
    for (const pull of pulls) {
      const uid = pull.created_by_id;
      if (!uid) continue;
      const pullDate = new Date(pull.created_date);
      if (pullDate < todayStart) continue;
      if (!stats[uid]) stats[uid] = { gems_today: 0, pulls_today: 0, unique_cards: new Set() };
      stats[uid].gems_today += pull.value_gems || 0;
      stats[uid].pulls_today += 1;
      if (pull.card_name) stats[uid].unique_cards.add(pull.card_name);
    }

    const rankings = [];
    for (const [uid, s] of Object.entries(stats)) {
      rankings.push({
        user_id: uid,
        name: userNameById[uid] || 'Collector',
        gems_today: s.gems_today,
        pulls_today: s.pulls_today,
        unique_cards: s.unique_cards.size,
      });
    }

    rankings.sort((a, b) => b.gems_today - a.gems_today);

    return Response.json({ rankings: rankings.slice(0, 100), date: todayKey });
  } catch (error) {
    console.error('get-daily-leaderboard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}