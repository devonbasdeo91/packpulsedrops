import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const friendId = body.friend_id;
    if (!friendId) return Response.json({ error: 'friend_id required' }, { status: 400 });

    // Validate accepted friendship — only fetch records involving the current user
    const friendships = await base44.asServiceRole.entities.Friendship.filter(
      { $or: [{ requester_id: user.id }, { recipient_id: user.id }] },
      '-created_date', 200
    );
    const isFriend = (friendships || []).some(
      (f) => f.status === 'accepted' &&
        ((f.requester_id === user.id && f.recipient_id === friendId) ||
         (f.recipient_id === user.id && f.requester_id === friendId))
    );
    if (!isFriend) return Response.json({ error: 'Not friends with this user' }, { status: 403 });

    const pulls = await base44.asServiceRole.entities.Pull.filter(
      { created_by_id: friendId }, '-created_date', 200
    );

    return Response.json({ pulls: pulls || [] });
  } catch (error) {
    console.error('get-friend-collection error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}