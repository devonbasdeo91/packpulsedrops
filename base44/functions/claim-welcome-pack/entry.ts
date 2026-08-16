import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Free rewards disabled — gems/packs can only be earned by buying or selling.
    return Response.json({ error: 'Welcome packs have been disabled. Gems can only be earned by buying or selling.' }, { status: 403 });
  } catch (error) {
    console.error('claim-welcome-pack error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}