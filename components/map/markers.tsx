import { ReactNode } from "react";
import { RouteMarker } from "./route-marker";
import { Point } from "@/lib/map/point";

type RouteProps = {
  route: Array<Point>;
  setRoute: (route: Array<Point>) => void;
};

export function Markers(props: RouteProps): ReactNode {
  const handleMarkerClick = (indexToRemove: number, e: any) => {
    // Prevent the map's onClick from firing
    e.originalEvent?.stopPropagation();

    // Remove the point at the specified index
    const newRoutePoints = props.route.filter((_, index) => index !== indexToRemove);
    props.setRoute(newRoutePoints);
  };

  const handleMarkerDrag = (index: number, event: any) => {
    const { lng, lat } = event.lngLat;
    const newRoutePoints = [...props.route];
    newRoutePoints[index] = { latitude: lat, longitude: lng };
    props.setRoute(newRoutePoints);
  };

  return props.route.map((point, index) => (
    <RouteMarker
      key={index}
      index={index}
      point={point}
      numberOfPoints={props.route.length}
      onClick={(e) => handleMarkerClick(index, e)}
      onDrag={(e) => handleMarkerDrag(index, e)}
    />
  ));
}
