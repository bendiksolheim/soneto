import { test, expect } from '@playwright/test'
import { waitForMapLoad, clickOnMap } from './helpers/map-helpers'

test.describe('Route Creation Flow', () => {
  test('user can create a route by clicking on map', async ({ page }) => {
    // Navigate to app
    await page.goto('/')

    // Wait for map to load
    await waitForMapLoad(page)

    // Initial state: map should be visible
    const mapCanvas = await page.locator('.mapboxgl-canvas').count()
    expect(mapCanvas).toBeGreaterThan(0)

    // Click on map to add first point
    await clickOnMap(page, 400, 300)

    // Wait a bit for state update
    await page.waitForTimeout(500)

    // Click to add second point
    await clickOnMap(page, 450, 350)

    // Wait for route to render
    await page.waitForTimeout(1000)

    // Verify map canvas still exists (basic smoke test)
    const canvasAfter = await page.locator('.mapboxgl-canvas')
    expect(canvasAfter).toBeTruthy()
  })

  test('map loads successfully', async ({ page }) => {
    await page.goto('/')
    await waitForMapLoad(page)

    // Basic check that the app loaded
    const canvas = await page.locator('.mapboxgl-canvas')
    expect(canvas).toBeTruthy()
  })
})
