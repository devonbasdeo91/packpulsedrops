import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const FB_API = 'https://graph.facebook.com/v25.0';
const INTEGRATION_TYPE = 'facebook_pages';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const content = (body.content || '').toString().slice(0, 2000);
    if (!content.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection(INTEGRATION_TYPE);

    // List managed Pages and grab a Page access token for the first one.
    const acctRes = await fetch(`${FB_API}/me/accounts?fields=id,name,access_token&limit=25`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const acctData = await acctRes.json();
    if (!acctRes.ok) {
      console.error('facebook accounts error', acctData);
      return Response.json({ error: acctData.error?.message || 'Failed to list Facebook Pages' }, { status: 502 });
    }
    const page = (acctData.data || [])[0];
    if (!page) return Response.json({ error: 'No Facebook Page managed by this account' }, { status: 400 });

    // Publish the post to the Page feed.
    const postRes = await fetch(`${FB_API}/${page.id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, access_token: page.access_token }),
    });
    const postData = await postRes.json();
    if (!postRes.ok || !postData.id) {
      console.error('facebook post error', postData);
      return Response.json({ error: postData.error?.message || 'Facebook post failed' }, { status: 502 });
    }

    // Record in the in-app social feed.
    const post = await base44.entities.SocialPost.create({
      content,
      author_name: user.full_name || user.email || 'PackPulseDrops user',
      source: 'facebook',
      stats_snapshot: (body.stats_snapshot || '').toString().slice(0, 2000),
    });

    return Response.json({ success: true, facebook_post_id: postData.id, social_post_id: post.id });
  } catch (error) {
    console.error('post-to-facebook error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}