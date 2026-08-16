import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

const VIDEO_URL =
  "https://media.base44.com/videos/public/6a7815213ea6e3d52ada68aa/27079e6e8_PackPulseDrops_Intro_Video.mp4";

export default function IntroVideo() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // React's `muted` attribute doesn't reliably set the DOM property, so force
  // it via the ref — otherwise the looping video plays audio constantly.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="pointer-events-none absolute left-0 top-0 flex w-full flex-col items-center p-6 text-center sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300 backdrop-blur-md sm:text-xs">
          Every category · One platform
        </span>
        <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
          Rip packs across <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">20 categories</span>
        </h2>
        <p className="mt-2 max-w-xl text-xs text-zinc-200/90 drop-shadow sm:text-sm">
          From Yu-Gi-Oh and Pokémon to baseball, basketball, soccer, golf, swimming and beyond — chase holographic hits in every sport and CCG.
        </p>
        {muted && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] text-zinc-200 backdrop-blur-md sm:text-xs">
            <Volume2 className="h-3 w-3" /> Tap the speaker icon for sound
          </span>
        )}
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}