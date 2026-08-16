import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";

const ROTATE_MS = 1800;

/**
 * A small circular avatar that cycles through the generated character/person
 * art of the cards inside a pack. Used on the home screen so each featured pack
 * shows a live, rotating preview of the characters you can pull.
 */
export default function PackCharacterAvatar({ packId, category }) {
  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;
    base44.entities.Card.filter({ pack_id: packId }, "-created_date", 12)
      .then((cards) => {
        if (!active) return;
        const urls = (cards || [])
          .map((c) => c.image_url)
          .filter(Boolean);
        setImages(urls);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [packId]);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-10 h-12 w-12 overflow-hidden rounded-full border-2 border-amber-300/70 bg-zinc-900 shadow-lg shadow-black/50">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="h-full w-full"
        >
          <Image
            src={images[idx]}
            alt=""
            fittingType="fill"
            loading="eager"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}