import { useCallback, useEffect, useRef } from "react";

type UseWakeLock = {
  request: () => void;
  release: () => void;
};

// Keeps the screen awake via the Screen Wake Lock API (e.g. during a run). The OS
// silently releases the lock when the tab is backgrounded or the screen turns off,
// so while active we re-acquire it whenever the page becomes visible again.
// No-ops gracefully on browsers without support.
export function useWakeLock(): UseWakeLock {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  // Whether the caller currently wants the lock held — drives re-acquisition on
  // visibility changes.
  const active = useRef(false);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      sentinel.current = await navigator.wakeLock.request("screen");
    } catch {
      // Permission/visibility can cause this to throw; nothing actionable to do.
    }
  }, []);

  const request = useCallback(() => {
    active.current = true;
    acquire();
  }, [acquire]);

  const release = useCallback(() => {
    active.current = false;
    sentinel.current?.release().catch(() => {});
    sentinel.current = null;
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (active.current && document.visibilityState === "visible") {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, [acquire]);

  return { request, release };
}
