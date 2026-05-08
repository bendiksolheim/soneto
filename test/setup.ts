import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

afterEach(() => {
  cleanup();
});
