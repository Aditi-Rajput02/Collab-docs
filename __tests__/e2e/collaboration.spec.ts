import { test, expect } from '@playwright/test';

test.describe('Collaboration features', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/); // any non-empty title
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login page has a link to register', async ({ page }) => {
    await page.goto('/auth/login');
    const registerLink = page.locator('a[href*="register"]');
    await expect(registerLink).toBeVisible();
  });

  test('register page has a link back to login', async ({ page }) => {
    await page.goto('/auth/register');
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });

  test('document editor route is protected', async ({ page }) => {
    // Trying to open a document without auth should redirect to login
    await page.goto('/documents/nonexistent-id');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('real-time collaboration requires authentication', async ({ page }) => {
    test.skip(!process.env.E2E_WITH_AUTH, 'Requires authenticated session — set E2E_WITH_AUTH=1');

    // Authenticated collaboration tests go here in a full test suite
    // e.g., open same doc in two contexts, type in one, assert visible in other
    await page.goto('/dashboard');
    await expect(page.locator('h1, [data-testid="dashboard-heading"]')).toBeVisible();
  });
});
