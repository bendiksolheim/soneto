import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  interpolatePointAtDistance,
  generateElevationPoints,
} from './elevation-data'

/**
 * Bug reproduction test: Elevation graph skips the start of routes
 *
 * User-reported issue: When viewing a route from Trondheim area, the elevation
 * graph starts at 2.43km instead of 0km, leaving blank space at the beginning.
 *
 * Root cause: The generateElevationData() function in map.tsx skips data points
 * entirely when queryTerrainElevation() returns null, instead of interpolating
 * the missing values.
 */
describe('Bug: Elevation graph skips start of route', () => {
  // Real route coordinates from user report (Trondheim area, Norway)
  const bugRouteWaypoints: { latitude: number; longitude: number }[] = [
    { latitude: 63.38370992584808, longitude: 10.319276667304678 },
    { latitude: 63.38307018737481, longitude: 10.319015907507833 },
    { latitude: 63.384345281012, longitude: 10.322364927156201 },
    { latitude: 63.3841196712975, longitude: 10.323324530533881 },
    { latitude: 63.38509903006249, longitude: 10.328605294025607 },
    { latitude: 63.38673930656657, longitude: 10.330886948887496 },
    { latitude: 63.38826344557381, longitude: 10.33134029242197 },
    { latitude: 63.38830113122086, longitude: 10.336417188684692 },
    { latitude: 63.39021764804971, longitude: 10.346235608003752 },
    { latitude: 63.393700180240245, longitude: 10.349495296535963 },
    { latitude: 63.39654384441371, longitude: 10.353613611655675 },
    { latitude: 63.39903380182554, longitude: 10.357813115579944 },
  ]

  // Convert to [lng, lat] format used by the elevation functions
  const bugRouteCoordinates: [number, number][] = bugRouteWaypoints.map(
    (p) => [p.longitude, p.latitude] as [number, number]
  )

  // Calculate total route distance in meters
  function calculateTotalDistance(coords: [number, number][]): number {
    let total = 0
    for (let i = 0; i < coords.length - 1; i++) {
      total += calculateDistance(coords[i], coords[i + 1]) * 1000 // km to meters
    }
    return total
  }

  it('should include data from the start of the route even when elevation API returns null for early points', () => {
    const totalDistance = calculateTotalDistance(bugRouteCoordinates)
    const sampleInterval = 30 // meters

    // Simulate the bug: queryTerrainElevation returns null for first ~2.43km
    // This reproduces what the user observed
    const nullUntilKm = 2.43
    const getElevation = (coord: [number, number]) => {
      // Calculate approximate distance from start for this coordinate
      let distanceFromStart = 0
      for (let i = 0; i < bugRouteCoordinates.length - 1; i++) {
        const segmentStart = bugRouteCoordinates[i]
        const segmentEnd = bugRouteCoordinates[i + 1]

        // Check if coord is close to this segment
        const distToCoord = calculateDistance(segmentStart, coord)
        if (distToCoord < 0.01) {
          // within 10m
          break
        }
        distanceFromStart += calculateDistance(segmentStart, segmentEnd)
      }

      // Return null for points before 2.43km (simulating missing terrain data)
      if (distanceFromStart < nullUntilKm) {
        return null
      }
      return 100 // Return a valid elevation for points after 2.43km
    }

    const result = generateElevationPoints(
      bugRouteCoordinates,
      totalDistance,
      sampleInterval,
      getElevation
    )

    // The bug would cause result[0].distance to be ~2.43km
    // The fix ensures result[0].distance is 0 (with interpolated elevation)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].distance).toBe(0) // First point should be at distance 0
  })

  it('should have no large gaps in elevation data even when API returns null for sections', () => {
    const totalDistance = calculateTotalDistance(bugRouteCoordinates)
    const sampleInterval = 30 // meters
    const maxAllowedGapKm = sampleInterval / 1000 + 0.01 // Allow small tolerance

    // Simulate sparse/missing elevation data
    let callCount = 0
    const getElevation = () => {
      callCount++
      // Return null for every other point, and first 80 points
      if (callCount < 80 || callCount % 2 === 0) {
        return null
      }
      return 100
    }

    const result = generateElevationPoints(
      bugRouteCoordinates,
      totalDistance,
      sampleInterval,
      getElevation
    )

    // Verify no large gaps exist (the bug would create gaps where null was returned)
    for (let i = 1; i < result.length; i++) {
      const gap = result[i].distance - result[i - 1].distance
      expect(gap).toBeLessThanOrEqual(maxAllowedGapKm)
    }
  })

  it('should produce the expected number of sample points regardless of null elevations', () => {
    const totalDistance = calculateTotalDistance(bugRouteCoordinates)
    const sampleInterval = 30 // meters
    const expectedSamples = Math.floor(totalDistance / sampleInterval) + 1

    // All elevations are null - the buggy implementation would return empty array
    const result = generateElevationPoints(
      bugRouteCoordinates,
      totalDistance,
      sampleInterval,
      () => null
    )

    // Should still have all the sample points (with interpolated/fallback elevation)
    expect(result.length).toBe(expectedSamples)
    expect(result[0].distance).toBe(0)
  })
})

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const coord: [number, number] = [10.7522, 59.9139]
    expect(calculateDistance(coord, coord)).toBe(0)
  })

  it('calculates correct distance for known points', () => {
    // Oslo to Stockholm is approximately 417 km
    const oslo: [number, number] = [10.7522, 59.9139]
    const stockholm: [number, number] = [18.0686, 59.3293]
    const distance = calculateDistance(oslo, stockholm)
    expect(distance).toBeGreaterThan(400)
    expect(distance).toBeLessThan(450)
  })

  it('handles coordinates crossing meridian', () => {
    const west: [number, number] = [-1, 51]
    const east: [number, number] = [1, 51]
    expect(calculateDistance(west, east)).toBeGreaterThan(0)
  })
})

