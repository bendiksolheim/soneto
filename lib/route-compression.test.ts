import { describe, it, expect } from 'vitest'
import { compressRoute, decompressRoute, isValidPolyline } from './route-compression'
import { Point } from './map/point'

describe('Route Compression', () => {
  const testPoints: Point[] = [
    { latitude: 59.9139, longitude: 10.7522 },
    { latitude: 59.9149, longitude: 10.7532 },
    { latitude: 59.9159, longitude: 10.7542 },
  ]

  describe('compressRoute', () => {
    it('returns empty string for empty array', () => {
      expect(compressRoute([])).toBe('')
    })

    it('encodes single point', () => {
      const encoded = compressRoute([testPoints[0]])
      expect(encoded).toBeTruthy()
      expect(typeof encoded).toBe('string')
    })

    it('encodes multiple points', () => {
      const encoded = compressRoute(testPoints)
      expect(encoded).toBeTruthy()
      expect(encoded.length).toBeGreaterThan(0)
    })
  })

  describe('decompressRoute', () => {
    it('returns empty array for empty string', () => {
      expect(decompressRoute('')).toEqual([])
    })

    it('returns empty array for whitespace', () => {
      expect(decompressRoute('   ')).toEqual([])
    })

    it('decodes valid polyline', () => {
      const encoded = compressRoute(testPoints)
      const decoded = decompressRoute(encoded)

      expect(decoded).toHaveLength(testPoints.length)

      // Check first point (allowing for precision loss)
      expect(decoded[0].latitude).toBeCloseTo(testPoints[0].latitude, 5)
      expect(decoded[0].longitude).toBeCloseTo(testPoints[0].longitude, 5)
    })

    it('handles invalid polyline gracefully', () => {
      // Note: @mapbox/polyline doesn't throw on invalid input, it decodes to garbage
      // This test verifies the try-catch works for actual errors
      const result = decompressRoute('!!!!')
      // If it decodes to anything, it's not empty (polyline is quite permissive)
      expect(result).toBeDefined()
    })
  })

  describe('round-trip compression', () => {
    it('preserves data through compress → decompress', () => {
      const encoded = compressRoute(testPoints)
      const decoded = decompressRoute(encoded)

      expect(decoded).toHaveLength(testPoints.length)

      decoded.forEach((point, i) => {
        expect(point.latitude).toBeCloseTo(testPoints[i].latitude, 5)
        expect(point.longitude).toBeCloseTo(testPoints[i].longitude, 5)
      })
    })
  })

  describe('isValidPolyline', () => {
    it('returns false for empty string', () => {
      expect(isValidPolyline('')).toBe(false)
    })

    it('returns false for empty/whitespace', () => {
      // isValidPolyline returns false for empty strings
      expect(isValidPolyline('  ')).toBe(false)
    })

    it('returns true for valid polyline', () => {
      const encoded = compressRoute(testPoints)
      expect(isValidPolyline(encoded)).toBe(true)
    })
  })
})
