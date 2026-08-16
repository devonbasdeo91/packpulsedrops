import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const pullId = body.pull_id;
    const imageUrl = body.image_url;
    if (!pullId) return Response.json({ error: 'pull_id required' }, { status: 400 });

    // Re-fetch the pull to get full details and the owner
    const pull = await base44.asServiceRole.entities.Pull.get(pullId).catch(() => null);
    if (!pull) return Response.json({ error: 'Pull not found' }, { status: 404 });

    const userId = pull.created_by_id;
    if (!userId) return Response.json({ skipped: true, reason: 'no_user' });

    const cardName = pull.card_name || 'a rare card';
    const rarity = pull.rarity || 'Rare';
    const category = pull.category || '';
    const packName = pull.pack_name || '';

    // Create the promotional SocialPost record
    const content = `🎉 Epic pull! ${cardName} — ${rarity} from ${packName || category}. Share your hit with the community!`;
    const statsSnapshot = [rarity, category, packName].filter(Boolean).join(' | ').slice(0, 2000);

    const post = await base44.asServiceRole.entities.SocialPost.create({
      content,
      author_name: 'PackPulseDrops',
      source: 'community',
      image_url: imageUrl || pull.image_url || '',
      stats_snapshot: statsSnapshot,
    });

    // Send a push notification inviting the user to share
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: userId,
      title: '🎉 Epic pull! Share your hit',
      content: `You pulled a ${rarity} ${cardName}! Share it with the community and show off your collection.`,
      action_label: 'Share',
      action_url: '/collection',
    }).catch((e) => console.error('push notification failed', e));

    return Response.json({ success: true, post_id: post.id });
  } catch (error) {
    console.error('promote-rare-pull error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}