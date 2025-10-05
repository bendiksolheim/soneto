import { describe, it, expect } from 'vitest'
import { calculateRouteDistance } from './route'
import { Point } from '../map/point'

describe('calculateRouteDistance', () => {
  it('returns 0 for empty array', () => {
    expect(calculateRouteDistance([])).toBe(0)
  })

  it('returns 0 for single point', () => {
    const point: Point = { latitude: 59.9139, longitude: 10.7522 }
    expect(calculateRouteDistance([point])).toBe(0)
  })

  it('calculates distance between two points', () => {
    const oslo: Point = { latitude: 59.9139, longitude: 10.7522 }
    const bergen: Point = { latitude: 60.3913, longitude: 5.3221 }

    const distance = calculateRouteDistance([oslo, bergen])

    // Oslo to Bergen is approximately 304km
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(310)
  })

  it('calculates cumulative distance for multiple points', () => {
    const point1: Point = { latitude: 59.9139, longitude: 10.7522 }
    const point2: Point = { latitude: 59.9149, longitude: 10.7532 }
    const point3: Point = { latitude: 59.9159, longitude: 10.7542 }

    const distance = calculateRouteDistance([point1, point2, point3])

    expect(distance).toBeGreaterThan(0)
  })

  it('handles same point twice (0 distance)', () => {
    const point: Point = { latitude: 59.9139, longitude: 10.7522 }
    const distance = calculateRouteDistance([point, point])

    expect(distance).toBe(0)
  })
})
