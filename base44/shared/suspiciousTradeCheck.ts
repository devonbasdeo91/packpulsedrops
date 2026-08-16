/**
 * Shared fraud-detection logic: analyzes a user's recent accepted Trade
 * activity for patterns that may indicate gem laundering or wash trading
 * ahead of a large withdrawal.
 *
 * Used by both `check-suspicious-trade-activity` (returns the verdict to the
 * workflow) and `escalate-withdrawal-to-agent` (re-runs the analysis so it
 * can include the signals in the admin notification without relying on
 * workflow-to-function data passing).
 */
export async function analyzeSuspiciousActivity(base44, userId: string) {
  if (!userId) return { suspicious: false, risk_score: 0, reasons: [], trade_count_48h: 0, trade_count_24h: 0 };

  const now = Date.now();
  const cutoff48h = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const cutoff24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // The Trade entity has no $or filter in the SDK, so query both sides
  // and combine. Service role bypasses RLS so we see every accepted trade.
  const [asRequester, asRecipient] = await Promise.all([
    base44.asServiceRole.entities.Trade.filter(
      { requester_id: userId, status: "accepted" }, "-created_date", 50
    ),
    base44.asServiceRole.entities.Trade.filter(
      { recipient_id: userId, status: "accepted" }, "-created_date", 50
    ),
  ]);

  // Merge, dedupe, and keep only trades from the last 48 hours.
  const seen = new Set<string>();
  const recent48h = [...(asRequester || []), ...(asRecipient || [])].filter((t) => {
    if (!t.created_date || t.created_date < cutoff48h) return false;
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  const recent24h = recent48h.filter((t) => t.created_date >= cutoff24h);

  const reasons: string[] = [];
  let riskScore = 0;

  // 1. High volume — more than 5 accepted trades in 24h is unusual for a collector
  //    cashing out and can indicate rapid value movement between accounts.
  if (recent24h.length > 5) {
    reasons.push(`${recent24h.length} accepted trades in the last 24 hours (threshold: 5)`);
    riskScore += 30;
  }

  // 2. Value imbalance — user receives far more than they give in a single trade,
  //    a classic gem-laundering signal (moving value from a compromised/burner
  //    account into the withdrawing account).
  for (const t of recent48h) {
    const isRequester = t.requester_id === userId;
    const given = isRequester ? (t.offered_value_gems || 0) : (t.requested_value_gems || 0);
    const received = isRequester ? (t.requested_value_gems || 0) : (t.offered_value_gems || 0);
    if (given > 0 && received > given * 3) {
      const partner = isRequester ? t.recipient_name : t.requester_name;
      reasons.push(
        `Value imbalance with ${partner || "a user"}: received ${received} gems for ${given} gems (${(received / given).toFixed(1)}×)`
      );
      riskScore += 25;
      break; // one instance is enough to flag
    }
  }

  // 3. Wash trading — multiple trades with the same counterparty in 24h,
  //    often used to inflate apparent activity or cycle value.
  const counterpartyCounts: Record<string, number> = {};
  for (const t of recent24h) {
    const cp = t.requester_id === userId ? t.recipient_id : t.requester_id;
    if (!cp) continue;
    counterpartyCounts[cp] = (counterpartyCounts[cp] || 0) + 1;
  }
  for (const [, count] of Object.entries(counterpartyCounts)) {
    if (count > 2) {
      reasons.push(`${count} trades with the same user in 24 hours (possible wash trading)`);
      riskScore += 20;
      break;
    }
  }

  // 4. Rapid clustering — 3+ trades within a 1-hour window suggests automated
  //    or coordinated activity rather than organic collecting.
  if (recent24h.length >= 3) {
    const times = recent24h
      .map((t) => new Date(t.created_date).getTime())
      .sort((a, b) => a - b);
    for (let i = 0; i + 2 < times.length; i++) {
      if (times[i + 2] - times[i] <= 60 * 60 * 1000) {
        reasons.push("3+ trades within a 1-hour window (rapid clustering)");
        riskScore += 15;
        break;
      }
    }
  }

  return {
    suspicious: riskScore >= 25,
    risk_score: riskScore,
    reasons,
    trade_count_48h: recent48h.length,
    trade_count_24h: recent24h.length,
  };
}