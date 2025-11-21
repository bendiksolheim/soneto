import { Page } from "@playwright/test";

export async function waitForMapLoad(page: Page) {
  await page.waitForSelector(".mapboxgl-canvas", { timeout: 10000 });
  await page.waitForTimeout(1000); // Extra wait for map initialization
}

export async function clickOnMap(page: Page, x: number, y: number) {
  const mapCanvas = page.locator(".mapboxgl-canvas");
  await mapCanvas.click({ position: { x, y } });
  await page.waitForTimeout(500); // Wait for state update
}
