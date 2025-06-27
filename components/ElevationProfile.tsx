"use client";

import React from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

interface ElevationProfileProps {
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  totalDistance: number;
  isVisible: boolean;
}

export function ElevationProfile(props: ElevationProfileProps): JSX.Element {
  const { elevationData, totalDistance, isVisible } = props;
  if (!isVisible || elevationData.length === 0) {
    return null;
  }

  // Format data for the chart
  const chartData = elevationData.map((point) => ({
    distance: Number(point.distance.toFixed(2)),
    elevation: Math.round(point.elevation),
  }));

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Høydeprofil</h3>
      </div>

      <AreaChart data={chartData} width={348} height={128}>
        <XAxis
          dataKey="distance"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value}km`}
        />
        <YAxis
          domain={["dataMin - 5", "dataMax + 5"]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value}m`}
        />
        <Area dataKey="elevation" fill="#8884d8" stroke="#8884d8" strokeWidth={2} />
      </AreaChart>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0km</span>
        <span>{totalDistance.toFixed(1)}km</span>
      </div>
    </div>
  );
}
