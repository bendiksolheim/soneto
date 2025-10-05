import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RouteStorageService } from './route-storage'
import { setupLocalStorageMock } from '../../test/mocks/localStorage'
import { Point } from '../map/point'

describe('RouteStorageService', () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock()
  })

  describe('saveRoute', () => {
    it('creates new route with UUID and timestamp', () => {
      const routeData = {
        name: 'Morning Run',
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ] as Point[],
      }

      const savedRoute = RouteStorageService.saveRoute(routeData)

      expect(savedRoute.id).toBeTruthy()
      expect(savedRoute.name).toBe('Morning Run')
      expect(savedRoute.points).toEqual(routeData.points)
      expect(savedRoute.createdAt).toBeTruthy()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('persists route to localStorage', () => {
      const routeData = {
        name: 'Test Route',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      }

      RouteStorageService.saveRoute(routeData)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'route-runner-routes',
        expect.any(String)
      )
    })
  })

  describe('getRoutes', () => {
    it('returns empty array when no routes exist', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const routes = RouteStorageService.getRoutes()

      expect(routes).toEqual([])
    })

    it('retrieves saved routes from localStorage', () => {
      const mockData = {
        routes: [
          {
            id: '123',
            name: 'Test',
            points: [{ latitude: 60, longitude: 10 }],
            createdAt: '2025-10-05T00:00:00.000Z',
          },
        ],
        lastModified: '2025-10-05T00:00:00.000Z',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      const routes = RouteStorageService.getRoutes()

      expect(routes).toHaveLength(1)
      expect(routes[0].name).toBe('Test')
    })

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json{')

      const routes = RouteStorageService.getRoutes()

      expect(routes).toEqual([])
    })
  })

  describe('updateRoute', () => {
    it('updates existing route name', () => {
      const initialRoute = RouteStorageService.saveRoute({
        name: 'Old Name',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      })

      const updated = RouteStorageService.updateRoute(initialRoute.id, {
        name: 'New Name',
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('New Name')
      expect(updated?.id).toBe(initialRoute.id)
    })

    it('returns null for non-existent route', () => {
      const result = RouteStorageService.updateRoute('non-existent-id', {
        name: 'Test',
      })

      expect(result).toBeNull()
    })
  })

  describe('deleteRoute', () => {
    it('removes route from storage', () => {
      const route = RouteStorageService.saveRoute({
        name: 'To Delete',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      })

      const success = RouteStorageService.deleteRoute(route.id)

      expect(success).toBe(true)

      const routes = RouteStorageService.getRoutes()
      expect(routes.find(r => r.id === route.id)).toBeUndefined()
    })

    it('returns false for non-existent route', () => {
      const success = RouteStorageService.deleteRoute('non-existent')

      expect(success).toBe(false)
    })
  })

  describe('QuotaExceededError handling', () => {
    it('throws error when storage quota exceeded', () => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError')
      localStorageMock.setItem.mockImplementation(() => {
        throw error
      })

      const routeData = {
        name: 'Large Route',
        points: Array(10000).fill({ latitude: 60, longitude: 10 }) as Point[],
      }

      expect(() => RouteStorageService.saveRoute(routeData)).toThrow(
        'Storage quota exceeded'
      )
    })
  })
})
