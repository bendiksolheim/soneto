import { useEffect, useState } from "react";

// Keeps an element mounted for `durationMs` after `active` goes false so it can fade out,
// and flips `visible` a frame after mount so it can fade in. Drive opacity with `visible`,
// conditional rendering with `mounted`.
export function useFadeTransition(active: boolean, durationMs: number) {
  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(id);
  }, [active, durationMs]);

  return { mounted, visible };
}
