import GeoJsonToGpx from "@dwayneparton/geojson-to-gpx";

export function exportGpx(geojson: unknown) {
  // biome-ignore lint/suspicious/noExplicitAny: Ignoring this for now
  const gpx = GeoJsonToGpx(geojson as any);
  const gpxString = new XMLSerializer().serializeToString(gpx);

  const link = document.createElement("a");
  link.download = "route.gpx";
  const blob = new Blob([gpxString], { type: "text/xml" });
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  link.click();
  // Revoke on the next tick so the browser has started the download before the Blob is freed.
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
