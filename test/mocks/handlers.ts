import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Mapbox Directions API
  http.get('https://api.mapbox.com/directions/v5/mapbox/walking/*', () => {
    return HttpResponse.json({
      routes: [
        {
          geometry: 'mock_encoded_polyline',
          distance: 1000,
          duration: 600,
          weight_name: 'pedestrian',
          weight: 600,
          legs: [],
        },
      ],
      waypoints: [],
      code: 'Ok',
    })
  }),

  // Mock Mapbox Terrain API (for elevation data)
  http.get('https://api.mapbox.com/v4/mapbox.terrain-rgb/*', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
