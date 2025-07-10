import { test, expect } from '@playwright/test';

test.describe('Shifts Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the shifts page before each test
    await page.goto('/shifts');
  });

  test('should redirect to login page if not authenticated', async ({ page }) => {
    await page.goto('/shifts');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display "All Shifts" by default', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText("All Shifts");
  });

  test('should show loading skeleton initially', async ({ page }) => {
    await page.goto('/shifts', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mantine-skeleton')).toBeVisible();
  });

  test('should display shift cards after loading', async ({ page }) => {
    await expect(page.locator('div.mantine-card-body')).toBeVisible();
  });

  test('should filter by "Today"', async ({ page }) => {
    await page.click('button:has-text("Today")');
    await expect(page.locator('h1')).toHaveText("Today's Shifts");
  });

  test('should filter by "Tomorrow"', async ({ page }) => {
    await page.click('button:has-text("Tomorrow")');
    await expect(page.locator('h1')).toHaveText("Tomorrow's Shifts");
  });

  test('should filter by "This Week"', async ({ page }) => {
    await page.click('button:has-text("This Week")');
    await expect(page.locator('h1')).toHaveText("This Week's Shifts");
  });

  test('should clear filters', async ({ page }) => {
    await page.click('button:has-text("Today")');
    await page.click('button:has-text("Clear Filters")');
    await expect(page.locator('h1')).toHaveText("All Shifts");
  });

  test('should show more filters when "More Filters" is clicked', async ({ page }) => {
    await page.click('button:has-text("More Filters")');
    await expect(page.locator('input[placeholder="Search shifts..."]')).toBeVisible();
  });

  test('should search for shifts', async ({ page }) => {
    await page.fill('input[placeholder="Search shifts..."]', 'Test Shift');
    // Add assertion for search results
  });

  test('should navigate to shift details on card click', async ({ page }) => {
    await page.locator('div.mantine-card-body').first().click();
    await expect(page).toHaveURL(/\/shifts\/.*/);
  });

  test('should navigate to new shift page on button click', async ({ page, context }) => {
    // This test requires authentication
    // You might need to log in first
    await page.click('button:has-text("Create New Shift")');
    await expect(page).toHaveURL('/admin/shifts/new');
  });
});
