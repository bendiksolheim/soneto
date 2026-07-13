"use client";

import { XCircleIcon } from "@/icons";
import { Button } from "../base/button";

type RunModeOverlayProps = {
  onExit: () => void;
  // Drives the fade in/out; also gates pointer-events so the invisible control can't
  // catch a tap mid-transition.
  visible: boolean;
};

// The only chrome shown in run mode: an exit button. The container is pointer-events-none
// so the (interaction-disabled) map underneath is never blocked; only the button itself
// is interactive.
export function RunModeOverlay({ onExit, visible }: RunModeOverlayProps): React.ReactElement {
  return (
    <div
      className={`fixed inset-0 z-[1000] pointer-events-none transition-opacity duration-[250ms] ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 ${
          visible ? "pointer-events-auto" : ""
        }`}
      >
        <Button
          size="lg"
          variant="error"
          className="shadow-lg gap-2 px-6 text-base"
          onClick={onExit}
        >
          <XCircleIcon size={22} />
          Exit run mode
        </Button>
      </div>
    </div>
  );
}
