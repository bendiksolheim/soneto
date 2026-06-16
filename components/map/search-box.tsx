"use client";

import { SearchBox as MapboxSearchBox } from "@mapbox/search-js-react";
import { type ReactNode, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";

type SearchBoxProps = {
  mapboxToken: string;
  mapRef: React.RefObject<MapRef | null>;
};

const searchBoxTheme = {
  variables: {
    colorText: "oklch(40% 0.0081 61.42)",
    colorPrimary: "oklch(23.27% 0.0249 284.3)",
    colorBackground: "oklch(97% 0.0035 67.78)",
    colorBackgroundHover: "oklch(95% 0.0081 61.42)",
    colorBackgroundActive: "oklch(90% 0.0081 61.42)",
    border: "1.5px solid oklch(90% 0.0081 61.42)",
    borderRadius: "0.25rem",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    fontFamily:
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontWeight: "400",
    unit: "14px",
    padding: "0.5em",
    lineHeight: "1.4",
  },
};

export function SearchBox(props: SearchBoxProps): ReactNode {
  const [value, setValue] = useState("");

  return (
    <div className="absolute top-2 left-2 z-10 w-72 max-w-[45vw] md:max-w-none">
      <MapboxSearchBox
        accessToken={props.mapboxToken}
        value={value}
        onChange={setValue}
        placeholder="Søk etter sted eller adresse"
        theme={searchBoxTheme}
        onRetrieve={(res) => {
          const feature = res.features[0];
          if (!feature) return;
          const [lng, lat] = feature.geometry.coordinates;
          props.mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1000,
          });
        }}
      />
    </div>
  );
}
