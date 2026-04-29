import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", undefined, "bar", null, false)).toBe("foo bar");
  });

  it("handles conditional class objects", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("merges conflicting Tailwind classes, last one wins", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });
});
