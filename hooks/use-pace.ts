"use client";

import { useSyncExternalStore } from "react";

const PACE_STORAGE_KEY = "running-pace";
const DEFAULT_PACE = 360; // 6 minutes per km in seconds
// Reasonable bounds: 2-12 minutes per km, in seconds
const MIN_PACE = 120;
const MAX_PACE = 720;

// The pace lives in localStorage, read through useSyncExternalStore so the server render
// (and hydration) uses the default and the client picks up the saved value without an
// extra mount-effect render. Listeners are notified on our own writes; the `storage`
// event covers writes from other tabs.
const listeners = new Set<() => void>();
// Holds the pace for this session if localStorage can't be written to.
let unsavedPace: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function isValidPace(pace: number): boolean {
  return pace >= MIN_PACE && pace <= MAX_PACE;
}

function readPace(): number {
  if (unsavedPace !== null) return unsavedPace;
  try {
    const savedPace = Number.parseInt(localStorage.getItem(PACE_STORAGE_KEY) ?? "", 10);
    return isValidPace(savedPace) ? savedPace : DEFAULT_PACE;
  } catch (error) {
    console.warn("Failed to load pace from localStorage:", error);
    return DEFAULT_PACE;
  }
}

function writePace(pace: number): void {
  try {
    localStorage.setItem(PACE_STORAGE_KEY, pace.toString());
    unsavedPace = null;
  } catch (error) {
    console.warn("Failed to save pace to localStorage:", error);
    // Still update the pace for this session even if localStorage fails
    unsavedPace = pace;
  }
  listeners.forEach((listener) => {
    listener();
  });
}

export function usePace() {
  const pace = useSyncExternalStore(subscribe, readPace, () => DEFAULT_PACE);

  const setPace = (newPace: number) => {
    if (isValidPace(newPace)) writePace(newPace);
  };

  return { pace, setPace };
}
