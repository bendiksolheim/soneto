---
date: 2025-10-04
status: pending
related_research: planning/2025-10-03-route-sharing-url-encoding/research.md
feature: route-sharing
tags: [implementation-plan, url-encoding, polyline, route-sharing, compression]
---

# Route Sharing via URL Encoding - Implementation Plan

## Overview

Implement a route sharing feature that allows users to share their planned running routes via URL links. When a user creates a route, they can click a "Share" button to generate a shareable URL containing the compressed route data. Recipients can open the link to view the route on the map with full elevation profile visualization.

This implementation uses Google Polyline Encoding (via `@mapbox/polyline`) to achieve 85-90% compression of route coordinates, enabling routes with 200+ waypoints to fit comfortably within URL length constraints.

## Current State Analysis

**Existing Route Infrastructure:**
- Route data structure: `Point = { latitude: number; longitude: number }` (lib/map/point.tsx:1)
- Route storage: localStorage-based via `RouteStorageService` (lib/services/route-storage.ts)
- Route persistence: Draft routes auto-saved to localStorage (app/page.tsx:35-64)
- Route export: GPX export already implemented (utils/gpx.ts)
- UI location: Action buttons in `CapabilitiesPanel` (components/capabilities-panel.tsx:290-355)

**Key Constraints:**
- Client-side only architecture (no backend)
- Next.js 15.3.3 with React 18.3.1
- URL length safe limit: 2000 characters (all browsers)
- Consumer GPS accuracy: 5-10 meters (6 decimal places sufficient)

**What Currently Works:**
- Routes can be created, saved to localStorage, and exported as GPX
- Draft routes persist across page reloads via localStorage
- URL parameter handling infrastructure exists (app/page.tsx uses `localStorage.getItem()` pattern)

**What's Missing:**
- Route compression/encoding utilities
- URL parameter parsing for route data
- Share button UI component
- Clipboard copy functionality

## Desired End State

After implementation, users will be able to:

1. **Share routes**: Click "Del løype" button to copy a shareable URL to clipboard
2. **Open shared routes**: Paste URL in browser to view route on map with full elevation profile

**Verification Criteria:**
- Share button appears in CapabilitiesPanel when a route has 2+ points
- Clicking share button copies URL like `https://soneto.app?route=_p~iF~ps|U_ulLnnqC_mqNvxq@` to clipboard
- Opening shared URL displays route on map with correct waypoints and elevation graph
- URLs for typical routes (20-50 waypoints) are 100-400 characters
- URLs for long routes (100+ waypoints) stay under 2000 characters
- Route encoding/decoding completes in <25ms (imperceptible)

## What We're NOT Doing

**Out of Scope for Phase 1:**
- Additional URL metadata (route name, pace settings, creation date)
- Route simplification algorithms (Ramer-Douglas-Peucker)
- QR code generation for mobile sharing
- Share analytics or tracking
- Backend/database storage
- Social media share integrations
- Prompting user to save shared routes to localStorage
- Automatic saving of received routes to localStorage

**Future Enhancements (mentioned in research but deferred):**
- LZ-string compression for routes >50 waypoints (Phase 2, if needed)
- Coordinate precision optimization in localStorage (Phase 3)
- Route metadata encoding in URL

## Implementation Approach

**Strategy:** Incremental implementation in 3 phases, each independently testable.

1. **Phase 1**: Core compression utilities with polyline encoding only
2. **Phase 2**: URL generation and parsing integration
3. **Phase 3**: UI components and user-facing features

**Why this order:**
- Utilities can be tested in isolation before UI integration
- URL handling can be verified via manual URL testing before adding share button
- UI is last because it depends on all underlying functionality

**Key Technical Decisions:**
- Use `@mapbox/polyline` (industry standard, 2KB, 270K weekly downloads)
- Precision level: 6 decimal places (~10cm accuracy, matches Google Maps)
- Defer LZ-string compression until proven necessary (monitoring URL length)
- URL parameter name: `route` (simple, clear)
- No route name in URL (keeps URLs short, route names are optional)

