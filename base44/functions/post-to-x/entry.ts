import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const TWEET_URL = 'https://api.twitter.com/2/tweets';

function pctEncode(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function hmacSha1(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauth1Header(method, url, extraParams, consumerKey, consumerSecret, token, tokenSecret) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    oauth_token: token,
  };
  const allParams = { ...oauthParams, ...extraParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(allParams[k])}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${pctEncode(url)}&${pctEncode(paramString)}`;
  const signingKey = `${pctEncode(consumerSecret)}&${pctEncode(tokenSecret)}`;
  const signature = await hmacSha1(signingKey, baseString);
  const headerParams = { ...oauthParams, oauth_signature: signature };
  return 'OAuth ' + Object.keys(headerParams).map((k) => `${pctEncode(k)}="${pctEncode(headerParams[k])}"`).join(', ');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const content = (body.content || '').toString().slice(0, 280);
    if (!content.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

    const CK = secrets.get('TWITTER_API_KEY');
    const CS = secrets.get('TWITTER_API_SECRET');
    const AT = secrets.get('TWITTER_ACCESS_TOKEN');
    const ATS = secrets.get('TWITTER_ACCESS_TOKEN_SECRET');
    if (!CK || !CS || !AT || !ATS) {
      return Response.json({ error: 'X credentials not configured' }, { status: 500 });
    }

    const auth = await oauth1Header('POST', TWEET_URL, {}, CK, CS, AT, ATS);
    const res = await fetch(TWEET_URL, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('x post error', data);
      return Response.json({ error: data.detail || data.title || 'X post failed' }, { status: 502 });
    }

    const post = await base44.entities.SocialPost.create({
      content,
      author_name: user.full_name || user.email || 'PackPulseDrops user',
      source: 'x',
      stats_snapshot: (body.stats_snapshot || '').toString().slice(0, 2000),
    });

    return Response.json({ success: true, x_post_id: data.data?.id, social_post_id: post.id });
  } catch (error) {
    console.error('post-to-x error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}