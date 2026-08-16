import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

export default function About() {
  return (
    <PublicLayout>
      <article className="space-y-6">
        <h1 className="font-heading text-4xl font-bold text-white">About PackPulseDrops</h1>
        <div className="space-y-4 leading-relaxed text-zinc-300">
          <p>
            PackPulseDrops is an all-in-one digital trading card platform that lets collectors rip open virtual booster packs across the world's biggest collectible card games and sports card categories. From Yu-Gi-Oh, Pokémon, Dragon Ball Z, Digimon, Naruto, and Bleach to baseball, basketball, American football, and soccer, every pack tears open one card at a time with weighted rarity pulls — from commons all the way up to ghost rares, autographs, jersey relics, 1/1 Superfractors, and one-of-a-kind Diamond hits.
          </p>
          <p>
            Built for collectors, CCG duelists, and sports card enthusiasts alike, PackPulseDrops turns the thrill of the chase into a seamless digital experience. Users build a personal vault of pulls, track collection value in gems, buy packs with gems or cash, and trade hits on a peer-to-peer marketplace. A built-in wallet handles gem deposits, daily free packs, referral rewards, and cash withdrawals straight to a connected bank account through Stripe.
          </p>
          <p>
            PackPulseDrops is built and maintained by the PackPulseDrops team — a group of collectors and developers obsessed with recreating the adrenaline of ripping a fresh booster pack, minus the foil wrappers. We're constantly adding new categories, packs, and chase cards, and we'd love to hear what you want to see next.
          </p>
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-zinc-300">
            <span className="font-semibold text-white">Support:</span> Questions, billing issues, or partnership ideas? Email us at <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 underline">pulpsepackdrops@gmail.com</a> or use the <Link to="/contact" className="text-amber-300 underline">Contact page</Link>.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="font-heading text-2xl font-bold text-white">Pricing</h2>
          <p className="mt-2 text-sm text-zinc-400">All prices in USD. Digital collectibles only — no physical items are shipped.</p>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-amber-300">Booster packs</h3>
              <p className="mt-1 text-sm text-zinc-300">Individual packs can be ripped starting at $4.99 each via card. One card per pack, with weighted rarity pulls and a chance at a bonus card. Members get one free pack per day.</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">Wallet & marketplace</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-300">
                <li>Add funds to your wallet via Stripe — deposit any amount from $5 to $5,000.</li>
                <li>Marketplace fee: 5% — sellers receive 95% of the sale price.</li>
                <li>List cards for sale at any USD price. Trade peer-to-peer with other collectors.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="font-heading text-2xl font-bold text-white">Frequently asked questions</h2>
          <div className="mt-4 space-y-5">
            <div>
              <h3 className="font-semibold text-amber-300">Are these physical cards? Do you ship anything?</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                No. PackPulseDrops is a <span className="font-semibold text-white">digital-only</span> platform. Every card you pull, buy, or trade is a digital collectible that lives in your in-app vault. We do not print, mail, or ship any physical cards — ever.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">What am I actually buying when I rip a pack?</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                You're purchasing a digital card with a rarity tier, artwork, and a gem value. Cards can be kept in your collection, traded with other users on the marketplace, or sold for gems that you can withdraw as cash to your connected bank account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">Can I get a refund?</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Because packs are opened instantly and the contents are revealed immediately, pack purchases are final and non-refundable. If you experience a technical issue with a transaction, contact us through the Contact page and we'll look into it.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">How do withdrawals work?</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Gems you earn from selling cards can be converted to cash and paid out to your linked bank account via Stripe. See the Wallet page to connect a bank account and request a withdrawal.
              </p>
            </div>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}