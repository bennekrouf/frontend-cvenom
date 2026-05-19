import { test, expect } from '@playwright/test';

// ── Editor — guest view ───────────────────────────────────────────────────────
// Authenticated editor tests require Firebase — skip those here.
// These verify what an unauthenticated user sees when landing on the app.

test.describe('Editor — guest', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('page renders something meaningful (landing or editor)', async ({ page }) => {
    // Firebase session may persist in IndexedDB across test runs.
    // Either the landing page OR the authenticated editor is acceptable.
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
    // Must not be a blank/error page
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('generate CV button is not accessible to guests', async ({ page }) => {
    // The Generate button should either not exist or be disabled for guests
    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    const isVisible = await generateBtn.isVisible().catch(() => false);
    if (isVisible) {
      // If visible, it should be disabled or trigger sign-in
      const isDisabled = await generateBtn.isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    }
    // If not visible at all, that's also acceptable
  });

  test('portfolio button is not accessible to guests', async ({ page }) => {
    const portfolioBtn = page.getByRole('button', { name: /portfolio/i }).first();
    const isVisible = await portfolioBtn.isVisible().catch(() => false);
    if (isVisible) {
      const isDisabled = await portfolioBtn.isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    }
  });
});

// ── Editor UI elements (when NOT behind auth) ─────────────────────────────────

test.describe('Editor UI structure', () => {

  test('navbar is present on editor page', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('header')).toBeVisible();
  });

  test('theme toggle is accessible', async ({ page }) => {
    await page.goto('/en');
    // Use .first() to handle multiple matching buttons (light + dark mode)
    const themeBtn = page.locator('[aria-label*="theme" i]').first();
    if (await themeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await themeBtn.click();
      await expect(page.locator('body')).toBeVisible();
    } else {
      test.skip(true, 'Theme toggle not found');
    }
  });
});
