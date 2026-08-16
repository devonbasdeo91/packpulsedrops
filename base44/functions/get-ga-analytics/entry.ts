import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DAY_MS = 86400000;
const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    // Discover the first GA4 property available to this account.
    const adminRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!adminRes.ok) {
      return Response.json({ error: 'GA admin API error: ' + await adminRes.text() }, { status: 502 });
    }
    const adminData = await adminRes.json();
    const property = (adminData.accountSummaries || [])
      .flatMap((a) => a.propertySummaries || [])
      .map((p) => p.property)[0];
    if (!property) {
      return Response.json({ connected: true, property: null, daily: [], sources: [] });
    }

    const startDate = fmt(new Date(Date.now() - 13 * DAY_MS));
    const endDate = fmt(new Date());

    // Daily sessions + users over the last 14 days.
    const dailyRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    });
    const dailyData = dailyRes.ok ? await dailyRes.json() : null;
    const daily = (dailyData?.rows || []).map((r) => ({
      date: r.dimensionValues[0].value,
      sessions: Number(r.metricValues[0].value || 0),
      users: Number(r.metricValues[1].value || 0),
      new_users: Number(r.metricValues[2].value || 0),
    }));

    // Top traffic sources by sessions.
    const srcRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
    });
    const srcData = srcRes.ok ? await srcRes.json() : null;
    const sources = (srcData?.rows || []).map((r) => ({
      source: r.dimensionValues[0].value,
      sessions: Number(r.metricValues[0].value || 0),
      new_users: Number(r.metricValues[1].value || 0),
    }));

    return Response.json({ connected: true, property, daily, sources });
  } catch (error) {
    console.error('get-ga-analytics error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}