"use client";

import { Point } from "@/lib/map/point";
import { ChooseRoute } from "./choose-route";
import { User } from "./user";

type HeaderProps = {
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
};

export function Header({ points, onClearPoints, onRouteLoad }: HeaderProps): React.ReactElement {
  return (
    <div className="grid grid-cols-3 h-12">
      <div className="text-lg justify-self-start content-center">Soneto</div>
      <ChooseRoute
        className="justify-self-center content-center"
        points={points}
        onRouteLoad={onRouteLoad}
        onClearPoints={onClearPoints}
      />
      <User />
    </div>
  );
}
