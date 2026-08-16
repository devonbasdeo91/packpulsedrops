import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { isInternalCall } from "../../shared/internalAuth.ts";

// SHARED connector (builder's Google account) — logs every accepted P2P trade
// to a single permanent spreadsheet. Fails open: errors are logged but never
// block the trade. The spreadsheet ID is environment-specific (set in the
// dashboard secrets as GOOGLE_SHEETS_TRADE_LOG_ID) so it is never committed.
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_NAME = 'Trades';
const HEADERS = [
  'Timestamp', 'Trade ID', 'Requester Username', 'Recipient Username',
  'Offered Card', 'Category', 'Rarity', 'Value (USD)',
  'Requested Card', 'Category', 'Rarity', 'Value (USD)',
  'Status',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    // Internal-only: called by the Trade Status Tracker workflow after a trade
    // is accepted. External callers can't supply the internal secret.
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const SPREADSHEET_ID = secrets.get("GOOGLE_SHEETS_TRADE_LOG_ID");
    if (!SPREADSHEET_ID) {
      console.error('log-trade-to-sheets: GOOGLE_SHEETS_TRADE_LOG_ID not set');
      return Response.json({ logged: false, reason: 'missing_config' });
    }
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    if (!accessToken) {
      console.error('log-trade-to-sheets: googlesheets not connected');
      return Response.json({ logged: false, reason: 'not_connected' });
    }
    const headers = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const t = body.trade || {};

    // Ensure the "Trades" sheet exists and has a header row (idempotent — only
    // writes headers when A1 is empty, so existing logs are never overwritten).
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
      console.error('log-trade-to-sheets: sheet ensure failed', e.message);
    }

    try {
      const checkRes = await fetch(
        `${SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:M1`,
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
      console.error('log-trade-to-sheets: header ensure failed', e.message);
    }

    const row = [
      new Date().toISOString(),
      t.id || '',
      t.requester_username || t.requester_name || '',
      t.recipient_username || t.recipient_name || '',
      t.offered_card_name || '',
      t.offered_category || '',
      t.offered_rarity || '',
      ((t.offered_value_gems || 0) * 0.0035).toFixed(2),
      t.requested_card_name || '',
      t.requested_category || '',
      t.requested_rarity || '',
      ((t.requested_value_gems || 0) * 0.0035).toFixed(2),
      t.status || 'accepted',
    ];

    const appendRes = await fetch(
      `${SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ values: [row] }),
      }
    );
    const appendJson = await appendRes.json();
    if (appendJson.error) {
      console.error('log-trade-to-sheets append failed', appendJson.error);
      return Response.json({ logged: false, reason: 'append_failed' });
    }
    return Response.json({ logged: true });
  } catch (error) {
    console.error('log-trade-to-sheets error', error);
    return Response.json({ logged: false, error: error.message });
  }
}