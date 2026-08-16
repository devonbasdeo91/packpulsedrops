import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Sparkles, Save, Trash2, Loader2, ImageIcon, Wand2 } from "lucide-react";
import SelectField from "@/components/admin/SelectField";

const RARITIES = ["Common", "Base", "Rare", "Short Print", "Super Rare", "Refractor", "Ultra Rare", "Auto", "Secret Rare", "Relic", "Ghost Rare", "1/1"];
const CATEGORIES = [
  { k: "yugioh", l: "Yu-Gi-Oh" },
  { k: "pokemon", l: "Pokémon" },
  { k: "dragonball", l: "Dragon Ball Z" },
  { k: "digimon", l: "Digimon" },
  { k: "baseball", l: "Baseball" },
  { k: "basketball", l: "Basketball" },
  { k: "football", l: "Football" },
  { k: "soccer", l: "Soccer" },
  { k: "cricket", l: "Cricket" },
  { k: "tennis", l: "Tennis" },
  { k: "wnba", l: "WNBA" },
  { k: "nhl", l: "NHL" },
  { k: "golf", l: "Golf" },
  { k: "badminton", l: "Badminton" },
  { k: "tabletennis", l: "Table Tennis" },
  { k: "swimming", l: "Swimming" },
  { k: "trackfield", l: "Track & Field" },
  { k: "f1", l: "Formula 1" },
];
const INP = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none";

export default function AdminCards() {
  const [user, setUser] = useState(null);
  const [packs, setPacks] = useState([]);
  const [cards, setCards] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [genUrl, setGenUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ name: "", rarity: "Rare", category: "yugioh", pack_id: "", value_gems: 100, subset: "" });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        base44.entities.Pack.list("-created_date", 50),
        base44.entities.Card.list("-created_date", 100),
      ]);
      setPacks(p);
      setCards(c);
      setForm((f) => (f.pack_id ? f : { ...f, pack_id: p[0]?.id || "" }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function generate() {
    setError("");
    setNotice("");
    if (!prompt.trim()) {
      setError("Enter a prompt.");
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generate-card-art", { prompt: prompt.trim() });
      if (res.data?.error) throw new Error(res.data.error);
      setGenUrl(res.data.url);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveCard() {
    setError("");
    setNotice("");
    if (!genUrl) {
      setError("Generate artwork first.");
      return;
    }
    if (!form.name.trim()) {
      setError("Card name required.");
      return;
    }
    if (!form.pack_id) {
      setError("Select a pack.");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Card.create({
        name: form.name.trim(),
        rarity: form.rarity,
        category: form.category,
        pack_id: form.pack_id,
        value_gems: Number(form.value_gems) || 0,
        subset: form.subset.trim(),
        image_url: genUrl,
      });
      setNotice("Card saved to the database.");
      setGenUrl("");
      setForm((f) => ({ ...f, name: "", subset: "" }));
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeCard(id) {
    setBusy(id);
    try {
      await base44.entities.Card.delete(id);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function syncArt() {
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const res = await base44.functions.invoke("sync-card-art", { limit: 10 });
      if (res.data?.error) throw new Error(res.data.error);
      const d = res.data;
      setNotice(`Synced ${d.synced} card${d.synced === 1 ? "" : "s"}${d.remaining > 0 ? ` · ${d.remaining} still missing — sync again` : ""}.`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        <p className="text-zinc-300">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white">Card Studio</h1>
        <p className="mt-1 text-sm text-zinc-400">Generate card artwork with AI and save cards straight into the database.</p>
      </div>

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="font-heading text-lg font-bold text-white">1. Generate artwork</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. A holographic Blue-Eyes White Dragon roaring, cosmic background, ultra rare foil, trading card art"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate"}
          </button>

          {genUrl && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Preview</p>
              <div className="mt-2 aspect-[2.5/3.5] w-44 overflow-hidden rounded-xl border border-white/10">
                <Image src={genUrl} alt="preview" fittingType="fill" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="font-heading text-lg font-bold text-white">2. Save to database</h2>
          <div className="mt-3 space-y-3">
            <Field label="Card name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INP} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rarity">
                <SelectField
                  value={form.rarity}
                  onValueChange={(v) => setForm({ ...form, rarity: v })}
                  options={RARITIES.map((r) => ({ value: r, label: r }))}
                />
              </Field>
              <Field label="Category">
                <SelectField
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                  options={CATEGORIES.map((c) => ({ value: c.k, label: c.l }))}
                />
              </Field>
            </div>
            <Field label="Pack">
              <SelectField
                value={form.pack_id}
                onValueChange={(v) => setForm({ ...form, pack_id: v })}
                options={packs.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select a pack"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Value (gems)">
                <input type="number" value={form.value_gems} onChange={(e) => setForm({ ...form, value_gems: e.target.value })} className={INP} />
              </Field>
              <Field label="Subset (optional)">
                <input value={form.subset} onChange={(e) => setForm({ ...form, subset: e.target.value })} className={INP} />
              </Field>
            </div>
            <button
              onClick={saveCard}
              disabled={saving || !genUrl}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save card
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold text-white">Cards in database ({cards.length})</h2>
          <button
            onClick={syncArt}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300 transition-transform hover:scale-105 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {syncing ? "Syncing…" : "Sync missing art"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
              <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {c.image_url ? (
                  <Image src={c.image_url} alt={c.name} fittingType="fill" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-white">{c.name}</p>
              <p className="text-xs text-zinc-500">{c.rarity} · {c.value_gems} gems</p>
              <button
                onClick={() => removeCard(c.id)}
                disabled={busy === c.id}
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}