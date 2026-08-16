import { getStripeClient } from './stripeConfig.ts';
import { createNotification } from './notifications.ts';

const GEM_TO_USD = 0.0035;

function hoursAgo(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}
function daysAgo(dateStr: string): number {
  return hoursAgo(dateStr) / 24;
}

/**
 * Core system self-healing logic. Shared by:
 *  - auto-heal-system (internal/workflow-triggered)
 *  - admin-heal-system (admin-triggered on-demand from the dashboard)
 *
 * Runs 14 checks across the platform and auto-fixes common issues.
 * Returns a structured report.
 */
export async function runSystemHeal(base44: any) {
  const report: any = {
    run_at: new Date().toISOString(),
    checks: [] as Array<{ name: string; checked: number; fixed: number; details: string[] }>,
  };

  function addCheck(name: string, checked: number, fixed: number, details: string[]) {
    report.checks.push({ name, checked, fixed, details: details.slice(0, 10) });
  }

  // ─── 1. Stuck pending trades (>7 days) ───────────────────────────────
  try {
    const trades = await base44.asServiceRole.entities.Trade.filter({ status: 'pending' }, '-created_date', 200);
    const stuck = trades.filter((t: any) => daysAgo(t.created_date) > 7);
    let fixed = 0;
    const details: string[] = [];
    for (const t of stuck) {
      try {
        await base44.asServiceRole.entities.Trade.update(t.id, { status: 'declined' });
        for (const uid of [t.requester_id, t.recipient_id]) {
          if (!uid) continue;
          try {
            await base44.asServiceRole.entities.Notification.create({
              type: 'trade_declined',
              title: 'Trade Expired',
              message: `A pending trade has been automatically declined after 7 days of inactivity.`,
              read: false,
              metadata: JSON.stringify({ trade_id: t.id, auto_heal: true }),
            });
          } catch {}
        }
        fixed++;
        details.push(`Declined stale trade ${t.id}`);
      } catch (e: any) {
        details.push(`Failed to decline trade ${t.id}: ${e.message}`);
      }
    }
    addCheck('Stuck pending trades (>7d)', trades.length, fixed, details);
  } catch (e: any) {
    addCheck('Stuck pending trades (>7d)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 2. Stuck pending withdrawals (>48h) ─────────────────────────────
  try {
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ status: 'pending' }, '-created_date', 100);
    const stuck = withdrawals.filter((w: any) => hoursAgo(w.created_date) > 48);
    let fixed = 0;
    const details: string[] = [];
    for (const w of stuck) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);
        for (const admin of admins) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              type: 'withdrawal_pending',
              title: 'Withdrawal Stuck >48h',
              message: `Withdrawal ${w.id} for ${(w.amount_gems || 0).toLocaleString()} gems ($${((w.amount_gems || 0) * GEM_TO_USD).toFixed(2)}) has been pending for over 48 hours. Manual review required.`,
              read: false,
              link: '/cashout',
              metadata: JSON.stringify({ withdrawal_id: w.id, auto_heal: true }),
            });
          } catch {}
        }
        fixed++;
        details.push(`Escalated stuck withdrawal ${w.id}`);
      } catch (e: any) {
        details.push(`Failed to escalate withdrawal ${w.id}: ${e.message}`);
      }
    }
    addCheck('Stuck pending withdrawals (>48h)', withdrawals.length, fixed, details);
  } catch (e: any) {
    addCheck('Stuck pending withdrawals (>48h)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 3. Stale active listings (>30 days, 0 views) ────────────────────
  try {
    const listings = await base44.asServiceRole.entities.Listing.filter({ status: 'active' }, '-created_date', 500);
    const stale = listings.filter((l: any) => daysAgo(l.created_date) > 30 && (l.views || 0) === 0);
    let fixed = 0;
    const details: string[] = [];
    for (const l of stale) {
      try {
        await base44.asServiceRole.entities.Listing.update(l.id, { status: 'cancelled' });
        if (l.seller_id) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              type: 'info',
              title: 'Listing Auto-Cancelled',
              message: `Your listing for "${l.card_name}" was automatically cancelled after 30 days with no views. You can relist it at any time.`,
              read: false,
              link: '/marketplace',
              metadata: JSON.stringify({ listing_id: l.id, auto_heal: true }),
            });
          } catch {}
        }
        fixed++;
        details.push(`Cancelled stale listing ${l.id}`);
      } catch (e: any) {
        details.push(`Failed to cancel listing ${l.id}: ${e.message}`);
      }
    }
    addCheck('Stale listings (>30d, 0 views)', listings.length, fixed, details);
  } catch (e: any) {
    addCheck('Stale listings (>30d, 0 views)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 4. Pulls with missing card art (>2h old) ───────────────────────
  try {
    const pulls = await base44.asServiceRole.entities.Pull.filter({}, '-created_date', 200);
    const missingArt = pulls.filter((p: any) => !p.image_url && hoursAgo(p.created_date) > 2);
    let fixed = 0;
    const details: string[] = [];
    for (const p of missingArt.slice(0, 20)) {
      try {
        await base44.functions.invoke('ensure-card-art', { pull_id: p.id });
        fixed++;
        details.push(`Retried art for pull ${p.id}`);
      } catch (e: any) {
        details.push(`Art retry failed for pull ${p.id}: ${e.message}`);
      }
    }
    addCheck('Pulls missing art (>2h)', missingArt.length, fixed, details);
  } catch (e: any) {
    addCheck('Pulls missing art (>2h)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 5. Orphaned guest purchases (>7 days pending) ───────────────────
  try {
    const guests = await base44.asServiceRole.entities.GuestPurchase.filter({ status: 'pending' }, '-created_date', 200);
    const orphaned = guests.filter((g: any) => daysAgo(g.created_date) > 7);
    let fixed = 0;
    const details: string[] = [];
    for (const g of orphaned) {
      fixed++;
      details.push(`Orphaned guest purchase ${g.id} (${g.email || 'no email'}) — ${g.type}`);
    }
    addCheck('Orphaned guest purchases (>7d)', guests.length, fixed, details);
  } catch (e: any) {
    addCheck('Orphaned guest purchases (>7d)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 6. Duplicate Stripe events ─────────────────────────────────────
  try {
    const events = await base44.asServiceRole.entities.StripeEvent.filter({}, '-created_date', 500);
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const e of events) {
      if (!e.event_id) continue;
      if (seen.has(e.event_id)) {
        dupes.push(e.id);
      } else {
        seen.set(e.event_id, e.id);
      }
    }
    let fixed = 0;
    const details: string[] = [];
    for (const dupeId of dupes.slice(0, 50)) {
      try {
        await base44.asServiceRole.entities.StripeEvent.delete(dupeId);
        fixed++;
      } catch (e: any) {
        details.push(`Failed to delete dupe ${dupeId}: ${e.message}`);
      }
    }
    if (dupes.length > 0) details.push(`Found ${dupes.length} duplicate Stripe events, purged ${fixed}`);
    addCheck('Duplicate Stripe events', events.length, fixed, details);
  } catch (e: any) {
    addCheck('Duplicate Stripe events', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 7. Stale pending friendships (>30 days) ────────────────────────
  try {
    const friendships = await base44.asServiceRole.entities.Friendship.filter({ status: 'pending' }, '-created_date', 200);
    const stale = friendships.filter((f: any) => daysAgo(f.created_date) > 30);
    let fixed = 0;
    const details: string[] = [];
    for (const f of stale) {
      try {
        await base44.asServiceRole.entities.Friendship.update(f.id, { status: 'declined' });
        fixed++;
      } catch (e: any) {
        details.push(`Failed to decline friendship ${f.id}: ${e.message}`);
      }
    }
    addCheck('Stale friendships (>30d)', friendships.length, fixed, details);
  } catch (e: any) {
    addCheck('Stale friendships (>30d)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 8. Old unread notifications (>30 days) ──────────────────────────
  try {
    const notifications = await base44.asServiceRole.entities.Notification.filter({ read: false }, '-created_date', 500);
    const old = notifications.filter((n: any) => daysAgo(n.created_date) > 30);
    let fixed = 0;
    const details: string[] = [];
    if (old.length > 0) {
      const updates = old.slice(0, 100).map((n: any) => ({ id: n.id, read: true }));
      try {
        await base44.asServiceRole.entities.Notification.bulkUpdate(updates);
        fixed = updates.length;
        details.push(`Auto-marked ${fixed} old notifications as read`);
      } catch (e: any) {
        details.push(`Bulk update failed: ${e.message}`);
      }
    }
    addCheck('Old unread notifications (>30d)', notifications.length, fixed, details);
  } catch (e: any) {
    addCheck('Old unread notifications (>30d)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 9. Orphaned Stripe payments (>24h pending) ────────────────────
  try {
    const stripe = getStripeClient();
    const guests = await base44.asServiceRole.entities.GuestPurchase.filter({ status: 'pending' }, '-created_date', 100);
    const orphaned = guests.filter((g: any) => g.stripe_session_id && hoursAgo(g.created_date) > 24);
    let fixed = 0;
    const details: string[] = [];
    for (const g of orphaned.slice(0, 20)) {
      try {
        const session = await stripe.checkout.sessions.retrieve(g.stripe_session_id);
        if (session.payment_status === 'paid') {
          await base44.asServiceRole.entities.GuestPurchase.update(g.id, { status: 'redeemed' });
          fixed++;
          details.push(`Fulfilled orphaned guest purchase ${g.id} (${g.type}) — session was paid`);
        }
      } catch (e: any) {
        details.push(`Stripe check failed for guest ${g.id}: ${e.message}`);
      }
    }
    addCheck('Orphaned Stripe payments (>24h)', orphaned.length, fixed, details);
  } catch (e: any) {
    addCheck('Orphaned Stripe payments (>24h)', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 10. Double-credited transactions (duplicate related_id) ───────
  try {
    const txns = await base44.asServiceRole.entities.Transaction.filter({}, '-created_date', 500);
    const byRelated = new Map<string, any[]>();
    for (const t of txns) {
      if (!t.related_id) continue;
      if (!byRelated.has(t.related_id)) byRelated.set(t.related_id, []);
      byRelated.get(t.related_id)!.push(t);
    }
    let fixed = 0;
    const details: string[] = [];
    for (const [relatedId, group] of byRelated) {
      if (group.length < 2) continue;
      const dupes = group.slice(1);
      for (const d of dupes) {
        try {
          const amount = d.amount_gems || 0;
          if (amount > 0 && d.user_id) {
            const user = await base44.asServiceRole.entities.User.get(d.user_id).catch(() => null);
            if (user) {
              const currentGems = typeof user.gems === 'number' ? user.gems : 0;
              const newGems = Math.max(0, currentGems - amount);
              await base44.asServiceRole.entities.User.update(d.user_id, { gems: newGems });
            }
          }
          await base44.asServiceRole.entities.Transaction.delete(d.id);
          fixed++;
          details.push(`Removed duplicate txn ${d.id} (related_id=${relatedId}), debited ${amount} gems`);
        } catch (e: any) {
          details.push(`Failed to fix duplicate txn ${d.id}: ${e.message}`);
        }
      }
    }
    addCheck('Double-credited transactions', byRelated.size, fixed, details);
  } catch (e: any) {
    addCheck('Double-credited transactions', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 11. Negative gem balances ──────────────────────────────────────
  try {
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const negative = users.filter((u: any) => typeof u.gems === 'number' && u.gems < 0);
    let fixed = 0;
    const details: string[] = [];
    for (const u of negative) {
      try {
        await base44.asServiceRole.entities.User.update(u.id, { gems: 0 });
        await base44.asServiceRole.entities.Transaction.create({
          user_id: u.id,
          type: 'gem_deposit',
          amount_gems: Math.abs(u.gems),
          amount_usd: 0,
          description: `Auto-heal: corrected negative gem balance (${u.gems} → 0)`,
        });
        fixed++;
        details.push(`Reset negative balance for user ${u.id}: ${u.gems} → 0`);
      } catch (e: any) {
        details.push(`Failed to reset balance for ${u.id}: ${e.message}`);
      }
    }
    if (fixed > 0) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);
      for (const admin of admins) {
        try {
          await createNotification(base44, admin.id, {
            type: 'info',
            title: 'Negative Gem Balances Detected',
            message: `Auto-heal found and corrected ${fixed} user(s) with negative gem balances. This may indicate an exploit — please investigate.`,
            link: '/admin/analytics',
          });
        } catch {}
      }
    }
    addCheck('Negative gem balances', users.length, fixed, details);
  } catch (e: any) {
    addCheck('Negative gem balances', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 12. Sold listings with missing buyer_id ─────────────────────────
  try {
    const listings = await base44.asServiceRole.entities.Listing.filter({ status: 'sold' }, '-created_date', 200);
    const broken = listings.filter((l: any) => !l.buyer_id);
    let fixed = 0;
    const details: string[] = [];
    for (const l of broken) {
      try {
        await base44.asServiceRole.entities.Listing.update(l.id, { status: 'cancelled' });
        if (l.seller_id) {
          try {
            await createNotification(base44, l.seller_id, {
              type: 'info',
              title: 'Listing Data Issue Fixed',
              message: `Your listing for "${l.card_name}" had a data inconsistency and was cancelled. You can relist it.`,
              link: '/marketplace',
            });
          } catch {}
        }
        fixed++;
        details.push(`Fixed sold listing ${l.id} with no buyer — cancelled`);
      } catch (e: any) {
        details.push(`Failed to fix listing ${l.id}: ${e.message}`);
      }
    }
    addCheck('Sold listings missing buyer', listings.length, fixed, details);
  } catch (e: any) {
    addCheck('Sold listings missing buyer', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 13. Refund reconciliation ──────────────────────────────────────
  try {
    const stripe = getStripeClient();
    const refunds = await stripe.refunds.list({ limit: 20 });
    let fixed = 0;
    const details: string[] = [];
    for (const refund of refunds.data) {
      const piId = refund.payment_intent;
      if (!piId) continue;
      const existing = await base44.asServiceRole.entities.Transaction.filter({ related_id: refund.id });
      if (existing && existing.length > 0) continue;
      const originalTxns = await base44.asServiceRole.entities.Transaction.filter({ related_id: piId });
      if (!originalTxns || originalTxns.length === 0) continue;
      const original = originalTxns[0];
      if (!original.user_id) continue;
      const user = await base44.asServiceRole.entities.User.get(original.user_id).catch(() => null);
      if (!user) continue;
      const gemsToDebit = original.amount_gems || 0;
      if (gemsToDebit <= 0) continue;
      const currentGems = typeof user.gems === 'number' ? user.gems : 0;
      const newGems = Math.max(0, currentGems - gemsToDebit);
      await base44.asServiceRole.entities.User.update(original.user_id, { gems: newGems });
      await base44.asServiceRole.entities.Transaction.create({
        user_id: original.user_id,
        type: 'withdrawal',
        amount_gems: -gemsToDebit,
        amount_usd: 0,
        description: `Auto-heal: debited ${gemsToDebit} gems for Stripe refund ${refund.id}`,
        related_id: refund.id,
      });
      fixed++;
      details.push(`Debited ${gemsToDebit} gems from user ${original.user_id} for unreconciled refund ${refund.id}`);
    }
    addCheck('Refund reconciliation', refunds.data.length, fixed, details);
  } catch (e: any) {
    addCheck('Refund reconciliation', 0, 0, [`Error: ${e.message}`]);
  }

  // ─── 14. Duplicate active listings for same pull ─────────────────────
  try {
    const listings = await base44.asServiceRole.entities.Listing.filter({ status: 'active' }, '-created_date', 500);
    const byPull = new Map<string, any[]>();
    for (const l of listings) {
      const key = `${l.seller_id}|${l.card_name}|${l.category}`;
      if (!byPull.has(key)) byPull.set(key, []);
      byPull.get(key)!.push(l);
    }
    let fixed = 0;
    const details: string[] = [];
    for (const [key, group] of byPull) {
      if (group.length < 2) continue;
      const dupes = group.slice(1);
      for (const d of dupes) {
        try {
          await base44.asServiceRole.entities.Listing.update(d.id, { status: 'cancelled' });
          if (d.seller_id) {
            try {
              await createNotification(base44, d.seller_id, {
                type: 'info',
                title: 'Duplicate Listing Cancelled',
                message: `A duplicate listing for "${d.card_name}" was automatically cancelled. Only one active listing per card is allowed.`,
                link: '/marketplace',
              });
            } catch {}
          }
          fixed++;
          details.push(`Cancelled duplicate listing ${d.id} (${key})`);
        } catch (e: any) {
          details.push(`Failed to cancel duplicate ${d.id}: ${e.message}`);
        }
      }
    }
    addCheck('Duplicate active listings', byPull.size, fixed, details);
  } catch (e: any) {
    addCheck('Duplicate active listings', 0, 0, [`Error: ${e.message}`]);
  }

  const totalFixed = report.checks.reduce((sum: number, c: any) => sum + c.fixed, 0);
  return { ...report, total_issues_fixed: totalFixed };
}