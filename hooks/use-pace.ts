"use client";

import { useState, useEffect } from "react";

const PACE_STORAGE_KEY = "running-pace";
const DEFAULT_PACE = 360; // 6 minutes per km in seconds

export function usePace() {
  const [pace, setPaceState] = useState<number>(DEFAULT_PACE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load pace from localStorage on mount
  useEffect(() => {
    try {
      const savedPace = localStorage.getItem(PACE_STORAGE_KEY);
      if (savedPace) {
        const parsedPace = parseInt(savedPace);
        // Validate the pace is within reasonable bounds (2-12 minutes = 120-720 seconds)
        if (parsedPace >= 120 && parsedPace <= 720) {
          setPaceState(parsedPace);
        }
      }
    } catch (error) {
      console.warn("Failed to load pace from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save pace to localStorage whenever it changes
  const setPace = (newPace: number) => {
    try {
      // Validate the pace is within bounds (2-12 minutes = 120-720 seconds)
      if (newPace >= 120 && newPace <= 720) {
        setPaceState(newPace);
        localStorage.setItem(PACE_STORAGE_KEY, newPace.toString());
      }
    } catch (error) {
      console.warn("Failed to save pace to localStorage:", error);
      // Still update the state even if localStorage fails
      setPaceState(newPace);
    }
  };

  return {
    pace,
    setPace,
    isLoaded, // Can be used to show loading state if needed
  };
}
