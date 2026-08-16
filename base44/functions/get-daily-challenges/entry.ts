import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function dayStr(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const CHALLENGES = [
  { type: "rip_3_packs", target: 3, gems: 50, label: "Rip 3 packs", desc: "Open any 3 booster packs today." },
  { type: "rip_5_packs", target: 5, gems: 100, label: "Rip 5 packs", desc: "Open any 5 booster packs today." },
  { type: "complete_trade", target: 1, gems: 75, label: "Complete a trade", desc: "Finish 1 P2P trade today." },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const today = dayStr();

    // Return challenges with zero progress for unauthenticated (guest) users
    if (!user) {
      const challenges = CHALLENGES.map((c) => ({
        type: c.type, label: c.label, desc: c.desc, target: c.target,
        progress: 0, gems: c.gems, completed: false, claimed: false,
      }));
      return Response.json({ date: today, challenges });
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Count today's pulls by this user (pack rips)
    const pulls = await base44.entities.Pull.filter({}, '-created_date', 10000);
    const pullCount = pulls.filter((p) => new Date(p.created_date) >= start).length;

    // Count today's accepted trades involving this user
    const trades = await base44.entities.Trade.filter({ status: 'accepted' }, '-updated_date', 10000);
    const tradeCount = trades.filter((t) => {
      const ts = new Date(t.updated_date || t.created_date);
      return ts >= start && (t.requester_id === user.id || t.recipient_id === user.id);
    }).length;

    // Fetch today's claimed challenges
    const claims = await base44.entities.DailyChallenge.filter({ date: today }, '-created_date', 100);
    const claimedToday = new Set(
      claims
        .filter((c) => c.date === today && c.created_by_id === user.id)
        .map((c) => c.challenge_type)
    );

    const progressMap = {
      rip_3_packs: pullCount,
      rip_5_packs: pullCount,
      complete_trade: tradeCount,
    };

    const challenges = CHALLENGES.map((c) => ({
      type: c.type,
      label: c.label,
      desc: c.desc,
      target: c.target,
      progress: Math.min(progressMap[c.type] || 0, c.target),
      gems: c.gems,
      completed: (progressMap[c.type] || 0) >= c.target,
      claimed: claimedToday.has(c.type),
    }));

    return Response.json({ date: today, challenges });
  } catch (error) {
    console.error('get-daily-challenges error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}