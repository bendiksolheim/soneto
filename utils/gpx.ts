import GeoJsonToGpx from "@dwayneparton/geojson-to-gpx";

export function exportGpx(geojson: any) {
  const gpx = GeoJsonToGpx(geojson);
  const gpxString = new XMLSerializer().serializeToString(gpx);

  const link = document.createElement("a");
  link.download = "route.gpx";
  const blob = new Blob([gpxString], { type: "text/xml" });
  link.href = window.URL.createObjectURL(blob);
  link.click();
}
