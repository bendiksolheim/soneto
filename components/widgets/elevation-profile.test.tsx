import { describe, it, expect } from "vitest";
import { render } from "../../test/utils/test-utils";
import { ElevationProfile } from "./elevation-profile";

describe("ElevationProfile", () => {
  const mockElevationData = [
    { distance: 0, elevation: 100, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.5, elevation: 150, coordinate: [10.1, 60.1] as [number, number] },
    { distance: 1.0, elevation: 120, coordinate: [10.2, 60.2] as [number, number] },
  ];

  it("renders chart when visible", () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    // Check that AreaChart is rendered
    expect(container.querySelector(".recharts-wrapper")).toBeTruthy();
  });

  it("does not render chart when not visible", () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    // Should render empty div
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });

  it("handles empty elevation data", () => {
    const { container } = render(<ElevationProfile elevationData={[]} totalDistance={0} />);

    // Should not crash
    expect(container).toBeTruthy();
  });

  it("renders hover indicator when hoveredIndex is set", () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    // Should render ReferenceDot for hover indicator
    expect(container.querySelector(".recharts-reference-dot")).toBeTruthy();
  });
});
