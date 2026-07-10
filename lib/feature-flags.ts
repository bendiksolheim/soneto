// Poor man's feature toggle system, backed by localStorage.
// Flags are stored as the strings "true"/"false" under their key, and default
// to off when missing or unreadable. Toggle them on the /toggle page.

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
}

export const FEATURE_FLAGS: Array<FeatureFlag> = [
  {
    key: "show-run-button",
    label: "Run button",
    description: "Show the Run button that enters run mode",
  },
];

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();

// Subscribe to flag changes. Fires for both same-tab writes (via writeFlag) and
// cross-tab writes (via the storage event), so useSyncExternalStore stays in sync.
export function subscribeToFlags(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
    // localStorage writes don't fire "storage" in the same tab, so notify manually.
    for (const listener of listeners) {
      listener();
    }
  } catch (error) {
    console.warn("Failed to write feature flag to localStorage:", error);
  }
}
