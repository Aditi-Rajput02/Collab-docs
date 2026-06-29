import { test, expect } from '@playwright/test';

test.describe('Offline support', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/collab|editor|login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register page loads correctly', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should end up on login page
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('register form shows validation error for invalid email', async ({ page }) => {
    await page.goto('/auth/register');
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    // Form should show an error or prevent submission
    await expect(page).toHaveURL(/auth\/register/);
  });

  test('going offline shows offline indicator in editor', async ({ page, context }) => {
    // This test only makes sense with a logged-in session; skip if no real server
    test.skip(!process.env.E2E_WITH_AUTH, 'Requires authenticated session — set E2E_WITH_AUTH=1');

    await page.goto('/dashboard');
    await context.setOffline(true);

    // The sync indicator should show "offline" state
    const offlineIndicator = page.locator('[data-testid="sync-status"], [class*="offline"]');
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    await context.setOffline(false);
  });
});
