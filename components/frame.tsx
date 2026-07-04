"use client";

import type React from "react";
import type { Point } from "@/lib/map/point";
import type { GenerateRouteResult, RouteDebugData } from "@/lib/routes";
import { Header } from "./header";
import { MapFeatures } from "./map-features";

type FrameProps = React.PropsWithChildren<{
  distance: number;
  elevation: Array<{
    distance: number;
    elevation: number;
    coordinate: [number, number];
  }>;
  points: Array<Point>;
  pointDistances: Array<number>;
  hoveredPointIndex: number | null;
  onPointHover: (index: number | null) => void;
  onDeletePoint: (index: number) => void;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
  autoRouteEnabled: boolean;
  mapboxToken: string;
  userLocation: Point | null;
  onAutoRouteGenerated: (result: GenerateRouteResult) => void;
  onAutoRouteDebugChanged: (data: RouteDebugData | null) => void;
  // In run mode the planner chrome (header + feature panels) is hidden, leaving a
  // fullscreen map.
  hideChrome?: boolean;
}>;

export function Frame(props: FrameProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col w-full h-full transition-[padding] duration-[250ms] ease-in-out ${
        props.hideChrome ? "" : "px-2 md:px-4 pb-2 md:pb-4"
      }`}
    >
      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-[250ms] ease-in-out ${
          props.hideChrome ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <Header
            points={props.points}
            onClearPoints={props.onClearPoints}
            onRouteLoad={props.onRouteLoad}
          />
        </div>
      </div>
      <div
        className={`w-full h-full overflow-hidden relative transition-[border-radius] duration-[250ms] ease-in-out ${
          props.hideChrome ? "" : "card card-border border-base-300"
        }`}
      >
        {props.children}
        <div
          className={`transition-opacity duration-[250ms] ease-in-out ${
            props.hideChrome ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <MapFeatures
            elevation={props.elevation}
            distance={props.distance}
            points={props.points}
            pointDistances={props.pointDistances}
            hoveredPointIndex={props.hoveredPointIndex}
            onPointHover={props.onPointHover}
            onDeletePoint={props.onDeletePoint}
            autoRouteEnabled={props.autoRouteEnabled}
            mapboxToken={props.mapboxToken}
            userLocation={props.userLocation}
            onAutoRouteGenerated={props.onAutoRouteGenerated}
            onAutoRouteDebugChanged={props.onAutoRouteDebugChanged}
          />
        </div>
      </div>
    </div>
  );
}
