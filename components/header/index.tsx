"use client";

import type { Point } from "@/lib/map/point";
import { ChooseRoute, MobileMenu } from "./choose-route";
import { User } from "./user";

type HeaderProps = {
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
};

export function Header({ points, onClearPoints, onRouteLoad }: HeaderProps): React.ReactElement {
  return (
    <div className="flex justify-between h-12 items-center">
      <div className="text-lg justify-self-start content-center">Soneto</div>
      <ChooseRoute
        className="justify-self-center content-center max-md:hidden"
        points={points}
        onRouteLoad={onRouteLoad}
        onClearPoints={onClearPoints}
      />
      <div className="justify-self-end flex justify-end items-center">
        <User className="max-md:hidden" />
        <MobileMenu
          className="md:hidden"
          points={points}
          onRouteLoad={onRouteLoad}
          onClearPoints={onClearPoints}
        />
      </div>
    </div>
  );
}
