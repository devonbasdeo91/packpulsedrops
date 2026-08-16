import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function Refund() {
  return (
    <PublicLayout>
      <article className="space-y-6">
        <h1 className="font-heading text-4xl font-bold text-white">Refund Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: August 9, 2026</p>
        <div className="space-y-5 leading-relaxed text-zinc-300">
          <p>
            PackPulseDrops sells <span className="font-semibold text-white">digital goods only</span> — virtual gems, digital booster packs, and digital trading cards. Because digital goods are delivered and revealed instantly, this Refund Policy is intentionally strict.
          </p>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">1. Packs and gems are non-refundable</h2>
            <p className="mt-2">
              When you open a pack, its contents are immediately revealed and added to your vault. Because the value of those contents is known at the moment of opening, <span className="font-semibold text-white">all pack purchases and gem purchases are final and non-refundable</span>, except where required by applicable law.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">2. Marketplace sales</h2>
            <p className="mt-2">
              Purchases of digital cards from other users on the marketplace are final once the card is transferred to your collection. Sellers receive their gem payout (minus the 5% marketplace fee) and the transaction cannot be reversed through PackPulseDrops.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">3. Withdrawals</h2>
            <p className="mt-2">
              Gems converted to cash and paid out to your bank account are processed through Stripe and cannot be reversed once the payout is sent. Pending withdrawal requests may be cancelled before they are approved; contact us promptly if you need to cancel.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">4. Technical failures</h2>
            <p className="mt-2">
              If a payment is charged but a pack is not delivered due to a technical error on our side, contact us through the Contact page with your transaction details and we will investigate and, where appropriate, credit the pack or refund the charge.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">5. Chargebacks</h2>
            <p className="mt-2">
              Initiating a chargeback or payment dispute for a delivered digital good may result in your account being suspended and any associated gems, cards, or pending withdrawals being held. Please contact us first — we will work to resolve legitimate issues directly.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">6. Statutory rights</h2>
            <p className="mt-2">
              Nothing in this policy removes any statutory consumer rights you may have under applicable law in your country or region.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">7. Contact</h2>
            <p className="mt-2">Questions about a charge or this policy? Email us at <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 underline">pulpsepackdrops@gmail.com</a> or through the Contact page.</p>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}