describe('interpolatePointAtDistance', () => {
  const simpleRoute: [number, number][] = [
    [0, 0],
    [0.01, 0],   // ~1.1 km east
    [0.02, 0],   // ~2.2 km east
  ]

  it('returns null for empty coordinates', () => {
    expect(interpolatePointAtDistance([], 100)).toBeNull()
  })

  it('returns null for single coordinate', () => {
    expect(interpolatePointAtDistance([[0, 0]], 100)).toBeNull()
  })

  it('returns first coordinate at distance 0', () => {
    const result = interpolatePointAtDistance(simpleRoute, 0)
    expect(result).toEqual([0, 0])
  })

  it('returns first coordinate for negative distance', () => {
    const result = interpolatePointAtDistance(simpleRoute, -100)
    expect(result).toEqual([0, 0])
  })

  it('returns last coordinate when distance exceeds route length', () => {
    const result = interpolatePointAtDistance(simpleRoute, 1000000)
    expect(result).toEqual([0.02, 0])
  })

  it('interpolates point in middle of segment', () => {
    const result = interpolatePointAtDistance(simpleRoute, 555) // ~half of first segment
    expect(result).not.toBeNull()
    expect(result![0]).toBeGreaterThan(0)
    expect(result![0]).toBeLessThan(0.01)
  })

  it('handles very short segments', () => {
    const shortRoute: [number, number][] = [
      [0, 0],
      [0.000001, 0], // Very short segment
      [0.01, 0],
    ]
    const result = interpolatePointAtDistance(shortRoute, 0.05)
    expect(result).not.toBeNull()
  })
})

describe('generateElevationPoints', () => {
  // Simple straight route for testing
  const coordinates: [number, number][] = [
    [0, 0],
    [0.009, 0], // ~1 km east
  ]
  const totalDistance = 1000 // 1 km in meters
  const sampleInterval = 100 // Sample every 100m

  describe('basic functionality', () => {
    it('returns empty array for insufficient coordinates', () => {
      expect(generateElevationPoints([], 1000, 100, () => 100)).toEqual([])
      expect(generateElevationPoints([[0, 0]], 1000, 100, () => 100)).toEqual([])
    })

    it('returns empty array for zero distance', () => {
      expect(generateElevationPoints(coordinates, 0, 100, () => 100)).toEqual([])
    })

    it('generates correct number of samples', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => 100
      )
      // 1000m / 100m + 1 = 11 samples (0, 100, 200, ..., 1000)
      expect(result.length).toBe(11)
    })

    it('first point has distance 0', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => 100
      )
      expect(result[0].distance).toBe(0)
    })
  })

  describe('gap prevention (bug fix verification)', () => {
    it('includes point at distance 0 even when elevation is null', () => {
      // This test would have caught the original bug
      const getElevation = (coord: [number, number]) => {
        // Return null for first point
        if (coord[0] === 0 && coord[1] === 0) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      expect(result[0].distance).toBe(0)
      expect(result[0].interpolated).toBe(true)
    })

    it('has no gaps larger than sample interval', () => {
      const getElevation = () => 100

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      for (let i = 1; i < result.length; i++) {
        const gap = result[i].distance - result[i - 1].distance
        expect(gap).toBeLessThanOrEqual(0.15) // 150m tolerance (interval is 100m = 0.1km)
      }
    })

    it('handles null elevation in middle without creating gap', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        // Return null for 5th sample (middle of route)
        if (callCount === 5) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Should still have all 11 points
      expect(result.length).toBe(11)

      // Check no large gaps
      for (let i = 1; i < result.length; i++) {
        const gap = result[i].distance - result[i - 1].distance
        expect(gap).toBeLessThanOrEqual(0.15)
      }
    })

    it('handles consecutive null elevations', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        // Return null for samples 3, 4, 5
        if (callCount >= 3 && callCount <= 5) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      expect(result.length).toBe(11)
      // Interpolated points should be marked
      expect(result[2].interpolated).toBe(true)
      expect(result[3].interpolated).toBe(true)
      expect(result[4].interpolated).toBe(true)
    })
  })

  describe('elevation interpolation', () => {
    it('interpolates missing elevation from neighbors', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount === 3) return null  // Third point is missing
        if (callCount <= 2) return 100    // First two at 100m
        return 200                         // Rest at 200m
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Third point should be interpolated between 100 and 200
      expect(result[2].elevation).toBeGreaterThan(100)
      expect(result[2].elevation).toBeLessThan(200)
      expect(result[2].interpolated).toBe(true)
    })

    it('uses previous elevation when no following elevation exists', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount >= 10) return null  // Last two points missing
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Last points should use previous known elevation
      expect(result[9].elevation).toBe(100)
      expect(result[10].elevation).toBe(100)
    })

    it('uses next elevation when no previous elevation exists', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount <= 2) return null  // First two points missing
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // First points should use next known elevation
      expect(result[0].elevation).toBe(100)
      expect(result[1].elevation).toBe(100)
    })

    it('falls back to 0 when all elevations are null', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => null
      )

      expect(result.length).toBe(11)
      result.forEach(point => {
        expect(point.elevation).toBe(0)
        expect(point.interpolated).toBe(true)
      })
    })
  })
})
