"use client";

import { useState } from "react";
import { BarsIcon, XMarkIcon } from "@/icons";
import type { Point } from "@/lib/map/point";
import { Button } from "../base/button";
import { Menu } from "./menu";

type HeaderProps = {
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
};

export function Header({ points, onClearPoints, onRouteLoad }: HeaderProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex justify-between h-12 items-center">
      <div className="text-lg content-center">Soneto</div>
      <Button
        square
        active={isOpen}
        aria-label="Meny"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <XMarkIcon size={20} /> : <BarsIcon size={20} />}
      </Button>
      {isOpen && (
        <Menu
          points={points}
          onClose={() => setIsOpen(false)}
          onRouteLoad={onRouteLoad}
          onClearPoints={onClearPoints}
        />
      )}
    </div>
  );
}
