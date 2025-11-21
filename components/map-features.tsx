import { LineChartArea } from "@/icons/line-chart-area";
import { Button, Card, Modal } from "./base";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ElevationProfile } from "./widgets/elevation-profile";
import { AdjustmentsHorizontalIcon, CalculatorIcon } from "@/icons";
import { RouteStats } from "./widgets/route-stats";
import { usePace } from "@/hooks/use-pace";

type MapFeatureProps = {
  elevation: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  distance: number;
};

export function MapFeatures(props: MapFeatureProps): React.ReactElement {
  const [showStats, setShowStats] = useState(true);
  const [showElevation, setShowElevation] = useState(false);
  return (
    <div className="absolute top-1 right-1 flex  gap-2.5">
      <div className="flex flex-col gap-2.5">
        {showStats && <RouteStatsCard distance={props.distance} />}
        {showElevation && (
          <Card title="Høydeprofil">
            <ElevationProfile elevationData={props.elevation} totalDistance={props.distance} />
          </Card>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <Button
          square
          size="md"
          active={showStats}
          className="text-base-content"
          onClick={() => setShowStats(!showStats)}
        >
          <CalculatorIcon size={20} />
        </Button>
        <Button
          square
          size="md"
          active={showElevation}
          className="text-base-content"
          onClick={() => setShowElevation(!showElevation)}
        >
          <LineChartArea size={20} />
        </Button>
      </div>
    </div>
  );
}

type RouteStatsCardProps = {
  distance: number;
};
function RouteStatsCard(props: RouteStatsCardProps): React.ReactElement {
  const { pace: paceInSeconds, setPace } = usePace();
  const [isPacePopupOpen, setIsPacePopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePaceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPace(Number(event.target.value));
  };

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.round(pace - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPacePopupOpen(false);
      }
    };

    if (isPacePopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPacePopupOpen]);

  return (
    <Card
      title="Løypedetaljer"
      className="min-w-64"
      actions={
        <>
          <Button
            ref={buttonRef}
            variant="ghost"
            size="sm"
            onClick={() => setIsPacePopupOpen(!isPacePopupOpen)}
          >
            <AdjustmentsHorizontalIcon size={16} />
          </Button>
          {isPacePopupOpen && (
            <Modal isOpen={isPacePopupOpen} setIsOpen={setIsPacePopupOpen}>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-sm text-gray-500">{formatPace(paceInSeconds)} min/km</div>
                </div>
                <div className="px-1">
                  <input
                    type="range"
                    className="range w-full"
                    min={120}
                    max={720}
                    step={10}
                    value={paceInSeconds}
                    onChange={handlePaceChange}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>2:00</span>
                    <span>12:00</span>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </>
      }
    >
      <RouteStats paceInSeconds={paceInSeconds} distance={props.distance} />
    </Card>
  );
}
