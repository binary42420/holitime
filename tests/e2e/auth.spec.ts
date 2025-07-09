import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a user to log in and log out', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in the login form
    // Make sure to use valid credentials for a test user in your database
    await page.getByLabel('Email Address').fill('sam.c@handson.com');
    await page.getByLabel('Password').fill('password123');

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for navigation to the dashboard and assert the URL
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Verify that the user navigation element is visible
    await expect(page.getByText('Sam C')).toBeVisible();

    // Now, test logout
    // Click the user menu to open it
    await page.click('button[aria-haspopup="menu"]');
    
    // Click the logout button
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    // Wait for navigation back to the login page
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });
});