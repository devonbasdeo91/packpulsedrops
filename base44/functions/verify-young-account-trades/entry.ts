import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

const YOUNG_ACCOUNT_DAYS = 30;

/**
 * Young-account withdrawal verifier. Called by the "Young Account Withdrawal
 * Review" workflow when a WithdrawalRequest is created.
 *
 * If the account is 30+ days old, returns { skip: true } so the workflow ends
 * and the existing withdrawal workflows handle it normally.
 *
 * If the account is < 30 days old, gathers the user's trade + pull history and
 * uses an LLM as a verification agent to check for suspicious patterns (wash
 * trading, value imbalance, rapid clustering, pull-to-trade draining). Returns
 * { young_account: true, flagged: bool, reason: string } so the workflow can
 * route: flagged → hold + notify admin, clean → auto-approve.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
    if (!wr) return Response.json({ error: 'Not found' }, { status: 404 });

    // Bail out if another workflow already processed this withdrawal.
    if (wr.status !== 'pending') {
      return Response.json({ skip: true, reason: `already ${wr.status}` });
    }

    const user = await base44.asServiceRole.entities.User.get(wr.created_by_id).catch(() => null);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    // Check account age — skip if 30+ days old (existing workflows handle it).
    const accountAgeDays = (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays >= YOUNG_ACCOUNT_DAYS) {
      return Response.json({ skip: true, young_account: false, account_age_days: Math.round(accountAgeDays) });
    }

    // Young account — gather trade + pull history for the agent to verify.
    const trades = await base44.asServiceRole.entities.Trade.filter(
      { $or: [{ requester_id: user.id }, { recipient_id: user.id }] }, '-created_date', 100
    );
    const pulls = await base44.asServiceRole.entities.Pull.filter(
      { created_by_id: user.id }, '-created_date', 50
    );

    const tradeSummary = (trades || []).map((t) => ({
      status: t.status,
      offered_card: t.offered_card_name,
      offered_value: t.offered_value_gems,
      requested_card: t.requested_card_name,
      requested_value: t.requested_value_gems,
      date: t.created_date,
      partner: t.requester_id === user.id ? t.recipient_name : t.requester_name,
    }));

    const pullSummary = (pulls || []).map((p) => ({
      card: p.card_name,
      rarity: p.rarity,
      value: p.value_gems,
      date: p.created_date,
    }));

    const prompt = `You are a fraud detection agent for PackPulseDrops, a digital trading card platform. A user account less than 30 days old has requested a withdrawal. Your job is to verify their trade history for suspicious patterns and decide whether to hold the withdrawal for manual admin review or allow it to proceed.

User details:
- Account age: ${Math.round(accountAgeDays)} days
- Withdrawal amount: ${wr.amount_gems} gems ($${wr.amount_usd})

Recent trades (${tradeSummary.length} total):
${JSON.stringify(tradeSummary, null, 2)}

Recent pulls (${pullSummary.length} total):
${JSON.stringify(pullSummary, null, 2)}

Analyze the history for these suspicious patterns:
1. Wash trading — trading back and forth with the same partner to inflate activity or transfer value
2. Value imbalance — trading valuable cards for much less valuable ones, draining the account to a specific user
3. Rapid clustering — many trades in a short period, suggesting automated or coordinated manipulation
4. Pull-to-trade draining — pulling cards and immediately trading them to specific accounts
5. No legitimate activity — very few or no pulls/trades despite a withdrawal request, suggesting the gems may have come from deposits rather than platform engagement (not inherently suspicious but worth noting for a young account)

Return your verdict:
- flagged: true if the account should be held for manual review (suspicious patterns found)
- flagged: false if the withdrawal should proceed (activity looks legitimate)
- reason: a brief explanation of your decision (1-2 sentences)`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          flagged: { type: "boolean" },
          reason: { type: "string" },
        },
        required: ["flagged", "reason"],
      },
    });

    return Response.json({
      young_account: true,
      account_age_days: Math.round(accountAgeDays),
      flagged: result.flagged === true,
      reason: result.reason || 'No reason provided',
      trade_count: tradeSummary.length,
      pull_count: pullSummary.length,
    });
  } catch (error) {
    console.error('verify-young-account-trades error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}