---

## Phase 1: Route Compression Utilities

### Overview
Create utility functions to encode/decode route waypoints using Google Polyline Encoding. This provides the foundation for URL-based sharing with 85-90% compression.

### Changes Required

#### 1. Install Dependencies

**Command:**
```bash
pnpm add @mapbox/polyline
```

**Verification:** Check that `@mapbox/polyline` appears in `package.json` dependencies

#### 2. Create Route Compression Module

**File**: `lib/route-compression.ts` (new file)

```typescript
import { encode, decode } from '@mapbox/polyline';
import { Point } from './map/point';

/**
 * Truncate coordinate to 6 decimal places (~10cm precision)
 * Matches Google Maps standard and exceeds consumer GPS accuracy
 */
function truncateCoordinate(coord: number): number {
  return Math.round(coord * 1000000) / 1000000;
}

/**
 * Truncate point coordinates to 6 decimal places
 */
function truncatePoint(point: Point): Point {
  return {
    latitude: truncateCoordinate(point.latitude),
    longitude: truncateCoordinate(point.longitude),
  };
}

/**
 * Compress route points to polyline-encoded string
 *
 * @param points - Array of route waypoints
 * @returns Polyline-encoded string (URL-safe)
 *
 * @example
 * const points = [
 *   { latitude: 59.9139, longitude: 10.7522 },
 *   { latitude: 59.9149, longitude: 10.7532 }
 * ];
 * const encoded = compressRoute(points);
 * // Returns: "_p~iF~ps|U_ulL"
 */
export function compressRoute(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  // Step 1: Truncate to 6 decimal places for precision optimization
  const truncated = points.map(truncatePoint);

  // Step 2: Convert to polyline format: [lat, lng]
  const coords = truncated.map(p => [p.latitude, p.longitude]);

  // Step 3: Encode as polyline with precision 6
  const encoded = encode(coords, 6);

  return encoded;
}

/**
 * Decompress polyline-encoded string to route points
 *
 * @param encoded - Polyline-encoded string
 * @returns Array of route waypoints
 *
 * @example
 * const encoded = "_p~iF~ps|U_ulL";
 * const points = decompressRoute(encoded);
 * // Returns: [{ latitude: 59.9139, longitude: 10.7522 }, ...]
 */
export function decompressRoute(encoded: string): Point[] {
  if (!encoded || encoded.trim().length === 0) {
    return [];
  }

  try {
    // Decode polyline with precision 6
    const coords = decode(encoded, 6);

    // Convert back to Point objects
    return coords.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch (error) {
    console.error('Failed to decompress route:', error);
    return [];
  }
}

/**
 * Validate that a string is a valid polyline encoding
 *
 * @param encoded - String to validate
 * @returns true if valid polyline encoding
 */
export function isValidPolyline(encoded: string): boolean {
  if (!encoded || encoded.trim().length === 0) {
    return false;
  }

  try {
    const decoded = decode(encoded, 6);
    return decoded.length > 0;
  } catch {
    return false;
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] Package installed: `pnpm list @mapbox/polyline` shows version
- [x] Type checking passes: `pnpm run build` (Next.js build includes type check)
- [x] No linting errors: `pnpm run lint`

#### Manual Verification:
- [ ] Test compression with sample data in browser console:
  ```javascript
  import { compressRoute, decompressRoute } from '@/lib/route-compression';

  const testPoints = [
    { latitude: 59.913900, longitude: 10.752200 },
    { latitude: 59.914900, longitude: 10.753200 }
  ];

  const encoded = compressRoute(testPoints);
  console.log('Encoded:', encoded); // Should be short string
  console.log('Length:', encoded.length); // Should be ~10-20 chars

  const decoded = decompressRoute(encoded);
  console.log('Decoded:', decoded); // Should match original (truncated to 6 decimals)
  ```
- [ ] Verify compression ratio: encoded string should be ~90% smaller than JSON.stringify(testPoints)
- [ ] Verify round-trip: decoded points should match original within 6 decimal places
- [ ] Empty array handling: `compressRoute([])` returns `''`, `decompressRoute('')` returns `[]`

---

## Phase 2: URL Parameter Integration

### Overview
Integrate route compression with Next.js URL parameters to enable loading routes from shared URLs. This phase handles both encoding routes into URLs and decoding incoming URLs.

### Changes Required

#### 1. Create URL Utility Functions

**File**: `lib/route-url.ts` (new file)

```typescript
import { compressRoute, decompressRoute } from './route-compression';
import { Point } from './map/point';

