import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePace } from "./use-pace";
import { setupLocalStorageMock } from "../test/mocks/localStorage";

describe("usePace", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
  });

  it("initializes with default pace (360s)", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.pace).toBe(360);
  });

  it("loads saved pace from localStorage", async () => {
    localStorageMock.getItem.mockReturnValue("420"); // 7 min/km

    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.pace).toBe(420);
  });

  it("saves valid pace to localStorage", async () => {
    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.setPace(300); // 5 min/km
    });

    await waitFor(() => {
      expect(result.current.pace).toBe(300);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "running-pace",
      "300",
    );
  });

  it("rejects pace below minimum (120s)", async () => {
    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    result.current.setPace(60); // Too fast

    // Should not update
    expect(result.current.pace).toBe(360);
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      "running-pace",
      "60",
    );
  });

  it("rejects pace above maximum (720s)", async () => {
    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    result.current.setPace(800); // Too slow

    expect(result.current.pace).toBe(360);
  });

  it("uses default pace when localStorage has invalid data", async () => {
    localStorageMock.getItem.mockReturnValue("invalid");

    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.pace).toBe(360);
  });

  it("handles localStorage errors gracefully", async () => {
    // Silence warnings
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const { result } = renderHook(() => usePace());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    // Should still work with default
    expect(result.current.pace).toBe(360);
  });
});
