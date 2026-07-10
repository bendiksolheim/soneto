import { useSyncExternalStore } from "react";
import { readFlag, subscribeToFlags } from "@/lib/feature-flags";

// Reads a feature flag reactively. Uses useSyncExternalStore so the value is
// correct on first render (no extra empty render from a mount effect) and stays
// SSR-safe: the server snapshot is always `false`, matching the first client
// paint before localStorage is consulted.
export function useFeatureFlag(key: string): boolean {
  return useSyncExternalStore(
    subscribeToFlags,
    () => readFlag(key),
    () => false,
  );
}
