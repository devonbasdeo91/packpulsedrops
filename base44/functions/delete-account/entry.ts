import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = user.id;

    // Remove the account record first. If this fails, abort without touching data.
    await base44.asServiceRole.entities.User.delete(uid);

    // Clean up owned content (service role bypasses RLS).
    try { await base44.asServiceRole.entities.Pull.deleteMany({ created_by_id: uid }); } catch (e) { console.error('delete pulls', e); }
    try { await base44.asServiceRole.entities.Listing.deleteMany({ seller_id: uid }); } catch (e) { console.error('delete listings', e); }
    try { await base44.asServiceRole.entities.WithdrawalRequest.deleteMany({ created_by_id: uid }); } catch (e) { console.error('delete withdrawals', e); }
    try { await base44.asServiceRole.entities.Review.deleteMany({ $or: [{ reviewer_id: uid }, { reviewee_id: uid }] }); } catch (e) { console.error('delete reviews', e); }
    try { await base44.asServiceRole.entities.Trade.deleteMany({ $or: [{ requester_id: uid }, { recipient_id: uid }] }); } catch (e) { console.error('delete trades', e); }
    try { await base44.asServiceRole.entities.Friendship.deleteMany({ $or: [{ requester_id: uid }, { recipient_id: uid }] }); } catch (e) { console.error('delete friendships', e); }
    try { await base44.asServiceRole.entities.ChatMessage.deleteMany({ $or: [{ sender_id: uid }, { recipient_id: uid }] }); } catch (e) { console.error('delete chat', e); }
    try { await base44.asServiceRole.entities.Notification.deleteMany({ created_by_id: uid }); } catch (e) { console.error('delete notifications', e); }
    try { await base44.asServiceRole.entities.PackReview.deleteMany({ created_by_id: uid }); } catch (e) { console.error('delete pack reviews', e); }
    try { await base44.asServiceRole.entities.DailyChallenge.deleteMany({ created_by_id: uid }); } catch (e) { console.error('delete challenges', e); }
    try { await base44.asServiceRole.entities.Transaction.deleteMany({ user_id: uid }); } catch (e) { console.error('delete transactions', e); }

    return Response.json({ success: true });
  } catch (error) {
    console.error('delete-account error', error);
    return Response.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}