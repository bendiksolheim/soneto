import { describe, expect, it } from "vitest";
import type { Directions } from "@/lib/mapbox";
import { mergeDirections } from "../mapUtils";

function makeDirections(coords: Array<[number, number]>): Directions {
  return {
    routes: [{ geometry: { coordinates: coords } }],
  } as Directions;
}

describe("mergeDirections", () => {
  it("returns empty array when given no directions", () => {
    expect(mergeDirections([])).toEqual([]);
  });

  it("returns coordinates of a single direction unchanged", () => {
    const coords: Array<[number, number]> = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    expect(mergeDirections([makeDirections(coords)])).toEqual(coords);
  });

  it("merges two directions, removing the duplicate junction point", () => {
    const first = makeDirections([
      [1, 2],
      [3, 4],
    ]);
    const second = makeDirections([
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    expect(mergeDirections([first, second])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
  });

  it("merges three directions correctly", () => {
    const a = makeDirections([
      [0, 0],
      [1, 1],
    ]);
    const b = makeDirections([
      [1, 1],
      [2, 2],
    ]);
    const c = makeDirections([
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
    expect(mergeDirections([a, b, c])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });
});
