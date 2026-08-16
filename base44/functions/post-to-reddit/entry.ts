import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const content = (body.content || '').toString();
    if (!content.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

    const CID = secrets.get('REDDIT_CLIENT_ID');
    const CSEC = secrets.get('REDDIT_CLIENT_SECRET');
    const UN = secrets.get('REDDIT_USERNAME');
    const PW = secrets.get('REDDIT_PASSWORD');
    const SUB = secrets.get('REDDIT_SUBREDDIT');
    if (!CID || !CSEC || !UN || !PW || !SUB) {
      return Response.json({ error: 'Reddit credentials not configured' }, { status: 500 });
    }
    const userAgent = `PackPulseDrops/1.0 by ${UN}`;

    // 1. Obtain an access token via the password grant (script-type app).
    const tokRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${CID}:${CSEC}`),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: new URLSearchParams({ grant_type: 'password', username: UN, password: PW }).toString(),
    });
    const tok = await tokRes.json();
    if (!tok.access_token) {
      console.error('reddit token error', tok);
      return Response.json({ error: tok.error || 'Reddit auth failed' }, { status: 502 });
    }

    // 2. Submit a text (self) post to the configured subreddit.
    const title = content.split('\n')[0].slice(0, 300) || 'PackPulseDrops share';
    const submitRes = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: new URLSearchParams({ kind: 'self', sr: SUB, title, text: content }).toString(),
    });
    const submit = await submitRes.json();
    const errors = submit?.json?.errors || [];
    if (errors.length) {
      console.error('reddit submit error', submit);
      return Response.json({ error: errors.map((e) => e.join(' ')).join('; ') || 'Reddit post failed' }, { status: 502 });
    }

    const post = await base44.entities.SocialPost.create({
      content,
      author_name: user.full_name || user.email || 'PackPulseDrops user',
      source: 'reddit',
      stats_snapshot: (body.stats_snapshot || '').toString().slice(0, 2000),
    });

    return Response.json({ success: true, social_post_id: post.id });
  } catch (error) {
    console.error('post-to-reddit error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}