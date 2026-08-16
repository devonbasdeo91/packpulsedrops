import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// App-user connector: each user connects their own Google account and logs
// every pack opening / card pull to a spreadsheet in their Drive. Called from
// the Rip page after a successful pull (and with empty pulls from the Account
// page to check connection status). Fails open — a missing connection never
// blocks the pull, it just skips logging.
const CONNECTOR_ID = '6a79492816b0d1c0bc4c2faa';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const HEADERS = ['Timestamp', 'Pack', 'Card', 'Category', 'Rarity', 'Subset', 'Value (USD)', 'Bonus'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve the user's Google connection. No connection → not_connected (not
    // an error): the Account UI shows the Connect button, and pulls just skip.
    let accessToken = '';
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ connected: false, logged: 0 });
    }

    const body = await req.json().catch(() => ({}));
    const pulls = Array.isArray(body.pulls) ? body.pulls : [];
    if (pulls.length === 0) {
      return Response.json({ connected: true, logged: 0, spreadsheetId: user.sheets_log_id || '' });
    }

    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Ensure the user has a log spreadsheet — create one (with header row) on
    // first use and persist its ID on the user so future pulls append to it.
    let spreadsheetId = user.sheets_log_id || '';
    if (!spreadsheetId) {
      const createRes = await fetch(SHEETS_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: { title: 'PackPulseDrops Pull Log' },
          sheets: [{ properties: { title: 'Pulls' } }],
        }),
      });
      const sheet = await createRes.json();
      if (!sheet.spreadsheetId) {
        console.error('log-pull-to-sheets create failed', sheet.error);
        return Response.json({ connected: true, logged: 0, reason: 'create_failed' });
      }
      spreadsheetId = sheet.spreadsheetId;
      try {
        await fetch(`${SHEETS_API}/${spreadsheetId}/values/Pulls!A1:append?valueInputOption=RAW`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ values: [HEADERS] }),
        });
      } catch (e) {
        console.error('log-pull-to-sheets header failed', e);
      }
      try { await base44.auth.updateMe({ sheets_log_id: spreadsheetId }); } catch (e) {
        console.error('log-pull-to-sheets updateMe failed', e);
      }
    }

    // Append one row per pulled card.
    const rows = pulls.map((p) => [
      new Date().toISOString(),
      p.pack_name || '',
      p.name || p.card_name || '',
      p.category || '',
      p.rarity || '',
      p.subset || '',
      ((p.value_gems || 0) * 0.0035).toFixed(2),
      p.bonus ? 'Yes' : 'No',
    ]);
    const appendRes = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/Pulls!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', headers, body: JSON.stringify({ values: rows }) }
    );
    const appendJson = await appendRes.json();
    if (appendJson.error) {
      console.error('log-pull-to-sheets append failed', appendJson.error);
      return Response.json({ connected: true, logged: 0, reason: 'append_failed' });
    }
    return Response.json({ connected: true, logged: rows.length, spreadsheetId });
  } catch (error) {
    console.error('log-pull-to-sheets error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}