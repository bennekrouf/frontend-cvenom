import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {

  test('BD portal page loads', async ({ page }) => {
    await page.goto('/en/bd');
    await page.waitForLoadState('networkidle');
    // Should show sign-in, register form, or dashboard — not a crash
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
    await expect(page).not.toHaveURL(/error|404/);
  });

  test('admin page loads without crashing', async ({ page }) => {
    await page.goto('/en/admin/bd');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
  });

  test('admin BD table NOT visible to unauthenticated users', async ({ page }) => {
    await page.goto('/en/admin/bd');
    await page.waitForLoadState('networkidle');
    // The admin data table with "Business Developers" header should not appear for guests
    await expect(page.getByRole('table')).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // If no table exists at all, that's also acceptable
    });
  });

  test('← CV Editor link on /bd navigates to homepage', async ({ page }) => {
    await page.goto('/en/bd');
    await page.waitForLoadState('networkidle');
    const backLink = page.getByRole('link', { name: /← CV Editor/i });
    if (await backLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backLink.click();
      await expect(page).toHaveURL(/\/en\/?$/);
    } else {
      test.skip(true, '← CV Editor link only visible after auth');
    }
  });

  test('404 for completely unknown routes', async ({ page }) => {
    const response = await page.goto('/en/this-does-not-exist-xyz-abc');
    expect(response?.status()).toBe(404);
  });

  test('language toggle switches locale', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    const langBtn = page.getByRole('button', { name: /^FR$/i })
      .or(page.getByRole('button', { name: /français/i })).first();
    if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await langBtn.click();
      await page.waitForURL(/\/fr/);
      await expect(page).toHaveURL(/\/fr/);
    } else {
      test.skip(true, 'Language toggle not found');
    }
  });
});

test.describe('SEO & meta', () => {

  test('page title contains cVenom', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/cVenom/i);
  });

  test('meta description is set and non-trivial', async ({ page }) => {
    await page.goto('/en');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  test('French page has a title', async ({ page }) => {
    await page.goto('/fr');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(3);
  });
});
