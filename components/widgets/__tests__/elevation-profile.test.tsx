import type { ComponentProps, ReactNode } from "react";
import type { AreaChart as RealAreaChart, Tooltip as RealTooltip } from "recharts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "../../../test/utils/test-utils";
import { ElevationProfile } from "../elevation-profile";

type AreaChartProps = ComponentProps<typeof RealAreaChart>;
type TooltipProps = ComponentProps<typeof RealTooltip>;
type MoveStateArg = Parameters<NonNullable<AreaChartProps["onMouseMove"]>>[0];
type MoveEventArg = Parameters<NonNullable<AreaChartProps["onMouseMove"]>>[1];
type TooltipContentArg = Parameters<
  Extract<TooltipProps["content"], (...args: never) => unknown>
>[0];

const mockMoveState = vi.hoisted(() => ({
  isTooltipActive: true as boolean,
  activeTooltipIndex: 1 as number | string | undefined,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, onMouseMove, onMouseLeave }: AreaChartProps) => (
    <figure
      data-testid="area-chart"
      onMouseMove={(e) =>
        onMouseMove?.(mockMoveState as unknown as MoveStateArg, e as unknown as MoveEventArg)
      }
      onMouseLeave={(e) =>
        onMouseLeave?.(mockMoveState as unknown as MoveStateArg, e as unknown as MoveEventArg)
      }
    >
      {children}
    </figure>
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({ content }: TooltipProps) => {
    if (typeof content !== "function") return null;
    return (
      <>
        <div data-testid="tooltip-visible">
          {content({
            active: true,
            payload: [{ value: 150 }],
            label: "0.5",
          } as unknown as TooltipContentArg)}
        </div>
        <div data-testid="tooltip-hidden">
          {content({
            active: false,
            payload: [],
            label: "",
          } as unknown as TooltipContentArg)}
        </div>
      </>
    );
  },
  Area: () => null,
  ReferenceArea: ({ x1, x2, fill }: { x1: number; x2: number; fill: string }) => (
    <div data-testid="reference-area" data-x1={x1} data-x2={x2} data-fill={fill} />
  ),
  ReferenceDot: ({ x, y }: { x: number; y: number }) => (
    <div data-testid="reference-dot" data-x={x} data-y={y} />
  ),
}));

describe("ElevationProfile", () => {
  const mockElevationData = [
    { distance: 0, elevation: 100, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.5, elevation: 150, coordinate: [10.1, 60.1] as [number, number] },
    { distance: 1.0, elevation: 120, coordinate: [10.2, 60.2] as [number, number] },
  ];

  // +2m every 0.01 km → 20% slope per interval, total 0.05 km > minLengthKm 0.03
  const steepElevationData = [
    { distance: 0, elevation: 0, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.01, elevation: 2, coordinate: [10.01, 60.01] as [number, number] },
    { distance: 0.02, elevation: 4, coordinate: [10.02, 60.02] as [number, number] },
    { distance: 0.03, elevation: 6, coordinate: [10.03, 60.03] as [number, number] },
    { distance: 0.04, elevation: 8, coordinate: [10.04, 60.04] as [number, number] },
    { distance: 0.05, elevation: 10, coordinate: [10.05, 60.05] as [number, number] },
  ];

  beforeEach(() => {
    mockMoveState.isTooltipActive = true;
    mockMoveState.activeTooltipIndex = 1;
  });

  it("renders chart when visible", async () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="area-chart"]')).toBeTruthy();
    });
  });

  it("handles empty elevation data", async () => {
    const { container } = render(<ElevationProfile elevationData={[]} totalDistance={0} />);

    await waitFor(() => {
      expect(container).toBeTruthy();
    });

    expect(container.querySelector('[data-testid="area-chart"]')).toBeNull();
  });

  it("tooltip shows distance and elevation when active", async () => {
    render(<ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />);

    await waitFor(() => {
      expect(screen.getByText("Distanse: 0.5km")).toBeTruthy();
      expect(screen.getByText("Høyde: 150m")).toBeTruthy();
    });
  });

  it("tooltip wrapper has visibility hidden when not active", async () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    await waitFor(() => {
      const hiddenWrapper = container.querySelector('[data-testid="tooltip-hidden"]');
      const tooltipDiv = hiddenWrapper?.querySelector("div") as HTMLElement;
      expect(tooltipDiv.style.visibility).toBe("hidden");
    });
  });

  it("onMouseMove sets hover state and shows reference dot", async () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    const chart = await waitFor(() => container.querySelector('[data-testid="area-chart"]'));

    fireEvent.mouseMove(chart);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="reference-dot"]')).toBeTruthy();
    });
  });

  it("onMouseMove parses string activeTooltipIndex", async () => {
    mockMoveState.activeTooltipIndex = "2";

    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    const chart = await waitFor(() => container.querySelector('[data-testid="area-chart"]'));

    fireEvent.mouseMove(chart);

    await waitFor(() => {
      const dot = container.querySelector('[data-testid="reference-dot"]');
      expect(dot).toBeTruthy();
      expect(dot?.getAttribute("data-x")).toBe("1");
      expect(dot?.getAttribute("data-y")).toBe("120");
    });
  });

  it("onMouseMove does not set hover when tooltip is inactive", async () => {
    mockMoveState.isTooltipActive = false;

    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    const chart = await waitFor(() => container.querySelector('[data-testid="area-chart"]'));

    fireEvent.mouseMove(chart);

    expect(container.querySelector('[data-testid="reference-dot"]')).toBeNull();
  });

  it("onMouseMove does not set hover when activeTooltipIndex is undefined", async () => {
    mockMoveState.activeTooltipIndex = undefined;

    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    const chart = await waitFor(() => container.querySelector('[data-testid="area-chart"]'));

    fireEvent.mouseMove(chart);

    expect(container.querySelector('[data-testid="reference-dot"]')).toBeNull();
  });

  it("onMouseLeave clears hover state", async () => {
    const { container } = render(
      <ElevationProfile elevationData={mockElevationData} totalDistance={1.0} />,
    );

    const chart = await waitFor(() => container.querySelector('[data-testid="area-chart"]'));

    fireEvent.mouseMove(chart);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="reference-dot"]')).toBeTruthy();
    });

    fireEvent.mouseLeave(chart);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="reference-dot"]')).toBeNull();
    });
  });

  it("renders reference areas for steep elevation segments", async () => {
    const { container } = render(
      <ElevationProfile elevationData={steepElevationData} totalDistance={0.05} />,
    );

    await waitFor(() => {
      const referenceAreas = container.querySelectorAll('[data-testid="reference-area"]');
      expect(referenceAreas.length).toBeGreaterThan(0);
    });
  });
});
