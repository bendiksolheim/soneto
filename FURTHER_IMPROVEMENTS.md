# Further Improvements

Ideas for taking Soneto further, organized by theme.

## Route Planning Power

- **Undo/redo for marker placement** — A history stack to reverse or replay marker actions, reducing frustration when building complex routes.
- **Drag markers to reposition** — Grab and move an existing waypoint without deleting and re-adding it.
- **Insert waypoint between two existing ones** — Click a route segment to add a midpoint, rather than only appending to the end.
- **"Out and back" route builder** — Input a target distance and direction, and auto-generate a there-and-back route.
- **Loop route closing** — A button that snaps a final waypoint back to the start to complete a loop.

## Running-Specific Metrics

- **Elevation gain/loss totals** — Show total ascent and descent figures derived from the existing elevation data. Most runners care more about cumulative climbing than the graph shape.
- **Difficulty rating** — A simple score based on distance and elevation gain, giving runners an at-a-glance sense of how hard a route is.
- **Calorie estimate** — Rough estimate based on distance, elevation, and an optional body weight input.
- **Multiple pace zones** — Assign different paces to different segments (e.g. slower on climbs, faster on flats) for more accurate time estimates.

## Route Discovery & Organization

- **Tags and folders for saved routes** — As the number of saved routes grows, flat list management becomes painful. Simple tagging (e.g. "long run", "hills", "track") would help.
- **Public route gallery** — Let users opt in to making routes public and browsable by location. A "routes near me" discovery view could add a social dimension without requiring a full social platform.
- **Route variants** — Store alternate versions of a route (e.g. "short loop" vs. "full route") under one named entry.

## Import & Interoperability

- **GPX import** — The inverse of the existing GPX export. Let users bring in routes from Garmin, Strava, Komoot, Wahoo, etc. and view or edit them in the app.
- **Strava route link import** — Parse a Strava route URL and recreate it on the map.

## Map & Terrain

- **Trail routing mode** — A routing preference for trails and paths over roads, relevant for trail runners.
- **Map style toggle** — Switch between standard, terrain, and satellite views. Satellite is especially valuable for trail runners assessing actual terrain.
- **Points of interest overlay** — Water sources, public toilets, cafes — useful when planning long routes. Could pull from OpenStreetMap.

## Mobile & Offline

- **PWA / offline support** — Cache map tiles and route data so runners can reference a planned route without a data connection.
- **Mobile-first run view** — A stripped-down view optimized for glancing at the phone mid-run, showing just the map and key stats.

## Contextual Information

- **Weather integration** — Show a forecast for the planned run time at the route's location.
- **Sunrise/sunset overlay** — Indicate whether a planned route would be run in daylight, particularly relevant for winter planning.

## Priority Picks

If prioritizing, these offer the best return relative to effort:

1. **Elevation gain/loss totals** — No new infrastructure needed; the data is already there.
2. **GPX import** — Inverts the existing GPX export feature and significantly widens the potential audience.
3. **Undo/redo** — Quality-of-life improvement that pays off in every single session.
4. **Public route gallery** — The path toward network effects and long-term retention.
