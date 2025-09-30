"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { findSteepSegments, getSlopeColor, getSlopeOpacity } from "@/lib/elevation/slope";

interface ElevationProfileProps {
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  totalDistance: number;
  isVisible: boolean;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}

export function ElevationProfile(props: ElevationProfileProps): JSX.Element {
  const { elevationData, isVisible, hoveredIndex, onHover } = props;

  // Format data for the chart
  const chartData = elevationData.map((point) => ({
    distance: Number(point.distance.toFixed(2)),
    elevation: Math.round(point.elevation),
  }));

  // Calculate steep segments for visualization
  const steepSegments = useMemo(
    () => findSteepSegments(elevationData, 6, 0.03),
    [elevationData]
  );

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
    <div className="w-full h-full relative">
      {hoveredIndex !== null && chartData[hoveredIndex] && (
        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
          {chartData[hoveredIndex].elevation}m
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          margin={{ top: 5, right: 0, left: 0, bottom: 20 }}
          data={chartData}
          onMouseMove={(state) => {
            if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
              // Only update if the index actually changed to avoid conflicts
              if (hoveredIndex !== state.activeTooltipIndex) {
                const index =
                  typeof state.activeTooltipIndex === "number"
                    ? state.activeTooltipIndex
                    : parseInt(state.activeTooltipIndex);
                onHover(index);
              }
            }
          }}
          onMouseLeave={() => {
            onHover(null);
          }}
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

          {/* Steep segment overlays */}
          {steepSegments.map((segment, index) => {
            const color = getSlopeColor(segment.avgSlope);
            if (!color) return null;

            return (
              <ReferenceArea
                key={`steep-${index}`}
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
      </ResponsiveContainer>
    </div>
  );
}
