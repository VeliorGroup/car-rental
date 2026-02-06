import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('renders the homepage with branding', async ({ page }) => {
    await page.goto('/en')

    // Should display the FleetPulse brand
    await expect(page.locator('text=FleetPulse')).toBeVisible()

    // Should display the navigation
    await expect(page.locator('nav')).toBeVisible()

    // Should display the hero section
    await expect(page.locator('h1')).toBeVisible()
  })

  test('search functionality is visible and interactive', async ({ page }) => {
    await page.goto('/en')

    // Should display the search card with location input
    const searchSection = page.locator('input[type="text"]').first()
    await expect(searchSection).toBeVisible()

    // Should have date picker triggers (pickup and dropoff)
    const dateButtons = page.locator('button').filter({ hasText: /\d{2}/ })
    await expect(dateButtons.first()).toBeVisible()

    // Should have a search button
    const searchButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /search|cerca|kerko/i })
    await expect(searchButton.first()).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Fallback: look for the primary action button in the search card
      const primaryButtons = page.locator('button.w-full')
      await expect(primaryButtons.first()).toBeVisible()
    })
  })
})
