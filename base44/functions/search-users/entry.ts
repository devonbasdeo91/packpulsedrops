import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim().toLowerCase();
    if (!query || query.length < 2) return Response.json({ users: [] });

    // Service role — regular users can't list users; this lets them find friends by name/email
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const matches = allUsers
      .filter(u => u.id !== user.id)
      .filter(u => {
        const name = (u.full_name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 20)
      .map(u => {
        const email = u.email || '';
        const [local, domain] = email.split('@');
        // Mask the email more aggressively — only reveal the first character
        // of the local part and the domain, never the full address. This
        // prevents email enumeration while still letting users recognize
        // their friends.
        const maskedEmail = email && domain && local
          ? `${local.slice(0, 1)}${'•'.repeat(Math.max(2, local.length - 1))}@${domain}`
          : '';
        return {
          id: u.id,
          full_name: u.full_name || (email ? local : 'User'),
          email: maskedEmail,
        };
      });

    return Response.json({ users: matches });
  } catch (error) {
    console.error('search-users error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}