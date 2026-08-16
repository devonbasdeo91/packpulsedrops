import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { finalizePack } from "../../shared/packFinalize.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const packId = body.pack_id;
    const userId = body.user_id;
    if (!packId) return Response.json({ error: 'pack_id required' }, { status: 400 });

    await finalizePack(base44, packId, userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('finalize-pack error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}