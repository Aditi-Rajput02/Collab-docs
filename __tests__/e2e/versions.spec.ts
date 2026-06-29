import { test, expect } from '@playwright/test';

test.describe('Version history', () => {
  test('versions API requires authentication', async ({ request }) => {
    const res = await request.get('/api/documents/some-id/versions');
    expect([401, 403]).toContain(res.status());
  });

  test('documents API requires authentication', async ({ request }) => {
    const res = await request.get('/api/documents');
    expect([401, 403]).toContain(res.status());
  });

  test('sync API requires authentication', async ({ request }) => {
    const res = await request.post('/api/documents/some-id/sync', {
      data: { yjsUpdate: '' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('version history page is protected', async ({ page }) => {
    await page.goto('/documents/some-id/versions');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('document settings page is protected', async ({ page }) => {
    await page.goto('/documents/some-id/settings');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('version restore requires authentication', async ({ request }) => {
    const res = await request.post('/api/documents/some-id/versions/v-id/restore');
    expect([401, 403, 405]).toContain(res.status());
  });
});
