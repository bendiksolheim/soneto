import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteStats } from "../route-stats";

describe("RouteStats", () => {
  it("displays distance formatted to 2 decimal places", () => {
    render(<RouteStats distance={5.5} paceInSeconds={360} />);
    expect(screen.getByText("5.50 km")).toBeTruthy();
  });

  it("calculates and displays correct time", () => {
    // 5 km × 360 s/km = 1800 s = 30 min
    render(<RouteStats distance={5} paceInSeconds={360} />);
    expect(screen.getByText("30 min")).toBeTruthy();
  });

  it("displays 0 km and 0 min for zero distance", () => {
    render(<RouteStats distance={0} paceInSeconds={360} />);
    expect(screen.getByText("0.00 km")).toBeTruthy();
    expect(screen.getByText("0 min")).toBeTruthy();
  });

  it("rounds time to nearest minute", () => {
    // 1 km × 370 s/km = 370 s = 6.17 min → rounds to 6
    render(<RouteStats distance={1} paceInSeconds={370} />);
    expect(screen.getByText("6 min")).toBeTruthy();
  });

  it("displays distance label", () => {
    render(<RouteStats distance={3} paceInSeconds={300} />);
    expect(screen.getByText("Distanse")).toBeTruthy();
  });

  it("displays time label", () => {
    render(<RouteStats distance={3} paceInSeconds={300} />);
    expect(screen.getByText("Tid")).toBeTruthy();
  });
});
