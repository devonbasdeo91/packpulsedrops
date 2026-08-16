import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const RARITY_ORDER = [
  'Common', 'Base', 'Rare', 'Short Print', 'Super Rare', 'Refractor',
  'Ultra Rare', 'Auto', 'Secret Rare', 'Relic', 'Ghost Rare', '1/1', 'Diamond',
];

function ordered(counts) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const rows = RARITY_ORDER
    .filter((r) => counts[r] != null)
    .map((r) => ({ rarity: r, count: counts[r], pct: total ? +(100 * counts[r] / total).toFixed(2) : 0 }));
  for (const r of Object.keys(counts)) {
    if (!RARITY_ORDER.includes(r)) {
      rows.push({ rarity: r, count: counts[r], pct: total ? +(100 * counts[r] / total).toFixed(2) : 0 });
    }
  }
  return rows;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const pulls = await base44.asServiceRole.entities.Pull.list('-created_date', 10000);
    const overall = {};
    const byCat = {};
    for (const p of pulls || []) {
      const r = p.rarity || 'Unknown';
      overall[r] = (overall[r] || 0) + 1;
      const cat = p.category || 'unknown';
      if (!byCat[cat]) byCat[cat] = {};
      byCat[cat][r] = (byCat[cat][r] || 0) + 1;
    }

    const total = Object.values(overall).reduce((s, n) => s + n, 0);
    const categories = Object.keys(byCat)
      .map((cat) => ({ category: cat, total: Object.values(byCat[cat]).reduce((s, n) => s + n, 0), breakdown: ordered(byCat[cat]) }))
      .sort((a, b) => b.total - a.total);

    return Response.json({ total, rarities: ordered(overall), categories });
  } catch (error) {
    console.error('get-pull-rarity-stats error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}