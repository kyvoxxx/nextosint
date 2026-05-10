import { logger } from '../utils/logger.js';

/**
 * Capture a screenshot of a URL using Puppeteer.
 * Returns a base64-encoded PNG string, or null on failure.
 *
 * Security: The URL has already been validated by the Zod schema
 * (no private IPs, no non-http schemes). Puppeteer runs with
 * --no-sandbox in Docker and navigates with a 15-second timeout.
 */
export async function captureScreenshot(url: string): Promise<string | null> {
  let browser: import('puppeteer').Browser | null = null;

  try {
    // Dynamic import so the server doesn't crash if puppeteer isn't installed
    const puppeteer = await import('puppeteer');

    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--single-process',
      ],
      timeout: 20_000,
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set a user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // Block unnecessary resource types for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['media', 'font', 'websocket'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 15_000,
    });

    // Wait a moment for JS rendering
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Capture screenshot as base64
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64',
    });

    logger.info({ url }, 'Screenshot captured successfully');
    return screenshotBuffer as string;
  } catch (err) {
    logger.error({ err, url }, 'Screenshot: capture failed');
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
