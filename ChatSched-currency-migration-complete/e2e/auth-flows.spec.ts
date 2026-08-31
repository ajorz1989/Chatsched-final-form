import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 *
 * Verifies that users can sign up and log in for both business and publisher roles.
 * These are prerequisite tests for the happy-path marketplace tests.
 */

test.describe('Authentication Flows', () => {
  test('Publisher can sign up', async ({ page }) => {
    await page.goto('/');

    // Click sign up
    await page.click('a:has-text("Sign Up")');
    await page.waitForURL(/\/signup/);

    // Select publisher role
    await page.click('button:has-text("I\'m a Creator")');

    // Fill signup form
    const timestamp = Date.now();
    const email = `publisher-${timestamp}@example.com`;

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTestPass123!');
    await page.fill('input[name="name"]', 'Test Publisher');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to onboarding or dashboard
    // Exact behavior depends on implementation
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10000 });

    // Verify user is authenticated
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Business can sign up', async ({ page }) => {
    await page.goto('/');

    // Click sign up
    await page.click('a:has-text("Sign Up")');
    await page.waitForURL(/\/signup/);

    // Select business role
    await page.click('button:has-text("I\'m a Business")');

    // Fill signup form
    const timestamp = Date.now();
    const email = `business-${timestamp}@example.com`;

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTestPass123!');
    await page.fill('input[name="companyName"]', 'Test Company');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to onboarding or dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10000 });

    // Verify user is authenticated
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('User can log in with existing credentials', async ({ page }) => {
    // Note: Requires test account to already exist
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'test-password-123');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify authenticated
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('User can log out', async ({ page }) => {
    await page.goto('/');

    // Sign in first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Click user menu
    await page.click('button[aria-label="User menu"]');

    // Click sign out
    await page.click('text=Sign Out');

    // Should redirect to home or login
    await page.waitForURL(/\/(|login)/, { timeout: 5000 });

    // Verify no longer authenticated
    await page.goto('/dashboard');
    await page.waitForURL('/login');
  });
});
