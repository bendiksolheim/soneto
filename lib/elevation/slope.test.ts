import { describe, it, expect } from 'vitest'
import {
  calculateSlope,
  getSlopeColor,
  getSlopeOpacity,
  findSteepSegments,
} from './slope'

describe('Slope Calculations', () => {
  describe('calculateSlope', () => {
    it('calculates positive slope for uphill', () => {
      const point1 = { distance: 0, elevation: 0 }
      const point2 = { distance: 1, elevation: 100 } // 100m rise over 1km

      const slope = calculateSlope(point1, point2)
      expect(slope).toBe(10) // 10% grade
    })

    it('calculates negative slope for downhill', () => {
      const point1 = { distance: 0, elevation: 100 }
      const point2 = { distance: 1, elevation: 0 }

      const slope = calculateSlope(point1, point2)
      expect(slope).toBe(-10)
    })

    it('returns 0 for flat terrain', () => {
      const point1 = { distance: 0, elevation: 50 }
      const point2 = { distance: 1, elevation: 50 }

      expect(calculateSlope(point1, point2)).toBe(0)
    })

    it('handles zero distance (prevents divide by zero)', () => {
      const point1 = { distance: 5, elevation: 100 }
      const point2 = { distance: 5, elevation: 200 }

      expect(calculateSlope(point1, point2)).toBe(0)
    })
  })

  describe('getSlopeColor', () => {
    it('returns null for slopes below threshold', () => {
      expect(getSlopeColor(0)).toBeNull()
      expect(getSlopeColor(5)).toBeNull()
    })

    it('returns yellow for moderate slopes (6-9%)', () => {
      expect(getSlopeColor(6)).toBe('#fbbf24')
      expect(getSlopeColor(9)).toBe('#fbbf24')
    })

    it('returns orange for steep slopes (10-14%)', () => {
      expect(getSlopeColor(10)).toBe('#f97316')
      expect(getSlopeColor(14)).toBe('#f97316')
    })

    it('returns red for very steep slopes (15%+)', () => {
      expect(getSlopeColor(15)).toBe('#dc2626')
      expect(getSlopeColor(25)).toBe('#dc2626')
    })
  })

  describe('getSlopeOpacity', () => {
    it('returns 0 for slopes below threshold', () => {
      expect(getSlopeOpacity(5)).toBe(0)
    })

    it('returns increasing opacity for steeper slopes', () => {
      expect(getSlopeOpacity(7)).toBe(0.25)
      expect(getSlopeOpacity(12)).toBe(0.35)
      expect(getSlopeOpacity(20)).toBe(0.45)
    })
  })

  describe('findSteepSegments', () => {
    it('returns empty array for insufficient data', () => {
      expect(findSteepSegments([])).toEqual([])
      expect(findSteepSegments([{ distance: 0, elevation: 0, coordinate: [0, 0] }])).toEqual([])
    })

    it('identifies steep segments above threshold', () => {
      const data = [
        { distance: 0, elevation: 0, coordinate: [0, 0] as [number, number] },
        { distance: 0.1, elevation: 10, coordinate: [0, 0] as [number, number] }, // 10% slope
        { distance: 0.2, elevation: 20, coordinate: [0, 0] as [number, number] }, // 10% slope
        { distance: 0.3, elevation: 20, coordinate: [0, 0] as [number, number] }, // 0% slope (ends segment)
      ]

      const segments = findSteepSegments(data, 6, 0.03)

      expect(segments).toHaveLength(1)
      expect(segments[0].x1).toBe(0)
      expect(segments[0].avgSlope).toBeCloseTo(10, 1)
    })

    it('filters out segments shorter than minimum length', () => {
      const data = [
        { distance: 0, elevation: 0, coordinate: [0, 0] as [number, number] },
        { distance: 0.01, elevation: 1, coordinate: [0, 0] as [number, number] }, // 10% but only 10m
        { distance: 0.02, elevation: 2, coordinate: [0, 0] as [number, number] },
      ]

      const segments = findSteepSegments(data, 6, 0.05) // Require 50m minimum

      expect(segments).toEqual([])
    })
  })
})
