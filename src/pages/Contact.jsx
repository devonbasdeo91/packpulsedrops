import React, { useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { Mail, Instagram, Twitter, Youtube, MessageCircle, Send } from "lucide-react";

const CONTACT_EMAIL = "pulpsepackdrops@gmail.com";
const INP = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`PackPulseDrops contact from ${form.name || "a visitor"}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <PublicLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-4xl font-bold text-white">Contact us</h1>
          <p className="mt-3 text-zinc-400">Questions, partnerships, or pack requests? Reach the PackPulseDrops team below.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${INP} mt-1.5`} placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${INP} mt-1.5`} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Message</label>
              <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={`${INP} mt-1.5`} placeholder="How can we help?" />
            </div>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105">
              <Send className="h-4 w-4" /> Send message
            </button>
            {sent && <p className="text-sm text-emerald-300">Thanks! Your email client should have opened — if not, email us directly at {CONTACT_EMAIL}.</p>}
          </form>

          <div className="space-y-4">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 transition-colors hover:bg-white/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Mail className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold text-white">Email us</p>
                <p className="text-xs text-zinc-400">{CONTACT_EMAIL}</p>
              </div>
            </a>
            <div className="grid grid-cols-2 gap-3">
              <SocialLink icon={Twitter} label="X / Twitter" href="https://twitter.com" />
              <SocialLink icon={Instagram} label="Instagram" href="https://instagram.com" />
              <SocialLink icon={MessageCircle} label="Discord" href="https://discord.com" />
              <SocialLink icon={Youtube} label="YouTube" href="https://youtube.com" />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function SocialLink({ icon: Icon, label, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-sm text-zinc-300 transition-colors hover:bg-white/5">
      <Icon className="h-4 w-4" /> {label}
    </a>
  );
}