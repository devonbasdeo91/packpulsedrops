import React, { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

// Welcome sound for app open: a pack-tear rip flows into an uplifting rising
// chime arpeggio with a warm pad underneath — the "rip a pack, feel the pull"
// energy that invites users to stay and explore. Uses the Web Audio API so
// no audio file is needed. Plays once per session, on first interaction
// (browsers block raw autoplay). A mute button appears while it plays.
export default function WelcomeMusic() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem("welcomeMusicPlayed")) return;

    let endTimeout = null;

    const playWelcome = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      sessionStorage.setItem("welcomeMusicPlayed", "1");

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        const now = ctx.currentTime;
        const duration = 10;

        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.9, now + 0.05);
        master.connect(ctx.destination);
        masterRef.current = master;

        // --- Phase 1: the pack tear (0–0.4s) ---
        const tear = ctx.createOscillator();
        const tearGain = ctx.createGain();
        tear.type = "sawtooth";
        tear.frequency.setValueAtTime(420, now);
        tear.frequency.exponentialRampToValueAtTime(90, now + 0.35);
        tearGain.gain.setValueAtTime(0.0001, now);
        tearGain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        tearGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        tear.connect(tearGain).connect(master);
        tear.start(now);
        tear.stop(now + 0.42);

        // --- Phase 2: uplifting rising chime arpeggio (from 0.45s) ---
        // A bright major-7 arpeggio climbing upward — feels like revealing
        // a great pull and pulls the user forward into the app.
        const arpNotes = [261.63, 329.63, 392.0, 493.88, 587.33, 783.99]; // C E G B D G5
        arpNotes.forEach((freq, i) => {
          const t = now + 0.45 + i * 0.18;
          // main chime
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          osc.connect(g).connect(master);
          osc.start(t);
          osc.stop(t + 0.62);
          // sparkle harmonic on top notes
          if (freq >= 493.88) {
            const sp = ctx.createOscillator();
            const spg = ctx.createGain();
            sp.type = "sine";
            sp.frequency.setValueAtTime(freq * 2, t + 0.04);
            spg.gain.setValueAtTime(0.0001, t + 0.04);
            spg.gain.exponentialRampToValueAtTime(0.06, t + 0.07);
            spg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
            sp.connect(spg).connect(master);
            sp.start(t + 0.04);
            sp.stop(t + 0.72);
          }
        });

        // --- Phase 3: warm inviting pad underneath (1.5s–10s) ---
        // Sustains the "stay and explore" mood after the chimes settle.
        const padGain = ctx.createGain();
        padGain.gain.setValueAtTime(0, now + 1.5);
        padGain.gain.linearRampToValueAtTime(0.08, now + 2.8);
        padGain.gain.setValueAtTime(0.08, now + duration - 2.5);
        padGain.gain.linearRampToValueAtTime(0, now + duration);
        padGain.connect(master);
        // Warm Cmaj9 voicing
        const padNotes = [130.81, 196.0, 246.94, 293.66, 392.0];
        padNotes.forEach((freq) => {
          const o1 = ctx.createOscillator();
          const o2 = ctx.createOscillator();
          o1.type = "sine";
          o2.type = "triangle";
          o1.frequency.value = freq;
          o2.frequency.value = freq * 1.006;
          o1.connect(padGain);
          o2.connect(padGain);
          o1.start(now + 1.5);
          o2.start(now + 1.5);
          o1.stop(now + duration);
          o2.stop(now + duration);
        });

        // Master fade-out at the end
        master.gain.setValueAtTime(0.9, now + duration - 1.5);
        master.gain.linearRampToValueAtTime(0, now + duration);

        setPlaying(true);
        endTimeout = setTimeout(() => {
          setPlaying(false);
          ctx.close().catch(() => {});
        }, duration * 1000 + 300);
      } catch {
        setPlaying(false);
      }
    };

    const events = ["click", "touchstart", "keydown"];
    const handler = () => {
      playWelcome();
      events.forEach((e) => document.removeEventListener(e, handler));
    };
    events.forEach((e) => document.addEventListener(e, handler, { once: true, passive: true }));

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      if (endTimeout) clearTimeout(endTimeout);
      if (ctxRef.current) ctxRef.current.close().catch(() => {});
    };
  }, []);

  const mute = () => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.25);
      } catch { /* already closed */ }
    }
    setPlaying(false);
  };

  if (!playing) return null;

  return (
    <button
      onClick={mute}
      className="fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-zinc-900/80 text-amber-300 backdrop-blur transition-colors hover:bg-zinc-800/90 lg:bottom-4"
      aria-label="Mute welcome sound"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}