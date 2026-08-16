import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DAY_MS = 86400000;
const GEM_TO_USD = 0.0035;

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

    const trades = await base44.asServiceRole.entities.Trade.list('-updated_date', 10000);

    const cutoff = Date.now() - 30 * DAY_MS;
    const daily = {};
    const byCategory = {};

    let totalTrades = 0;
    let totalValueGems = 0;

    for (const t of trades) {
      if (t.status !== 'accepted') continue;
      const ts = new Date(t.updated_date || t.created_date).getTime();
      if (ts < cutoff) continue;

      totalTrades += 1;
      const offeredGems = t.offered_value_gems || 0;
      const requestedGems = t.requested_value_gems || 0;
      const valueGems = offeredGems + requestedGems;
      totalValueGems += valueGems;

      const k = dayKey(t.updated_date || t.created_date);
      if (!daily[k]) daily[k] = { trades: 0, value_gems: 0 };
      daily[k].trades += 1;
      daily[k].value_gems += valueGems;

      // Attribute to both the offered and requested card categories
      const cats = [t.offered_category, t.requested_category].filter(Boolean);
      const uniqueCats = [...new Set(cats)];
      for (const cat of uniqueCats) {
        if (!byCategory[cat]) byCategory[cat] = { trades: 0, value_gems: 0 };
        byCategory[cat].trades += 1;
        // Split value evenly across the categories involved
        byCategory[cat].value_gems += Math.round(valueGems / uniqueCats.length);
      }
    }

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const k = dayKey(d);
      const e = daily[k] || { trades: 0, value_gems: 0 };
      days.push({
        date: k,
        trades: e.trades,
        value_gems: e.value_gems,
        value_usd: Math.round(e.value_gems * GEM_TO_USD * 100) / 100,
      });
    }

    const categories = Object.entries(byCategory)
      .map(([category, v]) => ({
        category,
        trades: v.trades,
        value_gems: v.value_gems,
        value_usd: Math.round(v.value_gems * GEM_TO_USD * 100) / 100,
      }))
      .sort((a, b) => b.trades - a.trades);

    return Response.json({
      total_trades_30d: totalTrades,
      total_value_gems_30d: totalValueGems,
      total_value_usd_30d: Math.round(totalValueGems * GEM_TO_USD * 100) / 100,
      daily: days,
      by_category: categories,
    });
  } catch (error) {
    console.error('get-trade-analytics error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}