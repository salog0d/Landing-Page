// Renders scripts/og.html to public/og.png (1200x630) with the real brand fonts.
import { chromium } from 'playwright';

// CHROME_PATH lets you reuse a local Chrome instead of `npx playwright install chromium`.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(new URL('./og.html', import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png written');
