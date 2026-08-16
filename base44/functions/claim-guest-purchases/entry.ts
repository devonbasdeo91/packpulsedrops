import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generatePackArt } from "../../shared/packArt.ts";
import { finalizePack } from "../../shared/packFinalize.ts";

// Merges guest purchases (made before the user had an account) into the
// authenticated user's wallet. Called automatically after login/register.
// Idempotent: only claims status=pending records, so safe to call repeatedly.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (user.email || '').toLowerCase().trim();
    if (!email) return Response.json({ claimed: 0, message: 'No email on account' });

    const purchases = await base44.asServiceRole.entities.GuestPurchase.filter({
      email,
      status: 'pending',
    });

    if (!purchases || purchases.length === 0) {
      return Response.json({ claimed: 0, message: 'No guest purchases to claim' });
    }

    // Collect the deltas to apply. We DON'T read or accumulate the full
      // balance here — instead we re-read the fresh balance right before the
      // write (below) and apply only these deltas. This prevents a TOCTOU
      // race where a concurrent deposit between an early read and the final
      // write would be overwritten, losing the user's gems.
      const packsToAdd = [];
      const cardsToAdd = [];
      let gemsToAdd = 0;
      const packsToFinalize = [];
      let claimed = 0;

      for (const purchase of purchases) {
        if (purchase.type === 'pack' && purchase.pack_id) {
          const packTier = purchase.tier || 'silver';
          packsToAdd.push(purchase.pack_id + '|' + packTier);
          packsToFinalize.push({ packId: purchase.pack_id, tier: packTier });
        } else if (purchase.type === 'gems' && purchase.gems > 0) {
          gemsToAdd += purchase.gems;
        } else if (purchase.type === 'card' && purchase.card_id) {
          cardsToAdd.push(purchase.card_id);
        }
        await base44.asServiceRole.entities.GuestPurchase.update(purchase.id, { status: 'redeemed' });
        claimed++;
      }

      // Re-read fresh state right before writing, then apply only the deltas.
      const freshUser = await base44.asServiceRole.entities.User.get(user.id);
      const purchasedPacks = Array.isArray(freshUser.purchased_packs) ? [...freshUser.purchased_packs] : [];
      const purchasedCards = Array.isArray(freshUser.purchased_cards) ? [...freshUser.purchased_cards] : [];
      const gems = (freshUser.gems || 0) + gemsToAdd;
      purchasedPacks.push(...packsToAdd);
      purchasedCards.push(...cardsToAdd);

      await base44.asServiceRole.entities.User.update(user.id, {
        purchased_packs: purchasedPacks,
        purchased_cards: purchasedCards,
        gems,
      });

    // Generate art and finalize packs (marks Ready + sends notification).
    for (const { packId } of packsToFinalize) {
      try {
        await generatePackArt(base44, packId);
        await finalizePack(base44, packId, user.id);
      } catch (e) {
        console.error('claim-guest-purchases: pack finalize failed', packId, e.message);
      }
    }

    console.log('claim-guest-purchases: claimed', claimed, 'purchases for', email,
      '(packs:', packsToFinalize.length, ', gems:', gemsToAdd, ')');

    return Response.json({
      claimed,
      packs: packsToFinalize.length,
      gems_added: gemsToAdd,
    });
  } catch (error) {
    console.error('claim-guest-purchases error', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}