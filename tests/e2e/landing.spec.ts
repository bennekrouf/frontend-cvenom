import { test, expect } from '@playwright/test';

// ── Landing page — guest view ─────────────────────────────────────────────────

// Clear any stored auth/localStorage before each test so we always test
// the guest experience, even if a real Firebase session exists in the browser.
test.beforeEach(async ({ page }) => {
  await page.goto('/en');
  await page.evaluate(() => {
    localStorage.clear();
    // Don't clear indexedDB here — Firebase stores tokens there, but
    // clearing it would break other tests. Just ensure bd_ref is clean.
    localStorage.removeItem('bd_ref');
  });
  await page.goto('/en');
  await page.waitForLoadState('networkidle');
});

test.describe('Landing page — hero', () => {

  test('hero headline is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/job|CV|career|emploi/i);
  });

  test('sign-in CTA button is present', async ({ page }) => {
    // Could be "Start free", "Sign in", "Launch Studio", "Démarrer"
    const cta = page.getByRole('button', { name: /sign in|start free|launch|démarrer/i }).first()
      .or(page.getByRole('link', { name: /sign in|start free|launch|démarrer/i }).first());
    await expect(cta).toBeVisible();
  });

  test('scroll-to-features anchor exists', async ({ page }) => {
    const anchor = page.getByRole('link', { name: /see what|fonctionnalit|entdecken/i }).first();
    await expect(anchor).toBeVisible();
    const href = await anchor.getAttribute('href');
    expect(href).toContain('#features');
  });
});

test.describe('Landing page — features', () => {

  test('CV Generator feature is visible', async ({ page }) => {
    // Use nth(0) to avoid strict mode violation if text appears multiple times
    await expect(page.getByText('CV Generator').first()).toBeVisible();
  });

  test('Cover Letter feature is visible', async ({ page }) => {
    await expect(page.getByText('Cover Letter').first()).toBeVisible();
  });

  test('Portfolio feature is visible', async ({ page }) => {
    await expect(page.getByText('Portfolio').first()).toBeVisible();
  });

  test('LinkedIn Match feature is visible', async ({ page }) => {
    await expect(page.getByText('LinkedIn Match').first()).toBeVisible();
  });
});

test.describe('Landing page — BD earn section', () => {

  test('commission percentage is displayed', async ({ page }) => {
    // The earn section stat card shows "30%" — use the one in the earn section
    const section = page.locator('section').filter({ hasText: /earn|commission|gagner/i }).first();
    await expect(section.getByText('30%').first()).toBeVisible();
  });

  test('BD referral CTA link points to /bd', async ({ page }) => {
    const bdLink = page.getByRole('link', { name: /referral code|get my|parrainage/i }).first();
    await expect(bdLink).toBeVisible();
    const href = await bdLink.getAttribute('href');
    expect(href).toMatch(/\/bd/);
  });

  test('earn bullet points are visible', async ({ page }) => {
    await expect(page.getByText(/no selling|just share/i).first()).toBeVisible();
  });
});

test.describe('Landing page — how it works', () => {

  test('step 1 is visible', async ({ page }) => {
    await expect(page.getByText(/create your profile/i).first()).toBeVisible();
  });

  test('step 4 / final CTA is visible', async ({ page }) => {
    await expect(page.getByText(/download and apply|apply/i).first()).toBeVisible();
  });
});

test.describe('Landing page — footer', () => {

  test('footer renders', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  test('footer has earn commission link', async ({ page }) => {
    // Scroll to footer first
    await page.locator('footer').scrollIntoViewIfNeeded();
    const earnLink = page.locator('footer').getByText(/commission/i).first();
    await expect(earnLink).toBeVisible();
  });

  test('footer has CV Generator link', async ({ page }) => {
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer').getByText('CV Generator').first()).toBeVisible();
  });

  test('footer has privacy policy link', async ({ page }) => {
    const privacyLink = page.locator('footer').getByRole('link', { name: /privacy/i });
    await expect(privacyLink).toBeVisible();
  });
});

test.describe('Landing page — i18n', () => {

  test('root / redirects to a locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr|de)/);
  });

  test('French version loads without error', async ({ page }) => {
    await page.goto('/fr');
    await page.waitForLoadState('networkidle');
    // Page should load (not 404)
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible();
    // At least one French-specific word should appear
    const hasFrench = await page.getByText(/emploi|lettre|portfolio|compétence/i).first().isVisible().catch(() => false);
    expect(hasFrench).toBeTruthy();
  });

  test('German version loads without error', async ({ page }) => {
    await page.goto('/de');
    await page.waitForLoadState('networkidle');
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible();
  });
});

test.describe('Landing page — navbar', () => {

  test('navbar is visible', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
  });

  test('navbar stays visible after scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(page.locator('header')).toBeVisible();
  });

  test('admin link NOT visible to unauthenticated guests', async ({ page }) => {
    // Admin link should only appear for the admin email after sign-in
    const adminLink = page.getByRole('link', { name: '⚙ Admin' });
    await expect(adminLink).not.toBeVisible();
  });
});

test.describe('BD referral code capture', () => {

  test('?ref=CODE in URL is stored in localStorage', async ({ page }) => {
    await page.goto('/en?ref=BD-TEST1');
    // Wait for the useEffect to fire
    await page.waitForTimeout(500);
    const stored = await page.evaluate(() => localStorage.getItem('bd_ref'));
    expect(stored).toBe('BD-TEST1');
  });

  test('ref code persists across navigation', async ({ page }) => {
    await page.goto('/en?ref=BD-PERSIST');
    await page.waitForTimeout(300);
    await page.goto('/en');
    const stored = await page.evaluate(() => localStorage.getItem('bd_ref'));
    expect(stored).toBe('BD-PERSIST');
  });
});
