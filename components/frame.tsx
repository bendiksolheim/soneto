"use client";

import { Point } from "@/lib/map/point";
import React from "react";
import { Header } from "./header";
import { MapFeatures } from "./map-features";

type FrameProps = React.PropsWithChildren<{
  distance: number;
  elevation: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
}>;

export function Frame(props: FrameProps): React.ReactElement {
  return (
    <div className="flex flex-col w-full h-full px-2 md:px-4 pb-2 md:pb-4">
      <Header
        points={props.points}
        onClearPoints={props.onClearPoints}
        onRouteLoad={props.onRouteLoad}
      />
      <div className="card card-border border-base-300 w-full h-full overflow-hidden relative">
        {props.children}
        <MapFeatures elevation={props.elevation} distance={props.distance} />
      </div>
    </div>
  );
}
