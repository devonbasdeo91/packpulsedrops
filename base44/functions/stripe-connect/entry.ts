import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const stripe = getStripeClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'onboard';
    const origin = new URL(req.url).origin;
    let accountId = user.stripe_account_id;

    if (action === 'onboard') {
      if (!accountId) {
        const acct = await stripe.accounts.create({
          type: 'express',
          email: user.email,
          capabilities: { transfers: { requested: true } },
          metadata: { base44_user_id: user.id, base44_app_id: Deno.env.get('BASE44_APP_ID') },
        });
        accountId = acct.id;
        await base44.auth.updateMe({ stripe_account_id: accountId });
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: origin + '/wallet?stripe=done',
        refresh_url: origin + '/wallet?stripe=refresh',
      });
      return Response.json({ url: link.url });
    }

    if (action === 'dashboard') {
      if (!accountId) return Response.json({ error: 'No connected account' }, { status: 400 });
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_dashboard',
        return_url: origin + '/wallet?stripe=done',
        refresh_url: origin + '/wallet?stripe=refresh',
      });
      return Response.json({ url: link.url });
    }

    if (action === 'status') {
      if (!accountId) return Response.json({ connected: false });
      const acct = await stripe.accounts.retrieve(accountId);
      const ext = ((acct.external_accounts && acct.external_accounts.data) || []).find((a) => a.default_for_currency);
      return Response.json({
        connected: true,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
        bank_name: ext ? ext.bank_name : null,
        bank_last4: ext ? ext.last4 : null,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('stripe-connect error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}