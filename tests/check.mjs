// Smoke checks for motion, reduced motion, mobile layout/menu, the qualifying form
// and the website review page.
// Run: npm test  (starts its own Vite dev server with a fake form endpoint)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const REVIEW = `${BASE}website-review.html`;
const ENDPOINT = 'https://formspree.io/f/test-endpoint';

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  env: { ...process.env, VITE_FORM_ENDPOINT: ENDPOINT },
  stdio: 'ignore',
});
for (let i = 0; ; i++) {
  try {
    await fetch(BASE);
    break;
  } catch {
    if (i > 100) throw new Error('Vite did not start');
    await new Promise((r) => setTimeout(r, 200));
  }
}

// CHROME_PATH lets you reuse a local Chrome instead of `npx playwright install chromium`.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function open(url, options, reducedMotion) {
  const ctx = await browser.newContext({ ...options, reducedMotion });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // idle-loaded GSAP + font refresh
  return { ctx, page, requests };
}

const opacity = (page, sel) =>
  page.$$eval(sel, (els) => els.map((el) => Number(getComputedStyle(el).opacity)));
const noHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.log(`✗ ${name}\n  ${err.message}`);
    process.exitCode = 1;
  }
}

await test('desktop: system is a scannable grid, no pin, all cards visible', async () => {
  const { ctx, page } = await open(BASE, DESKTOP, 'no-preference');
  await page.waitForSelector('.system .capability', { state: 'attached', timeout: 5000 });
  assert.equal(await page.locator('.pin-spacer').count(), 0);
  assert.equal(await page.locator('.system.has-pin').count(), 0);

  // All six capabilities are in the document and reachable without pinning.
  const count = await page.locator('.capability').count();
  assert.equal(count, 6, `expected 6 capabilities, got ${count}`);

  // Scroll the system section into view; every card must be visible (no scroll-scrubbed hiding).
  await page.locator('.system').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const o = await opacity(page, '.capability');
  assert.ok(
    o.every((v) => v > 0.9),
    `all cards should be visible, got ${o}`,
  );

  // Every inline style GSAP wrote on scrubbed elements must be transform/opacity.
  const bad = await page.evaluate(() => {
    const ok = /^(--.*|transform|opacity|translate|rotate|scale|transform-origin)$/;
    const offenders = [];
    for (const el of document.querySelectorAll('main [style]')) {
      for (const prop of Array.from(el.style))
        if (!ok.test(prop)) offenders.push(`${el.className}: ${prop}`);
    }
    return offenders;
  });
  assert.deepEqual(bad, []);
  assert.ok(await noHorizontalScroll(page), 'horizontal overflow');
  await ctx.close();
});

await test('reduced motion: no GSAP, no pin, everything visible', async () => {
  const { ctx, page, requests } = await open(BASE, DESKTOP, 'reduce');
  assert.equal(
    requests.filter((u) => /motion\.(ts|js)|gsap/.test(u)).length,
    0,
    'GSAP was requested',
  );
  assert.equal(await page.locator('.pin-spacer').count(), 0);
  assert.equal(await page.locator('.has-pin').count(), 0);
  for (const sel of [
    '.capability',
    '.reveal',
    '.hero__title .w > span',
    '.trust__list li',
    '.hero__lead',
  ]) {
    const o = await opacity(page, sel);
    assert.ok(o.length && o.every((v) => v === 1), `${sel} not fully visible: ${o}`);
  }
  const transforms = await page.$$eval('.reveal, .hero__title .w > span', (els) =>
    els
      .map((el) => getComputedStyle(el).transform)
      .filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'),
  );
  assert.deepEqual(transforms, [], 'elements still offset');
  assert.equal(await page.locator('.marquee__track[aria-hidden="true"]').isVisible(), false);
  assert.equal(
    await page.$eval('.marquee__track', (el) => getComputedStyle(el).animationName),
    'none',
  );
  await ctx.close();
});

await test('mobile: no pin, capabilities in normal flow, no horizontal scroll', async () => {
  const { ctx, page } = await open(BASE, MOBILE, 'no-preference');
  assert.equal(await page.locator('.pin-spacer').count(), 0);
  assert.equal(await page.locator('.has-pin').count(), 0);
  const boxes = await page.$$eval('.capability', (els) =>
    els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })),
  );
  boxes.slice(1).forEach((b, i) => {
    assert.ok(b.y > boxes[i].y, 'cards should stack vertically');
    assert.equal(b.x, boxes[0].x);
  });
  assert.ok(await noHorizontalScroll(page), 'horizontal overflow');
  await ctx.close();
});

