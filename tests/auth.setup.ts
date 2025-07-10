import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Perform authentication steps. Replace with your actual login process.
  await page.goto('/login');
  await page.fill('input[placeholder="Enter your email"]', 'admin@test.com');
  await page.fill('input[placeholder="Enter your password"]', 'password123');
  await page.click('button:has-text("Sign In")');

  // Wait for the page to be redirected to the dashboard.
  await expect(page).toHaveURL('/dashboard');

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});
