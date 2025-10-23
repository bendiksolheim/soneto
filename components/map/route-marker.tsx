import { Point } from "@/lib/map/point";
import { Marker, MarkerDragEvent, MarkerEvent } from "react-map-gl/mapbox";

type RouteMarkerProps = {
  index: number;
  point: Point;
  numberOfPoints: number;
  onClick: (event: MarkerEvent<MouseEvent>) => void;
  onDrag: (event: MarkerDragEvent) => void;
};

export function RouteMarker(props: RouteMarkerProps): React.ReactElement {
  const { index, point, numberOfPoints, onClick, onDrag } = props;
  return (
    <Marker
      key={`route-${index}`}
      longitude={point.longitude}
      latitude={point.latitude}
      draggable
      onClick={onClick}
      onDragEnd={onDrag}
    >
      <div
        className="relative cursor-pointer group"
        style={{
          width: "10px",
          height: "10px",
        }}
      >
        {/* Marker pin */}
        <div
          className={`
        ${index === 0 || index === numberOfPoints - 1 ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}
        rounded-full border border-white shadow-lg
        ${index === 0 ? "bg-green-500" : index === numberOfPoints - 1 ? "bg-red-500" : "bg-blue-500"}
        group-hover:scale-110 transition-transform duration-200
        flex items-center justify-center
      `}
        >
          {index === 0 ? (
            <span className="text-white text-[8px] font-bold ml-0.5">▶</span>
          ) : index === numberOfPoints - 1 ? (
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
          {index === 0 ? "Start" : index === numberOfPoints - 1 ? "Finish" : "Waypoint"} • Click to
          remove • Drag to move
        </div>
      </div>
    </Marker>
  );
}
