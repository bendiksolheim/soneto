import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Share } from "../share";

vi.mock("@/lib/map/gpx", () => ({
  exportGpx: vi.fn(),
}));

vi.mock("@/lib/map/directions-to-geojson", () => ({
  directionsToGeoJson: vi.fn().mockReturnValue({ type: "FeatureCollection", features: [] }),
}));

describe("Share", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders export and share buttons", () => {
    render(<Share points={[]} directions={[]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("calls exportGpx when export button is clicked", async () => {
    const { exportGpx } = await import("@/lib/map/gpx");
    render(<Share points={[]} directions={[]} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(exportGpx).toHaveBeenCalled();
  });

  it("calls clipboard.writeText when share button is clicked", async () => {
    const points = [
      { latitude: 59.9139, longitude: 10.7522 },
      { latitude: 59.9249, longitude: 10.7632 },
    ];
    render(<Share points={points} directions={[]} />);

    fireEvent.click(screen.getAllByRole("button")[1]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
