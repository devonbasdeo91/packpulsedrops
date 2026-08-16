import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { createNotification } from "../../shared/notifications.ts";

const INCENTIVE_BONUS_GEMS = 100;
const INCENTIVE_WINDOW_HOURS = 48;

function conversationId(a, b) {
  return [a, b].sort().join("_");
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { guest_purchase_id } = body;
    if (!guest_purchase_id) return Response.json({ error: 'guest_purchase_id required' }, { status: 400 });

    // 1. Find the GuestPurchase record.
    const purchase = await base44.asServiceRole.entities.GuestPurchase.get(guest_purchase_id).catch(() => null);
    if (!purchase) return Response.json({ skipped: 'purchase_not_found' });

    // 2. Only proceed if the guest has registered and redeemed their purchase.
    if (purchase.status !== 'redeemed') return Response.json({ skipped: 'not_redeemed' });

    // 3. Find the user account by email.
    const users = await base44.asServiceRole.entities.User.filter({ email: purchase.email }, '-created_date', 5);
    const user = users && users[0];
    if (!user) return Response.json({ skipped: 'no_account' });

    // 4. Check if the user already has an active incentive (don't double-send).
    if (user.challenge_incentive_expires_at) {
      const existing = new Date(user.challenge_incentive_expires_at);
      if (existing > new Date()) return Response.json({ skipped: 'incentive_already_active' });
    }

    // 5. Check if the user has already completed any DailyChallenge.
    const challenges = await base44.asServiceRole.entities.DailyChallenge.filter(
      { created_by_id: user.id }, '-created_date', 10
    );
    if (challenges && challenges.length > 0) return Response.json({ skipped: 'already_completed_challenge' });

    // 6. Find an admin user to be the message sender.
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, 'created_date', 1);
    const admin = admins && admins[0];
    if (!admin) return Response.json({ skipped: 'no_admin_found' });

    // 7. Send the in-app ChatMessage encouraging them to try a challenge.
    const cid = conversationId(admin.id, user.id);
    const content = `Welcome to PackPulseDrops! 🎉 Thanks for your purchase — your cards are now in your vault.\n\nReady for your first daily challenge? Complete any challenge (rip 3 packs, rip 5 packs, or complete a trade) within the next 48 hours and you'll receive a ${INCENTIVE_BONUS_GEMS} gem bonus on top of the regular reward!\n\nHead to your Dashboard to see today's challenges and get started. Good luck! 🍀`;

    await base44.asServiceRole.entities.ChatMessage.create({
      conversation_id: cid,
      sender_id: admin.id,
      sender_name: 'PackPulseDrops',
      recipient_id: user.id,
      content,
      read: false,
    });

    // 8. Create a notification so they see it in the bell icon too.
    try {
      await createNotification(base44, user.id, {
        type: 'info',
        title: 'Bonus Gem Offer! 🎁',
        message: `Complete your first daily challenge within 48 hours and earn ${INCENTIVE_BONUS_GEMS} bonus gems! Tap to view your challenges.`,
        link: '/dashboard',
        metadata: { bonus_gems: INCENTIVE_BONUS_GEMS, expires_in_hours: INCENTIVE_WINDOW_HOURS },
      });
    } catch (e) {
      console.error('check-guest-challenge-incentive: notification failed', e.message);
    }

    // 9. Set the incentive expiry on the user (48 hours from now).
    const expiresAt = new Date(Date.now() + INCENTIVE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.User.update(user.id, { challenge_incentive_expires_at: expiresAt });

    return Response.json({
      sent: true,
      user_id: user.id,
      bonus_gems: INCENTIVE_BONUS_GEMS,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('check-guest-challenge-incentive error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}