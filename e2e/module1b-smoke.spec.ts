import { test, expect } from '@playwright/test';

/**
 * Staging smoke for Module 1B registration UI.
 * Full account flows require a deliverable mailbox + email confirmation.
 * Do not run against production.
 */
test.describe('Module 1B registration smoke @staging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('landing exposes Org vs Individual registration paths', async ({ page }) => {
    await page.getByRole('button', { name: 'Get Started' }).first().click();
    await expect(page.getByRole('heading', { name: /Create your SOKO account|Register/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Organization|organisation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Individual/i })).toBeVisible();
  });

  test('individual form shows professional role and optional username', async ({ page }) => {
    await page.getByRole('button', { name: 'Get Started' }).first().click();
    await page.getByRole('button', { name: /Individual/i }).click();
    await expect(page.getByLabel(/Primary professional role/i)).toBeVisible();
    await expect(page.getByLabel(/SOKO username/i)).toBeVisible();
    const roles = page.getByLabel(/Primary professional role/i);
    await expect(roles.locator('option', { hasText: 'Procurement / Buyer' })).toHaveCount(1);
    await expect(roles.locator('option', { hasText: 'Sales / Business Development' })).toHaveCount(1);
  });

  test('client validation rejects short password', async ({ page }) => {
    await page.getByRole('button', { name: 'Get Started' }).first().click();
    await page.getByRole('button', { name: /Individual/i }).click();
    await page.getByLabel(/Full name/i).fill('QA Validation');
    await page.getByLabel(/^Email/i).fill('qa1b.validation@mailinator.com');
    await page.getByLabel(/^Password/i).fill('short');
    await page.getByLabel(/Primary professional role/i).selectOption({ label: 'Procurement / Buyer' });
    await page.getByRole('checkbox', { name: /Terms of Service/i }).check();
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('Contact Us page loads', async ({ page }) => {
    await page.getByRole('link', { name: 'Contact Us' }).first().click();
    await expect(page.getByRole('heading', { name: 'Contact SOKO' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send message/i })).toBeVisible();
  });
});
