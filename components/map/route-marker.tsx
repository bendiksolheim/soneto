import { Marker, type MarkerDragEvent, type MarkerEvent } from "react-map-gl/mapbox";
import type { Point } from "@/lib/map/point";
import { cn } from "@/lib/utils";

type RouteMarkerProps = {
  index: number;
  point: Point;
  numberOfPoints: number;
  isHovered: boolean;
  onClick: (event: MarkerEvent<MouseEvent>) => void;
  onDrag: (event: MarkerDragEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function RouteMarker(props: RouteMarkerProps): React.ReactElement {
  const { index, point, numberOfPoints, isHovered, onClick, onDrag, onMouseEnter, onMouseLeave } =
    props;
  const isStart = index === 0;
  const isFinish = index === numberOfPoints - 1;
  return (
    <Marker
      key={`route-${index}`}
      longitude={point.longitude}
      latitude={point.latitude}
      draggable
      onClick={onClick}
      onDragEnd={onDrag}
    >
      <button
        type="button"
        aria-label={isStart ? "Start" : isFinish ? "Mål" : `Veipunkt ${index}`}
        className="relative cursor-pointer group p-0 bg-transparent border-0"
        style={{
          width: "10px",
          height: "10px",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Marker pin */}
        <div
          className={cn(
            isStart || isFinish ? "w-3.5 h-3.5" : "w-2.5 h-2.5",
            "rounded-full border border-white shadow-lg",
            isStart ? "bg-green-500" : isFinish ? "bg-red-500" : "bg-blue-500",
            "transition-transform duration-200",
            "flex items-center justify-center",
            isHovered && "scale-150 ring-4 ring-base-content/70",
          )}
        >
          {isStart ? (
            <span className="text-white text-[8px] font-bold ml-0.5">▶</span>
          ) : isFinish ? (
            <span className="text-white text-[8px] font-bold">⚑</span>
          ) : null}
        </div>

        {/* Hover tooltip */}
        <div
          className="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap
        pointer-events-none z-10
      "
        >
          {isStart ? "Start" : isFinish ? "Finish" : "Waypoint"} • Click to remove • Drag to move
        </div>
      </button>
    </Marker>
  );
}
