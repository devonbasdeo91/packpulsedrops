import { useRef, useState, useEffect } from "react";

// Reusable pull-to-refresh hook using standard touch listeners.
// Attaches to the window scroll surface; only activates when the page is
// scrolled to the top and the user drags downward past a threshold.
export function usePullToRefresh(onRefresh, { threshold = 70, max = 90 } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };
    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        pullRef.current = Math.min(max, delta * 0.5);
        setPull(pullRef.current);
      }
    };
    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;
      if (pullRef.current >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(threshold);
        pullRef.current = threshold;
        Promise.resolve(cbRef.current?.()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
        });
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, max]);

  return { pull, refreshing };
}