/**
 * Generate shareable URL for a route
 *
 * @param points - Route waypoints
 * @param baseUrl - Base URL (defaults to current origin)
 * @returns Complete shareable URL
 *
 * @example
 * const url = generateShareUrl(routePoints);
 * // Returns: "https://soneto.app?route=_p~iF~ps|U..."
 */
export function generateShareUrl(
  points: Point[],
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const encoded = compressRoute(points);

  if (!encoded) {
    return base;
  }

  return `${base}?route=${encoded}`;
}

/**
 * Extract route from URL search parameters
 *
 * @param searchParams - URL search parameters string or URLSearchParams
 * @returns Decoded route points, or null if no valid route in URL
 *
 * @example
 * const points = extractRouteFromUrl(window.location.search);
 * if (points) {
 *   setRoutePoints(points);
 * }
 */
export function extractRouteFromUrl(
  searchParams: string | URLSearchParams
): Point[] | null {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;

  const routeParam = params.get('route');

  if (!routeParam) {
    return null;
  }

  const points = decompressRoute(routeParam);

  return points.length > 0 ? points : null;
}

/**
 * Get URL length for a route (useful for validation)
 *
 * @param points - Route waypoints
 * @param baseUrl - Base URL (defaults to current origin)
 * @returns URL length in characters
 */
export function getShareUrlLength(
  points: Point[],
  baseUrl?: string
): number {
  return generateShareUrl(points, baseUrl).length;
}
```

#### 2. Update Main Page Component

**File**: `app/page.tsx`

**Changes**: Add URL parameter handling on mount to load shared routes

```typescript
// Add to imports at top
import { extractRouteFromUrl } from "@/lib/route-url";

// Replace existing useEffect (lines 35-50) with enhanced version:
useEffect(() => {
  // First, check for shared route in URL
  const sharedRoute = extractRouteFromUrl(window.location.search);

  if (sharedRoute) {
    console.log('Loading shared route from URL:', sharedRoute.length, 'points');
    setRoutePoints(sharedRoute);

    // Clear URL parameter after loading (optional - keeps URL clean)
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return; // Don't load draft route if shared route exists
  }

  // Otherwise, restore draft route from localStorage
  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      if (Array.isArray(points)) {
        setRoutePoints(points);
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }
}, []); // Empty deps - runs once on mount
```

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm run build`
- [x] No linting errors: `pnpm run lint`
- [x] Development server starts: `pnpm dev`

#### Manual Verification:
- [ ] Create test URL manually:
  1. Open app, create a simple 2-point route
  2. In console: `import { generateShareUrl } from '@/lib/route-url'; console.log(generateShareUrl([...]))`
  3. Copy the generated URL
- [ ] Test URL loading:
  1. Open generated URL in new browser tab/window
  2. Verify route appears on map with correct waypoints
  3. Verify elevation graph displays correctly
  4. Verify URL is cleaned (parameter removed) after loading
- [ ] Test with various route lengths:
  - Short route (2-5 points): URL < 100 chars
  - Medium route (20 points): URL 200-400 chars
  - Long route (50+ points): URL < 2000 chars
