import { afterEach, describe, expect, it, vi } from "vitest";
import { exportGpx } from "../gpx";

vi.mock("@dwayneparton/geojson-to-gpx", () => ({
  default: vi.fn().mockReturnValue({ type: "Document" }),
}));

describe("exportGpx", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets download filename and triggers click on the link", () => {
    const mockLink = { download: "", href: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLElement);
    const serializeToString = vi.fn().mockReturnValue("<gpx />");
    vi.stubGlobal(
      "XMLSerializer",
      class {
        serializeToString = serializeToString;
      },
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    exportGpx({ type: "FeatureCollection", features: [] });

    expect(mockLink.download).toBe("route.gpx");
    expect(mockLink.href).toBe("blob:mock");
    expect(mockLink.click).toHaveBeenCalledOnce();
  });

  it("creates a Blob of type text/xml from the serialized GPX", () => {
    const mockLink = { download: "", href: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLElement);
    const serializeToString = vi.fn().mockReturnValue("<gpx>data</gpx>");
    vi.stubGlobal(
      "XMLSerializer",
      class {
        serializeToString = serializeToString;
      },
    );
    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    exportGpx({ type: "FeatureCollection", features: [] });

    expect(serializeToString).toHaveBeenCalled();
    const blob: Blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/xml");
  });

  it("revokes the object URL after the download has started", () => {
    vi.useFakeTimers();
    const mockLink = { download: "", href: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLElement);
    vi.stubGlobal(
      "XMLSerializer",
      class {
        serializeToString = vi.fn().mockReturnValue("<gpx />");
      },
    );
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:mock"),
      revokeObjectURL,
    });

    exportGpx({ type: "FeatureCollection", features: [] });
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    vi.useRealTimers();
  });
});
