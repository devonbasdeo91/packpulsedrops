import { useCallback } from "react";

/**
 * Haptic feedback hook for mobile touch gestures.
 * Uses the Vibration API where available; silently no-ops on desktop.
 */
export function useHaptics() {
  const vibrate = useCallback((pattern) => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    } catch {
      // no-op — vibration not supported
    }
  }, []);

  return {
    light: useCallback(() => vibrate(10), [vibrate]),
    medium: useCallback(() => vibrate(25), [vibrate]),
    heavy: useCallback(() => vibrate(45), [vibrate]),
    success: useCallback(() => vibrate([10, 30, 10]), [vibrate]),
  };
}