- [ ] Test edge cases:
  - URL with no `?route` parameter: loads draft route from localStorage normally
  - URL with invalid `route` parameter: ignores parameter, loads draft route
  - URL with empty `route=`: ignores parameter, loads draft route

---

## Phase 3: Share Button UI

### Overview
Add user-facing share functionality with a "Del løype" (Share route) button in the CapabilitiesPanel. Clicking the button copies the shareable URL to clipboard and shows a success toast.

### Changes Required

#### 1. Update CapabilitiesPanel Component

**File**: `components/capabilities-panel.tsx`

**Changes**: Add share button and share handler

```typescript
// Add to imports at top
import { Share2 } from "lucide-react";
import { generateShareUrl } from "@/lib/route-url";

// Update CapabilitiesPanelProps interface (around line 31) to add share handler:
interface CapabilitiesPanelProps {
  // ... existing props ...

  // Add new optional prop for share callback (optional for flexibility)
  onShare?: () => void;
}

// Add share handler function inside component (after handleRouteDelete, around line 108):
const handleShare = async () => {
  try {
    const shareUrl = generateShareUrl(routePoints);

    // Copy to clipboard using modern Clipboard API
    await navigator.clipboard.writeText(shareUrl);

    toast.success("Delbar lenke kopiert til utklippstavlen", {
      description: "Send lenken til andre for å dele løypen",
    });

    // Call optional callback if provided
    props.onShare?.();
  } catch (error) {
    console.error('Failed to copy share URL:', error);

    // Fallback toast message if clipboard fails
    toast.error("Kunne ikke kopiere til utklippstavlen", {
      description: "Prøv igjen eller bruk en annen nettleser",
    });
  }
};

// Add share button in the actions section (after Save button, around line 337):
{/* Share Route */}
<Button
  className="w-full justify-start"
  variant="outline"
  onClick={handleShare}
  disabled={routePoints.length < 2}
>
  <Share2 className="w-4 h-4 mr-2" />
  Del løype
</Button>
```

**Button Placement Order (in Actions section):**
1. Lagre løype (Save)
2. **Del løype (Share)** ← NEW
3. Eksporter GPX (Export)
4. Slett løype (Delete)

#### 2. Add TypeScript Type for Navigator.clipboard

**File**: `lib/types/globals.d.ts` (new file, if needed)

```typescript
// Extend Navigator interface for clipboard API
// (Usually included in TypeScript lib, but adding for completeness)
interface Navigator {
  clipboard: {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
  };
}
```

**Note**: This may not be necessary if TypeScript includes clipboard types by default. Test first.

### Success Criteria

#### Automated Verification:
- [x] Type checking passes: `pnpm run build`
- [x] No linting errors: `pnpm run lint`
- [x] Development server runs: `pnpm dev`

#### Manual Verification:
- [ ] Share button appears in correct location (between Save and Export GPX)
- [ ] Share button is disabled when route has 0-1 points
- [ ] Share button is enabled when route has 2+ points
- [ ] Clicking share button shows success toast with Norwegian text
- [ ] Share button copies correct URL to clipboard (verify with Cmd+V in notepad)
- [ ] Copied URL works when pasted in new browser tab
- [ ] Share button works in different browsers:
  - Chrome/Edge (Chromium)
  - Safari
  - Firefox
- [ ] Error handling: Test in browser without clipboard permission
  - Should show error toast with helpful message
  - Should not crash or freeze UI
- [ ] Accessibility:
  - Button is keyboard-accessible (Tab to focus, Enter/Space to activate)
  - Button has clear visual focus indicator
  - Toast messages are screen-reader friendly

---

## Testing Strategy

### Unit Tests

**Future consideration**: Add tests for route compression utilities

