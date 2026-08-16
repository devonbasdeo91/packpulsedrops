import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const username = (body.username || '').trim().toLowerCase();
    const checkOnly = !!body.check_only;

    // Validate as a valid email address (e.g. pulpsepackdrops@gmail.com)
    if (!username || username.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    // Require authentication even for check_only — otherwise unauthenticated users
    // could enumerate valid usernames via the availability check.
    const currentUser = await base44.auth.me();
    if (!currentUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check uniqueness across all users (service role bypasses user-listing restriction)
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    const taken = allUsers.some(
      (u) => u.username && u.username.toLowerCase() === username && u.id !== currentUser.id
    );

    if (taken) {
      return Response.json({ available: false, error: 'That username is already taken' }, { status: 409 });
    }

    if (checkOnly) {
      return Response.json({ available: true });
    }

    // Save the username to the user's profile
    await base44.asServiceRole.entities.User.update(currentUser.id, { username });
    return Response.json({ success: true, username });
  } catch (error) {
    console.error('set-username error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}