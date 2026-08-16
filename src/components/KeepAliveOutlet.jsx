import { useEffect, useRef, useState } from "react";
import { useOutlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Tab routes whose views are kept mounted (hidden) so scroll positions and
// form state survive navigation between tabs.
const KEEP_PATHS = new Set(["/", "/dashboard", "/shop", "/marketplace", "/collection", "/wallet"]);

export default function KeepAliveOutlet() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const [kept, setKept] = useState({});
  const scrollPositions = useRef({});

  const isKeepPath = KEEP_PATHS.has(pathname);

  // Cache the outlet element for keep paths on first visit.
  useEffect(() => {
    if (isKeepPath && outlet && !kept[pathname]) {
      setKept((prev) => ({ ...prev, [pathname]: outlet }));
    }
  }, [isKeepPath, outlet, pathname, kept]);

  // Track scroll position for the current path so it can be restored on return.
  useEffect(() => {
    const onSave = () => {
      scrollPositions.current[pathname] = window.scrollY;
    };
    window.addEventListener("scroll", onSave, { passive: true });
    return () => window.removeEventListener("scroll", onSave);
  }, [pathname]);

  // Restore scroll position when returning to a kept tab.
  useEffect(() => {
    if (isKeepPath) {
      const saved = scrollPositions.current[pathname];
      if (saved != null) {
        requestAnimationFrame(() => window.scrollTo(0, saved));
      }
    }
    // Non-kept paths are handled by ScrollToTop.
  }, [pathname, isKeepPath]);

  return (
    <>
      {Object.entries(kept).map(([path, element]) => (
        <motion.div
          key={path}
          initial={{ opacity: 0 }}
          animate={{ opacity: pathname === path ? 1 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ display: pathname === path ? "block" : "none" }}
        >
          {element}
        </motion.div>
      ))}
      <AnimatePresence mode="wait">
        {!isKeepPath && outlet && (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {outlet}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}