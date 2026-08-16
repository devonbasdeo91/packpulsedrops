import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { generatePackArt } from "../../shared/packArt.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const packId = body.pack_id;
    if (!packId) return Response.json({ error: 'pack_id required' }, { status: 400 });

    const result = await generatePackArt(base44, packId);
    return Response.json({ success: true, generated: result.generated, total: result.total });
  } catch (error) {
    console.error('generate-pack-art error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}