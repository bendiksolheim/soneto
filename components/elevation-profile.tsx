"use client";

import React from "react";
import { VictoryArea, VictoryChart, VictoryAxis, VictoryTheme } from "victory";

interface ElevationProfileProps {
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  totalDistance: number;
  isVisible: boolean;
}

export function ElevationProfile(props: ElevationProfileProps): JSX.Element {
  const { elevationData, isVisible } = props;

  // Format data for Victory
  const chartData = elevationData.map((point) => ({
    x: Number(point.distance.toFixed(2)),
    y: Math.round(point.elevation),
  }));

  if (!isVisible || chartData.length === 0) {
    return <div className="w-full h-full" />;
  }

  return (
    <VictoryChart theme={VictoryTheme.clean}>
      <VictoryArea data={chartData} />
    </VictoryChart>
  );
}
