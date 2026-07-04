import { Marker } from "react-map-gl/mapbox";
import type { Point } from "@/lib/map/point";

type UserLocationMarkerProps = {
  location: Point | null;
  // Direction the user is facing, in degrees clockwise from north. When provided, a
  // chevron points that way so the runner can see which way they're heading at a
  // junction. Omitted outside run mode, where only the dot is shown.
  bearing?: number;
};

export function UserLocationMarker({
  location,
  bearing,
}: UserLocationMarkerProps): React.ReactElement | null {
  if (location === null) {
    return null;
  }

  return (
    <Marker key="user-location" longitude={location.longitude} latitude={location.latitude}>
      <div className="relative flex items-center justify-center group cursor-pointer">
        {/* Pulsing background circle */}
        <div className="absolute w-8 h-8 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
        <div className="absolute w-6 h-6 bg-blue-500 rounded-full opacity-30"></div>

        {/* Direction chevron, rotated to the heading. */}
        {bearing !== undefined && (
          <div
            className="absolute -top-4 text-blue-600"
            style={{ transform: `rotate(${bearing}deg)`, transformOrigin: "50% 24px" }}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
              <path d="M7 0 L14 10 L7 7 L0 10 Z" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Main location indicator */}
        <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg">
          <div className="absolute inset-1 bg-blue-600 rounded-full"></div>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
          Your Current Location
        </div>
      </div>
    </Marker>
  );
}
