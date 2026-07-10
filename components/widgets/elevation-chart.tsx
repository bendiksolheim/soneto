"use client";

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
import { type findSteepSegments, getSlopeColor, getSlopeOpacity } from "@/lib/elevation/slope";

type ChartPoint = { distance: number; elevation: number };

interface ElevationChartProps {
  chartData: Array<ChartPoint>;
  steepSegments: ReturnType<typeof findSteepSegments>;
  customTicks: Array<number>;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}

export default function ElevationChart({
  chartData,
  steepSegments,
  customTicks,
  hoveredIndex,
  onHover,
}: ElevationChartProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={150}>
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
    </ResponsiveContainer>
  );
}
