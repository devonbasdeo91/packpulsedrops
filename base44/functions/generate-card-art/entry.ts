import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Allow internal/workflow calls; otherwise require admin
    const internal = await isInternalCall(req, body);
    if (!internal) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prompt = (body.prompt || '').toString().slice(0, 1000);
    if (!prompt.trim()) return Response.json({ error: 'Prompt required' }, { status: 400 });
    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    return Response.json({ url: result.url });
  } catch (error) {
    console.error('generate-card-art error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}