import { type ChangeEvent, useState } from "react";
import { usePace } from "@/hooks/use-pace";
import { AdjustmentsHorizontalIcon, CalculatorIcon, ListOrdered, SparklesIcon } from "@/icons";
import { LineChartArea } from "@/icons/line-chart-area";
import type { Point } from "@/lib/map/point";
import type { GenerateRouteResult, RouteDebugData } from "@/lib/routes";
import { Button, Card, Modal } from "./base";
import { AutoRoute } from "./widgets/auto-route";
import { ElevationProfile } from "./widgets/elevation-profile";
import { RouteStats } from "./widgets/route-stats";
import { WaypointsList } from "./widgets/waypoints-list";

type MapFeatureProps = {
  elevation: Array<{
    distance: number;
    elevation: number;
    coordinate: [number, number];
  }>;
  distance: number;
  points: Array<Point>;
  pointDistances: Array<number>;
  hoveredPointIndex: number | null;
  onPointHover: (index: number | null) => void;
  onDeletePoint: (index: number) => void;
  autoRouteEnabled: boolean;
  mapboxToken: string;
  userLocation: Point | null;
  onAutoRouteGenerated: (result: GenerateRouteResult) => void;
  onAutoRouteDebugChanged: (data: RouteDebugData | null) => void;
};

export function MapFeatures(props: MapFeatureProps): React.ReactElement {
  const [showStats, setShowStats] = useState(true);
  const [showElevation, setShowElevation] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [showAutoRoute, setShowAutoRoute] = useState(false);
  return (
    <div className="absolute top-1 right-1 flex gap-1.5 md:gap-2.5">
      <div className="flex flex-col gap-1.5 md:gap-2.5">
        {showStats && <RouteStatsCard distance={props.distance} />}
        {showElevation && (
          <Card title="Profil" className="w-80 max-w-[calc(100vw-4.5rem)]">
            <ElevationProfile elevationData={props.elevation} totalDistance={props.distance} />
          </Card>
        )}
        {showWaypoints && (
          <Card title="Punkter" className="w-80 max-w-[calc(100vw-4.5rem)]">
            <WaypointsList
              points={props.points}
              pointDistances={props.pointDistances}
              hoveredIndex={props.hoveredPointIndex}
              onHover={props.onPointHover}
              onDelete={props.onDeletePoint}
            />
          </Card>
        )}
        {props.autoRouteEnabled && showAutoRoute && (
          <Card title="Auto-rute" className="max-w-[calc(100vw-4.5rem)]">
            <AutoRoute
              mapboxToken={props.mapboxToken}
              userLocation={props.userLocation}
              onRouteGenerated={props.onAutoRouteGenerated}
              onDebugDataChanged={props.onAutoRouteDebugChanged}
            />
          </Card>
        )}
      </div>
      <div className="flex flex-col gap-1.5 md:gap-2.5">
        <Button
          square
          size="sm"
          active={showStats}
          className="text-base-content md:btn-md"
          onClick={() => setShowStats(!showStats)}
        >
          <CalculatorIcon size={20} />
        </Button>
        <Button
          square
          size="sm"
          active={showElevation}
          className="text-base-content md:btn-md"
          onClick={() => setShowElevation(!showElevation)}
        >
          <LineChartArea size={20} />
        </Button>
        <Button
          square
          size="sm"
          active={showWaypoints}
          className="text-base-content md:btn-md"
          onClick={() => setShowWaypoints(!showWaypoints)}
        >
          <ListOrdered size={20} />
        </Button>
        {props.autoRouteEnabled && (
          <Button
            square
            size="sm"
            active={showAutoRoute}
            className="text-base-content md:btn-md"
            onClick={() => setShowAutoRoute(!showAutoRoute)}
          >
            <SparklesIcon size={20} />
          </Button>
        )}
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

  const handlePaceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPace(Number(event.target.value));
  };

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.round(pace - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card
      title="Detaljer"
      className="md:min-w-64"
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => setIsPacePopupOpen(!isPacePopupOpen)}>
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
