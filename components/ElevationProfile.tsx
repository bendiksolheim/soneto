"use client";

import React from "react";
import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
    <div className="absolute bottom-4 left-8 right-52 bg-white rounded-2xl shadow-lg  z-10 overflow-hidden">
      <ResponsiveContainer width="100%" height={96}>
        <AreaChart
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          data={chartData}
          width={348}
          height={96}
        >
          <XAxis
            dataKey="distance"
            visibility="hidden"
            height={0}
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            interval={6}
            tickFormatter={(value) => `${value}km`}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            visibility="hidden"
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            width={0}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              const isVisible = active && payload && payload.length;
              return (
                <div
                  className="bg-white rounded-lg shadow-lg p-2"
                  style={{ visibility: isVisible ? "visible" : "hidden" }}
                >
                  {isVisible && (
                    <>
                      <p>{`Distance: ${label}km`}</p>
                      <p>{`Elevation: ${payload[0].value}m`}</p>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Area dataKey="elevation" fill="#8884d8" stroke="#8884d8" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
