// Lightweight Web Audio synth for the pack-ripping experience.
// No audio assets needed — sounds are generated on the fly.

let ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const MUTE_KEY = "packpulse_sound_muted";

export function isSoundMuted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

// Rarity -> base pitch (Hz). Higher rarity = higher, brighter tone.
const RARITY_PITCH = {
  Common: 220, Base: 220,
  Rare: 277, "Short Print": 277,
  "Super Rare": 330, Refractor: 370,
  "Ultra Rare": 440, Auto: 440,
  "Secret Rare": 554, Relic: 554,
  "Ghost Rare": 660, "1/1": 784,
  Diamond: 880,
};

export function playTearSound() {
  if (isSoundMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.42);
}

export function playRevealSound(rarity) {
  if (isSoundMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const base = RARITY_PITCH[rarity] || 220;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(base, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.52);
  // Sparkle harmonic for high rarities
  if (base >= 440) {
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(base * 2, now + 0.05);
    gain2.gain.setValueAtTime(0.0001, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2).connect(ac.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.62);
  }
}