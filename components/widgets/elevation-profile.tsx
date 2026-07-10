"use client";

import dynamic from "next/dynamic";
import type React from "react";
import { useState } from "react";
import { calculateElevationGain, findSteepSegments } from "@/lib/elevation/slope";

// recharts is heavy and the chart only renders once a route exists, so keep it
// out of the initial bundle and load it on demand (client-only).
const ElevationChart = dynamic(() => import("./elevation-chart"), { ssr: false });

interface ElevationProfileProps {
  elevationData: Array<{
    distance: number;
    elevation: number;
    coordinate: [number, number];
  }>;
  totalDistance: number;
}

export function ElevationProfile(props: ElevationProfileProps): React.ReactElement {
  const { elevationData } = props;

  const [hoveredIndex, onHover] = useState<number | null>(null);

  const elevationGain = Math.round(calculateElevationGain(elevationData));

  // Format data for the chart
  const chartData = elevationData.map((point) => ({
    distance: Number(point.distance.toFixed(2)),
    elevation: Math.round(point.elevation),
  }));

  // Calculate steep segments for visualization
  const steepSegments = findSteepSegments(elevationData, 6, 0.03);

  if (chartData.length === 0) {
    return <div className="w-full h-full" />;
  }

  // Calculate custom ticks for whole kilometers
  const maxDistance = Math.max(...chartData.map((point) => point.distance));
  const customTicks = [];
  for (let i = 0; i <= Math.ceil(maxDistance); i++) {
    if (i <= maxDistance) {
      customTicks.push(i);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-gray-500 px-1">Stigning: {elevationGain}m</p>
      <ElevationChart
        chartData={chartData}
        steepSegments={steepSegments}
        customTicks={customTicks}
        hoveredIndex={hoveredIndex}
        onHover={onHover}
      />
    </div>
  );
}
