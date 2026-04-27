/**
 * Fetch elevation data from Mapbox Terrain-RGB tiles
 *
 * This module provides reliable elevation queries independent of which
 * map tiles are currently loaded in the view.
 */

// Tile cache to avoid re-fetching the same tiles
const tileCache = new Map<string, ImageData>();

/**
 * Convert latitude/longitude to tile coordinates at a given zoom level
 */
function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number; pixelX: number; pixelY: number } {
  const n = 2 ** zoom;
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );

  // Calculate pixel position within tile (256x256 tiles)
  const xInTile = (((lng + 180) / 360) * n - tileX) * 256;
  const yInTile =
    (((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n - tileY) * 256;

  return {
    x: tileX,
    y: tileY,
    pixelX: Math.floor(xInTile),
    pixelY: Math.floor(yInTile),
  };
}

/**
 * Decode elevation from RGB values using Mapbox Terrain-RGB encoding
 * Formula: elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
 */
function decodeElevation(r: number, g: number, b: number): number {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

/**
 * Fetch a terrain-RGB tile and return its image data
 */
async function fetchTile(
  x: number,
  y: number,
  zoom: number,
  accessToken: string,
): Promise<ImageData | null> {
  const cacheKey = `${zoom}/${x}/${y}`;

  if (tileCache.has(cacheKey)) {
    return tileCache.get(cacheKey);
  }

  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x}/${y}.pngraw?access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch terrain tile: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Draw to canvas to get pixel data
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, 256, 256);

    // Cache the tile
    tileCache.set(cacheKey, imageData);

    return imageData;
  } catch (error) {
    console.warn("Error fetching terrain tile:", error);
    return null;
  }
}

/**
 * Get elevation for a single coordinate
 */
async function _getElevationForCoord(
  coord: [number, number],
  zoom: number,
  accessToken: string,
): Promise<number | null> {
  const [lng, lat] = coord;
  const { x, y, pixelX, pixelY } = latLngToTile(lat, lng, zoom);

  const imageData = await fetchTile(x, y, zoom, accessToken);
  if (!imageData) return null;

  // Get pixel index (4 values per pixel: R, G, B, A)
  const pixelIndex = (pixelY * 256 + pixelX) * 4;
  const r = imageData.data[pixelIndex];
  const g = imageData.data[pixelIndex + 1];
  const b = imageData.data[pixelIndex + 2];

  return decodeElevation(r, g, b);
}

/**
 * Batch fetch elevation for multiple coordinates
 * Groups coordinates by tile to minimize HTTP requests
 */
export async function fetchElevations(
  coordinates: [number, number][],
  accessToken: string,
  zoom: number = 14,
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();

  // Group coordinates by tile
  const tileGroups = new Map<
    string,
    Array<{ coord: [number, number]; pixelX: number; pixelY: number }>
  >();

  for (const coord of coordinates) {
    const [lng, lat] = coord;
    const { x, y, pixelX, pixelY } = latLngToTile(lat, lng, zoom);
    const tileKey = `${zoom}/${x}/${y}`;

    if (!tileGroups.has(tileKey)) {
      tileGroups.set(tileKey, []);
    }
    tileGroups.get(tileKey).push({ coord, pixelX, pixelY });
  }

  // Fetch tiles in parallel (limit concurrency to avoid rate limiting)
  const tileEntries = Array.from(tileGroups.entries());
  const batchSize = 6; // Fetch 6 tiles at a time

  for (let i = 0; i < tileEntries.length; i += batchSize) {
    const batch = tileEntries.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async ([tileKey, points]) => {
        const [, x, y] = tileKey.split("/").map(Number);
        const imageData = await fetchTile(x, y, zoom, accessToken);

        for (const { coord, pixelX, pixelY } of points) {
          const coordKey = `${coord[0]},${coord[1]}`;

          if (!imageData) {
            results.set(coordKey, null);
            continue;
          }

          const pixelIndex = (pixelY * 256 + pixelX) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];

          results.set(coordKey, decodeElevation(r, g, b));
        }
      }),
    );
  }

  return results;
}

/**
 * Create an elevation lookup function that uses pre-fetched data
 */
export function createElevationLookup(
  elevationMap: Map<string, number | null>,
): (coord: [number, number]) => number | null {
  return (coord: [number, number]) => {
    const key = `${coord[0]},${coord[1]}`;
    return elevationMap.get(key) ?? null;
  };
}

/**
 * Clear the tile cache (useful for memory management on long sessions)
 */
function _clearTileCache(): void {
  tileCache.clear();
}
