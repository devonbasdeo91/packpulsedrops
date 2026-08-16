/**
 * Shared helper for creating in-app notifications for a specific user.
 * Runs under the service role so it can write to any user's notification list.
 * Fails silently (logged) so a notification error never blocks the parent flow.
 */
export async function createNotification(base44, userId, { type, title, message, link, metadata }) {
  try {
    if (!userId) return;
    await base44.asServiceRole.entities.Notification.create({
      created_by_id: userId,
      type: type || 'info',
      title: title || '',
      message: message || '',
      read: false,
      link: link || '',
      metadata: metadata ? JSON.stringify(metadata).slice(0, 1000) : '',
    });
  } catch (e) {
    console.error('createNotification failed', e.message);
  }
}