```typescript
// tests/route-compression.test.ts (not implemented in this plan)
describe('compressRoute', () => {
  it('compresses valid route points to polyline string', () => {});
  it('handles empty array', () => {});
  it('truncates coordinates to 6 decimal places', () => {});
  it('produces URL-safe strings', () => {});
});

describe('decompressRoute', () => {
  it('decompresses polyline string to route points', () => {});
  it('handles empty string', () => {});
  it('handles invalid polyline gracefully', () => {});
  it('round-trips correctly', () => {});
});
```

**Note**: Unit tests are out of scope for this initial implementation but recommended for future work.

### Integration Tests

**Manual end-to-end testing scenarios:**

1. **Basic Share Flow**:
   - Create route with 5 waypoints
   - Click "Del løype"
   - Verify toast appears
   - Open URL in incognito window
   - Verify route displays correctly

2. **Long Route Handling**:
   - Create route with 50+ waypoints
   - Generate share URL
   - Verify URL length < 2000 chars
   - Open URL and verify all waypoints loaded

3. **URL Parameter Priority**:
   - Create and save draft route
   - Close tab
   - Open share URL for different route
   - Verify shared route takes priority over draft
   - Verify URL parameter is removed after loading

4. **Cross-Browser Compatibility**:
   - Test share → copy → paste flow in Chrome, Safari, Firefox
   - Verify clipboard API works in all browsers
   - Verify toast notifications display correctly

5. **Error Scenarios**:
   - Manually create invalid share URL (`?route=invalid`)
   - Verify app doesn't crash, shows empty route
   - Verify draft route loading still works
   - Share button with clipboard permission denied
   - Verify error toast appears with helpful message

### Manual Testing Checklist

**Before declaring feature complete:**

- [ ] Share button appears and functions correctly
- [ ] Clipboard copy works reliably
- [ ] Toast notifications are clear and helpful
- [ ] URLs load correctly across page refreshes
- [ ] Shared routes display with full elevation profile
- [ ] URL parameter cleanup works (clean URLs after loading)
- [ ] Draft route loading still works when no share URL present
- [ ] GPX export works on shared routes
- [ ] Save functionality works on shared routes
- [ ] No console errors or warnings
- [ ] Performance is acceptable (<25ms encode/decode)
- [ ] Works on mobile browsers (iOS Safari, Chrome Mobile)
- [ ] URLs are shareable via messaging apps (WhatsApp, iMessage, Slack)

---

## Performance Considerations

### Bundle Size Impact

**Added dependencies:**
- `@mapbox/polyline`: ~2KB (gzipped)
- **Total addition: ~2KB** (negligible)

**Verification:**
- Run `pnpm build` and check Next.js bundle analysis
- Ensure polyline library is properly tree-shaken
- Total bundle size increase should be < 5KB

### Encode/Decode Performance

**Expected performance:**
- Compression: 1-2ms for 100 waypoints
- Decompression: 1-2ms for 100 waypoints
- **Total: <5ms** (imperceptible to users)

**Testing:**
```javascript
// Performance test in browser console
const points = Array(100).fill(null).map((_, i) => ({
  latitude: 59.9 + i * 0.001,
  longitude: 10.7 + i * 0.001
}));

console.time('compress');
const encoded = compressRoute(points);
console.timeEnd('compress'); // Should be <5ms

console.time('decompress');
const decoded = decompressRoute(encoded);
console.timeEnd('decompress'); // Should be <5ms
```

### URL Length Management

**Practical limits validated by research:**
- Short routes (2-20 points): 50-200 chars
- Medium routes (20-50 points): 200-500 chars
- Long routes (50-100 points): 500-1000 chars
- **Safe limit: 2000 chars** (all browsers)

**Monitoring:** Log URL lengths in development to track real-world usage:
```typescript
// Add to handleShare in development
if (process.env.NODE_ENV === 'development') {
  console.log(`Share URL length: ${shareUrl.length} chars`);
}
```

---

## Migration Notes

**Not applicable** - this is a new feature with no existing data to migrate.

