import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';

/**
 * Targeted heal: checks a single pull and retries art generation if
 * the image is still missing. Called by the "Missing Art Retry" workflow
 * after a 2-hour durable wait — gives the original generation time to
 * complete before retrying.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const pullId = body.pull_id;
    if (!pullId) return Response.json({ error: 'pull_id required' }, { status: 400 });

    const pull = await base44.asServiceRole.entities.Pull.get(pullId).catch(() => null);
    if (!pull) return Response.json({ skipped: true, reason: 'pull not found' });

    if (pull.image_url) {
      return Response.json({ skipped: true, reason: 'art already exists' });
    }

    await base44.functions.invoke('ensure-card-art', { pull_id: pullId });
    return Response.json({ fixed: true, pull_id: pullId });
  } catch (error) {
    console.error('heal-missing-art error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}