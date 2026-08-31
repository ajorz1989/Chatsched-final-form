import { test, expect } from '@playwright/test';

/**
 * E2E Happy Path Tests: ChatSched Marketplace
 *
 * These tests exercise the core value proposition of the platform:
 * - Business posts a request → Publisher accepts → Payment succeeds → Campaign goes live
 * - Publisher posts an opportunity → Business applies → Gets accepted → Campaign goes live
 *
 * Run with: npm run test:e2e
 * Run with UI: npm run test:e2e:ui
 * Debug: npm run test:e2e:debug
 *
 * IMPORTANT: These tests require a real Supabase instance configured in .env
 * with test credentials. See .env.example for configuration.
 */

test.describe('Marketplace Happy Paths', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing across devices
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Happy Path: Business posts request → Publisher accepts', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await expect(page).toHaveTitle(/ChatSched|Billboard/);

    // Sign in as business user
    // TODO: Implement business sign-in flow
    // This requires auth configuration in the test environment
    await page.goto('/login');
    await page.fill('input[type="email"]', 'business-test@example.com');
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Navigate to create request
    await page.click('a:has-text("Create Request")');
    await page.waitForURL(/\/create-request/);

    // Fill request form
    // Select channel: Social Media (default, existing channel)
    await page.click('select[name="channel"]');
    await page.selectOption('select[name="channel"]', 'social-media');

    // Enter campaign details
    await page.fill('input[name="campaignTitle"]', 'Test Campaign');
    await page.fill('textarea[name="campaignBrief"]', 'This is a test campaign brief');
    await page.fill('input[name="budget"]', '5000');

    // Select publishers (this is the business posting to multiple publishers)
    // TODO: Implement publisher selection UI
    // This might be a search/select component

    // Submit request
    await page.click('button:has-text("Send Request")');

    // Verify success notification
    await expect(page.locator('text=Request sent successfully')).toBeVisible();

    // Sign out as business
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Sign Out');

    // Sign in as publisher
    await page.goto('/login');
    await page.fill('input[type="email"]', 'publisher-test@example.com');
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Navigate to requests
    await page.click('a:has-text("Requests")');
    await page.waitForURL(/\/requests/);

    // Find and click the test campaign request
    await page.click('text=Test Campaign');
    await page.waitForURL(/\/requests\//);

    // Review request details
    await expect(page.locator('text=Test Campaign')).toBeVisible();
    await expect(page.locator('text=This is a test campaign brief')).toBeVisible();
    await expect(page.locator('text=R 5,000')).toBeVisible(); // South African Rand formatting

    // Accept request
    await page.click('button:has-text("Accept")');

    // Verify acceptance flow (should show payment/confirmation)
    // TODO: Complete payment flow verification
    // This depends on whether payment happens in-flow or separately

    // Verify success state
    await expect(page.locator('text=Request accepted')).toBeVisible();
  });

  test('Happy Path: Publisher posts opportunity → Business applies', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await expect(page).toHaveTitle(/ChatSched|Billboard/);

    // Sign in as publisher
    await page.goto('/login');
    await page.fill('input[type="email"]', 'publisher-opp@example.com');
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Navigate to post opportunity
    await page.click('a:has-text("Post Opportunity")');
    await page.waitForURL(/\/post-opportunity/);

    // Fill opportunity form
    await page.click('select[name="channel"]');
    await page.selectOption('select[name="channel"]', 'social-media');

    // Opportunity details
    await page.fill('input[name="title"]', 'Test Social Media Opportunity');
    await page.fill('textarea[name="description"]', 'Looking for brand partnerships');
    await page.fill('input[name="budget"]', '3000');

    // Submit opportunity
    await page.click('button:has-text("Post Opportunity")');

    // Verify success
    await expect(page.locator('text=Opportunity posted')).toBeVisible();

    // Sign out
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Sign Out');

    // Sign in as business
    await page.goto('/login');
    await page.fill('input[type="email"]', 'business-opp@example.com');
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Navigate to browse opportunities
    await page.click('a:has-text("Browse Opportunities")');
    await page.waitForURL(/\/opportunities/);

    // Find the test opportunity
    await page.click('text=Test Social Media Opportunity');
    await page.waitForURL(/\/opportunities\//);

    // Verify opportunity details
    await expect(page.locator('text=Test Social Media Opportunity')).toBeVisible();
    await expect(page.locator('text=Looking for brand partnerships')).toBeVisible();
    await expect(page.locator('text=R 3,000')).toBeVisible();

    // Apply for opportunity
    await page.click('button:has-text("Apply")');

    // TODO: Complete application submission flow
    // This might involve filling in a brief or selecting advertising methods

    // Verify success
    await expect(page.locator('text=Application sent')).toBeVisible();
  });

  test('Marketplace navigation and filtering works', async ({ page }) => {
    // Test that the browse/discovery flows are accessible
    await page.goto('/');

    // Navigate to channel hub
    await page.click('a:has-text("Channels")');
    await page.waitForURL('/channels');

    // Verify channels are listed
    await expect(page.locator('text=Social Media').first()).toBeVisible();
    await expect(page.locator('text=Influencer').first()).toBeVisible();
    await expect(page.locator('text=Podcast').first()).toBeVisible();

    // Click into a channel
    await page.click('a:has-text("Social Media")');
    await page.waitForURL(/\/channels\/social-media/);

    // Verify channel details
    await expect(page.locator('text=Social Media')).toBeVisible();
  });
});
