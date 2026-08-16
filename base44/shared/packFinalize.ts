// Shared logic for finalizing a pack after artwork generation:
// marks the pack Ready and emails the buyer.
// Used by the finalize-pack function and the Stripe webhook fulfillment path.

export async function finalizePack(base44, packId, userId) {
  const pack = await base44.asServiceRole.entities.Pack.get(packId).catch(() => null);
  const wasReady = pack && pack.status === 'Ready';
  if (pack) {
    await base44.asServiceRole.entities.Pack.update(packId, { status: 'Ready' });
  }

  // Only email on the Ready transition — prevents duplicate "pack ready" emails
  // when both the Stripe webhook and the Pack Checkout Fulfillment workflow
  // call finalizePack for the same payment.
  if (userId && pack && !wasReady) {
    const user = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
    if (user && user.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Your pack is ready!',
        body:
          `Your booster pack${pack ? ' "' + pack.name + '"' : ''} has been unlocked and all card artwork is ready.\n\n` +
          `Head to PackPulseDrops to start ripping!`,
      });
    }
  }

  return { success: true };
}