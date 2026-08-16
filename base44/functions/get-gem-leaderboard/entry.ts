import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    // Service role lets us read all users' gem balances
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const rankings = users
      .filter((u) => typeof u.gems === "number" && u.gems > 0)
      .map((u) => ({
        user_id: u.id,
        // Never fall back to username (which is an email address on this
        // platform) — that would leak PII on the public leaderboard. Use
        // only the OAuth full_name, or a generic anonymous handle.
        name: u.full_name || "Collector",
        gems: u.gems,
      }))
      .sort((a, b) => b.gems - a.gems)
      .slice(0, 5);

    // Annotate the current user's rank if they're outside the top 5
    let myRank = null;
    if (user) {
      const sorted = users
        .filter((u) => typeof u.gems === "number")
        .sort((a, b) => (b.gems || 0) - (a.gems || 0));
      const idx = sorted.findIndex((u) => u.id === user.id);
      if (idx >= 0) myRank = { rank: idx + 1, gems: sorted[idx].gems || 0 };
    }

    return Response.json({ rankings, myRank });
  } catch (error) {
    console.error('get-gem-leaderboard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}