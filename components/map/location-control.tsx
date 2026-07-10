import { LocateFixedIcon } from "@/icons";
import { Button } from "../base/button";

export type TrackingMode = "off" | "following" | "located";

type LocationControlProps = {
  mode: TrackingMode;
  onClick: () => void;
};

// Stacked just above the map's NavigationControl in the bottom-right corner.
export function LocationControl({ mode, onClick }: LocationControlProps): React.ReactElement {
  return (
    <div className="absolute bottom-36 right-2 z-10">
      <Button
        square
        size="md"
        active={mode === "following"}
        soft={mode === "located"}
        className="bg-base-100 text-base-content shadow-md"
        onClick={onClick}
      >
        <LocateFixedIcon size={20} />
      </Button>
    </div>
  );
}
