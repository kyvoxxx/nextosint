import { test, expect } from '@playwright/test';

test.describe('Investigation Flow', () => {
  test('should successfully investigate an email address', async ({ page }) => {
    // 1. Mock the API request to return a simulated high-risk report
    await page.route('**/api/investigate/email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cached: false,
          data: {
            id: 'inv_12345',
            type: 'email',
            target: 'test@example.com',
            status: 'completed',
            report: {
              score: 85,
              riskLevel: 'high',
              summary: 'This email address was found in multiple public data breaches.',
              indicators: [
                { type: 'breach', value: 'LinkedIn (2012)', severity: 'high' }
              ],
              recommendations: [
                'Change passwords immediately on affected services',
                'Enable Two-Factor Authentication'
              ],
              tags: ['breached', 'high-risk']
            },
            sources: {
              haveibeenpwned: { found: true }
            },
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    // 2. Navigate to the application (assuming / or /dashboard contains the search UI)
    await page.goto('/dashboard');
    
    // 3. Select the 'Email' tab (if there's a tabbed interface)
    // We try to gracefully handle tabs if they exist, or just use the main input
    const emailTab = page.getByRole('tab', { name: /email/i });
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    // 4. Fill the investigation input
    const searchInput = page.getByPlaceholder(/email/i).first();
    await searchInput.fill('test@example.com');

    // 5. Trigger the scan
    const scanButton = page.getByRole('button', { name: /scan|investigate|search/i });
    await scanButton.click();

    // 6. Verify the RiskBadge and report appear
    // We are looking for text that indicates high risk, or specific components
    const riskBadge = page.locator('text=high').first();
    await expect(riskBadge).toBeVisible({ timeout: 10000 });

    const summaryText = page.getByText(/public data breaches/i);
    await expect(summaryText).toBeVisible();
    
    const indicator = page.getByText('LinkedIn (2012)');
    await expect(indicator).toBeVisible();
  });
});
