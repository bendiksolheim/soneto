"use client";

import type React from "react";
import { useState } from "react";
import { Area, AreaChart, ReferenceArea, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import {
  calculateElevationGain,
  findSteepSegments,
  getSlopeColor,
  getSlopeOpacity,
} from "@/lib/elevation/slope";

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
      <AreaChart
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        data={chartData}
        onMouseMove={(state) => {
          if (state?.isTooltipActive && state.activeTooltipIndex !== undefined) {
            // Only update if the index actually changed to avoid conflicts
            if (hoveredIndex !== state.activeTooltipIndex) {
              const index =
                typeof state.activeTooltipIndex === "number"
                  ? state.activeTooltipIndex
                  : parseInt(state.activeTooltipIndex, 10);
              onHover(index);
            }
          }
        }}
        onMouseLeave={() => {
          onHover(null);
        }}
        width={350}
        height={150}
      >
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
          domain={["dataMin - 5", "dataMax + 2"]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#666" }}
          width={0}
          tickFormatter={(value) => `${value}m`}
          hide={true}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            const isVisible = active && payload.length;
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

        {/* Steep segment overlays */}
        {steepSegments.map((segment) => {
          const color = getSlopeColor(segment.avgSlope);
          if (!color) return null;

          return (
            <ReferenceArea
              key={`steep-${segment.x1}-${segment.x2}`}
              x1={segment.x1}
              x2={segment.x2}
              fill={color}
              fillOpacity={getSlopeOpacity(segment.avgSlope)}
              stroke={color}
              strokeOpacity={0.8}
              strokeWidth={1}
            />
          );
        })}

        {/* Hover indicator dot */}
        {hoveredIndex !== null && chartData[hoveredIndex] && (
          <ReferenceDot
            x={chartData[hoveredIndex].distance}
            y={chartData[hoveredIndex].elevation}
            r={6}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </div>
  );
}
