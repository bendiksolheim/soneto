import { describe, it, expect } from "vitest";
import { render, waitFor } from "../../test/utils/test-utils";
import { ElevationProfile } from "./elevation-profile";

describe("ElevationProfile", () => {
  const mockElevationData = [
    { distance: 0, elevation: 100, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.5, elevation: 150, coordinate: [10.1, 60.1] as [number, number] },
    { distance: 1.0, elevation: 120, coordinate: [10.2, 60.2] as [number, number] },
  ];

  it("renders chart when visible", async () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    // Wait for AuthProvider to finish loading
    await waitFor(() => {
      expect(container).toBeTruthy();
    });

    // Check that AreaChart is rendered
    expect(container.querySelector(".recharts-wrapper")).toBeTruthy();
  });

  it("handles empty elevation data", async () => {
    const { container } = render(<ElevationProfile elevationData={[]} totalDistance={0} />);

    // Wait for AuthProvider to finish loading
    await waitFor(() => {
      expect(container).toBeTruthy();
    });

    // Should not crash
    expect(container).toBeTruthy();
  });
});
