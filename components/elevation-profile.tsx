"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ElevationProfileProps {
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  totalDistance: number;
  isVisible: boolean;
}

export function ElevationProfile(props: ElevationProfileProps): JSX.Element {
  const { elevationData, isVisible } = props;

  // Format data for the chart
  const chartData = elevationData.map((point) => ({
    distance: Number(point.distance.toFixed(2)),
    elevation: Math.round(point.elevation),
  }));

  if (!isVisible || chartData.length === 0) {
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
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart margin={{ top: 5, right: 0, left: 0, bottom: 20 }} data={chartData}>
          <XAxis
            dataKey="distance"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#666" }}
            ticks={customTicks}
            type="number"
            tickFormatter={(value) => `${value}km`}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#666" }}
            width={0}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              const isVisible = active && payload && payload.length;
              return (
                <div
                  className="bg-white rounded-lg shadow-lg p-2 border"
                  style={{ visibility: isVisible ? "visible" : "hidden" }}
                >
                  {isVisible && (
                    <>
                      <p className="text-xs">{`Distanse: ${label}km`}</p>
                      <p className="text-xs">{`Høyde: ${payload[0].value}m`}</p>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Area
            dataKey="elevation"
            fill="#8884d8"
            fillOpacity={0.3}
            stroke="#8884d8"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
