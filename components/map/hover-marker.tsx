import { Marker } from "react-map-gl/mapbox";

type HoverMarkerProps = {
  coordinate: [number, number]; // [longitude, latitude]
};

export function HoverMarker(props: HoverMarkerProps): React.ReactElement {
  const { coordinate } = props;

  return (
    <Marker longitude={coordinate[0]} latitude={coordinate[1]} anchor="center">
      <div className="relative pointer-events-none">
        {/* Outer pulse ring */}
        <div className="absolute inset-0 w-5 h-5 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-purple-500 opacity-30 animate-ping" />
        </div>

        {/* Main marker dot */}
        <div className="relative w-3 h-3 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-purple-600 border-2 border-white shadow-lg" />
        </div>
      </div>
    </Marker>
  );
}