await test('mobile menu: open, Escape closes and restores focus, link closes', async () => {
  const { ctx, page } = await open(BASE, MOBILE, 'no-preference');
  const toggle = page.locator('.nav__toggle');
  const link = page.locator('.nav__links a', { hasText: 'Services' });
  assert.equal(await link.isVisible(), false);

  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  await link.waitFor({ state: 'visible' });

  await page.keyboard.press('Escape');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.ok(await toggle.evaluate((el) => el === document.activeElement), 'focus not restored');

  await toggle.click();
  await link.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await ctx.close();
});

await test('form: labeled fields, step validation, aria-live success and error', async () => {
  const { ctx, page, requests } = await open(BASE, DESKTOP, 'reduce');
  const unlabeled = await page.$$eval(
    '#contact-form input:not(.hp):not([type="hidden"]), #contact-form textarea, #contact-form select',
    (els) =>
      els.filter((el) => (el.labels?.length ?? 0) === 0).map((el) => el.getAttribute('name')),
  );
  assert.deepEqual(unlabeled, []);
  const status = page.locator('#form-status');
  assert.equal(await status.getAttribute('aria-live'), 'polite');

  const step2 = page.locator('#contact-form .step').nth(1);
  assert.equal(await step2.isHidden(), true);

  // Next on empty step 1: native validation keeps us on step 1, nothing sent.
  await page.click('#contact-form [data-next]');
  assert.equal(await step2.isHidden(), true);
  assert.equal(requests.filter((u) => u === ENDPOINT).length, 0);

  let reply = 200;
  let posted = '';
  await page.route(ENDPOINT, (route) => {
    posted = route.request().postData() ?? '';
    route.fulfill({ status: reply, contentType: 'application/json', body: '{}' });
  });
  const fillSteps = async () => {
    await page.check('input[name="need"][value="New website"]');
    await page.check('input[name="investment"][value="$2,500–$4,000"]');
    await page.check('input[name="timing"][value="1–3 months"]');
    await page.click('#contact-form [data-next]');
    await page.fill('#f-name', 'Test');
    await page.fill('#f-company', 'Test Co');
    await page.fill('#f-email', 'test@example.com');
    await page.fill('#f-website', 'https://example.com');
    await page.check('input[name="outcome"][value="Generate leads"]');
    await page.fill('#f-context', 'We need more qualified inquiries.');
  };
  await fillSteps();
  await page.click('#contact-form button[type="submit"]');
  await page.waitForFunction(
    () => document.querySelector('#contact-form').dataset.state === 'success',
  );
  assert.match(await status.textContent(), /business day/);
  assert.ok(posted.includes('name="need"'), 'qualifier fields missing from submission');
  assert.ok(posted.includes('name="_subject"'), 'subject missing from submission');
  assert.equal(await page.inputValue('#f-name'), '');
  assert.equal(await step2.isHidden(), true); // reset returns to step 1

  reply = 500;
  await fillSteps();
  await page.click('#contact-form button[type="submit"]');
  await page.waitForFunction(
    () => document.querySelector('#contact-form').dataset.state === 'error',
  );
  assert.match(await status.textContent(), /went wrong/);
  await ctx.close();
});

await test('review page: labeled form posts to the endpoint', async () => {
  const { ctx, page } = await open(REVIEW, DESKTOP, 'reduce');
  assert.match(await page.locator('h1').textContent(), /free website review/i);
  const unlabeled = await page.$$eval(
    '#review-form input:not(.hp):not([type="hidden"]), #review-form textarea, #review-form select',
    (els) =>
      els.filter((el) => (el.labels?.length ?? 0) === 0).map((el) => el.getAttribute('name')),
  );
  assert.deepEqual(unlabeled, []);

  let posted = '';
  await page.route(ENDPOINT, (route) => {
    posted = route.request().postData() ?? '';
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.fill('#f-url', 'https://example.com');
  await page.fill('#f-email', 'test@example.com');
  await page.check('input[name="priority"][value="More inquiries"]');
  await page.click('#review-form button[type="submit"]');
  await page.waitForFunction(
    () => document.querySelector('#review-form').dataset.state === 'success',
  );
  assert.ok(posted.includes('name="url"'), 'URL missing from submission');
  assert.ok(await noHorizontalScroll(page), 'horizontal overflow');
  await ctx.close();
});

await browser.close();
server.kill();
