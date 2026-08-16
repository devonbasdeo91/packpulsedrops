import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const IG_API = 'https://graph.instagram.com/v25.0';
const INTEGRATION_TYPE = 'instagram';
// Instagram requires media for posts; this branded PackPulseDrops graphic is reused as the post image,
// with the user's stats living in the caption.
const SHARE_IMAGE_URL =
  'https://media.base44.com/images/public/6a7815213ea6e3d52ada68aa/10fd5bb77_generated_image.png';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const content = (body.content || '').toString().slice(0, 2200);
    if (!content.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection(INTEGRATION_TYPE);

    // Resolve the Instagram Business user id.
    const meRes = await fetch(`${IG_API}/me?fields=id,username&access_token=${accessToken}`);
    const meData = await meRes.json();
    if (!meData.id) {
      console.error('instagram me error', meData);
      return Response.json({ error: meData.error?.message || 'Failed to get Instagram user' }, { status: 502 });
    }
    const igUserId = meData.id;

    // Step 1: create the media container.
    const mediaRes = await fetch(`${IG_API}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        image_url: SHARE_IMAGE_URL,
        caption: content,
        access_token: accessToken,
      }).toString(),
    });
    const mediaData = await mediaRes.json();
    if (!mediaData.id) {
      console.error('instagram media error', mediaData);
      return Response.json({ error: mediaData.error?.message || 'Instagram media creation failed' }, { status: 502 });
    }

    // Step 2: wait for the container to finish processing, then publish.
    let status = 'IN_PROGRESS';
    for (let i = 0; i < 12 && status === 'IN_PROGRESS'; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const stRes = await fetch(`${IG_API}/${mediaData.id}?fields=status_code&access_token=${accessToken}`);
      const stData = await stRes.json();
      status = stData.status_code || 'ERROR';
      if (status === 'ERROR') {
        console.error('instagram processing error', stData);
        return Response.json({ error: 'Instagram media processing failed' }, { status: 502 });
      }
    }
    if (status !== 'FINISHED') {
      return Response.json({ error: 'Instagram media timed out while processing', stage: 'processing' }, { status: 504 });
    }

    const pubRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: mediaData.id, access_token: accessToken }).toString(),
    });
    const pubData = await pubRes.json();
    if (!pubData.id) {
      console.error('instagram publish error', pubData);
      return Response.json({ error: pubData.error?.message || 'Instagram publish failed' }, { status: 502 });
    }

    const post = await base44.entities.SocialPost.create({
      content,
      author_name: user.full_name || user.email || 'PackPulseDrops user',
      source: 'instagram',
      stats_snapshot: (body.stats_snapshot || '').toString().slice(0, 2000),
    });

    return Response.json({ success: true, instagram_media_id: pubData.id, social_post_id: post.id });
  } catch (error) {
    console.error('post-to-instagram error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}