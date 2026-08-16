import React from "react";
import { Link } from "react-router-dom";
import { Mail, Tag, Store, Banknote, Info } from "lucide-react";

const SUPPORT_EMAIL = "pulpsepackdrops@gmail.com";

export default function BusinessInfoBanner() {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
          <Info className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold text-white">PackPulseDrops — Business information</h2>
          <p className="mt-1 text-sm text-zinc-400">
            PackPulseDrops is a digital trading card platform. We sell <span className="font-semibold text-zinc-200">digital collectibles only</span> —
            virtual booster packs, gems, and peer-to-peer marketplace listings. No physical cards or items are ever shipped.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Yu-Gi-Oh", "Pokémon", "Dragon Ball Z", "Digimon", "Naruto", "Bleach", "Baseball", "Basketball", "Football", "Soccer", "Cricket", "Tennis", "WNBA", "NHL", "Golf", "Badminton", "Table Tennis", "Swimming", "Track & Field", "Formula 1"].map((cat) => (
          <span key={cat} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">{cat}</span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={Store} title="Booster packs" lines={["From $1.00 per pack via card", "1 card per pack + bonus chance", "Weighted rarity pulls", "Daily free pack for members"]} />
        <InfoTile icon={Tag} title="Pricing" lines={["All prices in USD", "Pay per pack with card", "No subscriptions or credits", "Digital collectibles only"]} />
        <InfoTile icon={Banknote} title="Marketplace" lines={["5% marketplace fee", "Sellers keep 95% of sale", "List cards for USD", "Trade peer-to-peer"]} />
        <InfoTile icon={Mail} title="Support" lines={[SUPPORT_EMAIL, "Billing, packs & account help"]} />
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Full details on the <Link to="/about" className="text-amber-300 hover:underline">About</Link> and{" "}
        <Link to="/wallet" className="text-amber-300 hover:underline">Wallet</Link> pages. See our{" "}
        <Link to="/terms" className="text-amber-300 hover:underline">Terms</Link>,{" "}
        <Link to="/privacy" className="text-amber-300 hover:underline">Privacy</Link>, and{" "}
        <Link to="/refund" className="text-amber-300 hover:underline">Refund</Link> policies.
      </p>
    </section>
  );
}

function InfoTile({ icon: Icon, title, lines }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-300" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{title}</h3>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-zinc-400">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}