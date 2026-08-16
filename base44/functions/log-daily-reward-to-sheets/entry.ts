import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { isInternalCall } from "../../shared/internalAuth.ts";

// Logs every daily gem reward to a "Daily Rewards" sheet in the same
// spreadsheet as the trade log (GOOGLE_SHEETS_TRADE_LOG_ID). Fails open:
// errors are logged but never block the reward grant.
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_NAME = 'Daily Rewards';
const HEADERS = ['Timestamp', 'Username', 'User ID', 'Gems Awarded', 'USD Value', 'Streak'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const SPREADSHEET_ID = secrets.get("GOOGLE_SHEETS_TRADE_LOG_ID");
    if (!SPREADSHEET_ID) {
      console.error('log-daily-reward-to-sheets: GOOGLE_SHEETS_TRADE_LOG_ID not set');
      return Response.json({ logged: false, reason: 'missing_config' });
    }
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    if (!accessToken) {
      console.error('log-daily-reward-to-sheets: googlesheets not connected');
      return Response.json({ logged: false, reason: 'not_connected' });
    }
    const headers = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const r = body.reward || {};

    // Ensure the "Daily Rewards" sheet exists
    try {
      const metaRes = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}?fields=sheets.properties.title`, { headers });
      const meta = await metaRes.json();
      const titles = (meta.sheets || []).map((s) => s.properties?.title);
      if (!titles.includes(SHEET_NAME)) {
        await fetch(`${SHEETS_API}/${SPREADSHEET_ID}:batchUpdate`, {
          method: "POST", headers,
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
        });
      }
    } catch (e) {
      console.error('log-daily-reward-to-sheets: sheet ensure failed', e.message);
    }

    // Ensure header row exists
    try {
      const checkRes = await fetch(
        `${SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:F1`,
        { headers }
      );
      const check = await checkRes.json();
      const hasHeader = Array.isArray(check.values) && check.values.length > 0;
      if (!hasHeader) {
        await fetch(`${SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:append?valueInputOption=RAW`, {
          method: "POST", headers,
          body: JSON.stringify({ values: [HEADERS] }),
        });
      }
    } catch (e) {
      console.error('log-daily-reward-to-sheets: header ensure failed', e.message);
    }

    const gems = r.gems || 25;
    const row = [
      new Date().toISOString(),
      r.username || '',
      r.user_id || '',
      gems,
      (gems * 0.0035).toFixed(2),
      r.streak || 1,
    ];

    const appendRes = await fetch(
      `${SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST", headers,
        body: JSON.stringify({ values: [row] }),
      }
    );
    const appendJson = await appendRes.json();
    if (appendJson.error) {
      console.error('log-daily-reward-to-sheets append failed', appendJson.error);
      return Response.json({ logged: false, reason: 'append_failed' });
    }
    return Response.json({ logged: true });
  } catch (error) {
    console.error('log-daily-reward-to-sheets error', error);
    return Response.json({ logged: false, error: error.message });
  }
}