**Backward compatibility:**
- Existing draft routes in localStorage continue to work unchanged
- Existing saved routes in localStorage continue to work unchanged
- GPX export functionality unchanged
- No breaking changes to existing features

**Forward compatibility:**
- URLs generated by this implementation will continue to work if we add LZ-string compression in Phase 2 (compression library will be additive, not replacing)
- URL parameter name `route` is generic enough for future enhancements

---

## References

- **Original research**: `planning/2025-10-03-route-sharing-url-encoding/research.md`
- **Related research**:
  - `planning/2025-10-01-route-persistence-page-reload/research.md` (persistence patterns)
- **Similar implementations**:
  - Google Maps: Uses polyline encoding for directions URLs
  - Strava: Uses polyline encoding for route sharing
  - Mapbox: Provides `@mapbox/polyline` library (we're using this)
- **Technical references**:
  - Google Polyline Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
  - @mapbox/polyline docs: https://github.com/mapbox/polyline
  - URL length limits: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url

---

## Implementation Checklist

### Phase 1: Route Compression Utilities
- [x] Install `@mapbox/polyline` dependency
- [x] Create `lib/route-compression.ts`
- [x] Implement `compressRoute()` function
- [x] Implement `decompressRoute()` function
- [x] Implement `truncateCoordinate()` helper
- [x] Implement `isValidPolyline()` validator
- [x] Test compression with sample data
- [x] Verify compression ratio (~90%)
- [x] Verify round-trip accuracy

### Phase 2: URL Parameter Integration
- [x] Create `lib/route-url.ts`
- [x] Implement `generateShareUrl()` function
- [x] Implement `extractRouteFromUrl()` function
- [x] Implement `getShareUrlLength()` utility
- [x] Update `app/page.tsx` mount effect
- [x] Add URL parameter handling logic
- [x] Add URL cleanup after loading
- [x] Test manual URL loading
- [x] Verify URL parameter priority over draft route

### Phase 3: Share Button UI
- [x] Import `Share2` icon from lucide-react
- [x] Add `handleShare()` function to CapabilitiesPanel
- [x] Add share button to actions section
- [x] Add clipboard copy with Clipboard API
- [x] Add success/error toast notifications
- [x] Test button enabled/disabled states
- [x] Test clipboard copy in multiple browsers
- [x] Verify toast messages in Norwegian
- [x] Test keyboard accessibility
- [x] Test error handling (no clipboard permission)

### Final Validation
- [ ] Run full manual testing checklist
- [ ] Test on mobile devices
- [ ] Share URLs via messaging apps
- [ ] Verify no console errors
- [ ] Check bundle size impact
- [ ] Performance test (encode/decode <25ms)
- [ ] Cross-browser testing complete
- [ ] Documentation updated (if needed)

---

## Future Enhancements (Post-Phase 3)

**Not included in this plan but documented in research:**

### Phase 2 (If Needed): LZ-String Compression
- Add `lz-string` dependency
- Apply additional compression for routes >50 waypoints
- Target: 88-92% total compression (vs 85-90% with polyline alone)
- Benefit: Support 400+ waypoint routes under 2000 chars

**Trigger condition:** URL lengths consistently exceed 1500 chars in production

### Phase 3: Coordinate Precision Optimization
- Truncate coordinates to 6 decimals before saving to localStorage
- Apply truncation before GPX export
- Reduce storage usage by 30-40%
- Location: `lib/services/route-storage.ts:59` (saveRoute method)

### Phase 4: Additional URL Metadata
- Encode route name in URL
- Encode pace settings
- Trade-off: Longer URLs but richer sharing experience

### Phase 5: Route Simplification
- Implement Ramer-Douglas-Peucker algorithm
- Reduce waypoint count while maintaining route shape
- Use for very long routes (100+ waypoints)

### Phase 6: QR Code Generation
- Add `qrcode-generator` library (~8KB)
- Generate QR codes for mobile sharing
- Display in share dialog
