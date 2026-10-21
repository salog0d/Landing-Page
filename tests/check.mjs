// Smoke checks for motion, reduced motion, mobile layout/menu and the contact form.
// Run: npm test  (starts its own Vite dev server with a fake form endpoint)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
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

async function open(options, reducedMotion) {
  const ctx = await browser.newContext({ ...options, reducedMotion });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
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

await test('desktop: services pin + scrub, compositor-only inline styles', async () => {
  const { ctx, page } = await open(DESKTOP, 'no-preference');
  await page.waitForSelector('.pin-spacer', { state: 'attached', timeout: 5000 });
  assert.equal(await page.locator('.services.has-pin').count(), 1);

  let o = await opacity(page, '.service');
  assert.equal(o[0], 1);
  assert.equal(o[1], 0);

  // Scroll to the third service (labels are every 0.75 viewport).
  await page.evaluate(() => {
    const top = document.querySelector('.pin-spacer').getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + innerHeight * 0.75 * 2);
  });
  await page
    .waitForFunction(
      () => getComputedStyle(document.querySelectorAll('.service')[2]).opacity === '1',
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  o = await opacity(page, '.service');
  assert.ok(o[2] > 0.9, `third card should be visible, got ${o[2]}`);
  assert.ok(o[0] < 0.1, `first card should be hidden, got ${o[0]}`);

  // Every inline style GSAP wrote on scrubbed elements must be transform/opacity.
  // Pin spacer + pinned stage are excluded: pinning sets position once at start/end, not per frame.
  const bad = await page.evaluate(() => {
    const ok = /^(--.*|transform|opacity|translate|rotate|scale|transform-origin)$/;
    const offenders = [];
    for (const el of document.querySelectorAll('main [style]')) {
      if (el.matches('.pin-spacer, .services__stage')) continue;
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
  const { ctx, page, requests } = await open(DESKTOP, 'reduce');
  assert.equal(
    requests.filter((u) => /motion\.(ts|js)|gsap/.test(u)).length,
    0,
    'GSAP was requested',
  );
  assert.equal(await page.locator('.pin-spacer').count(), 0);
  assert.equal(await page.locator('.has-pin').count(), 0);
  for (const sel of [
    '.service',
    '.reveal',
    '.hero__title .w > span',
    '.values li',
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

await test('mobile: no pin, services in normal flow, no horizontal scroll', async () => {
  const { ctx, page } = await open(MOBILE, 'no-preference');
  assert.equal(await page.locator('.pin-spacer').count(), 0);
  assert.equal(await page.locator('.has-pin').count(), 0);
  const boxes = await page.$$eval('.service', (els) =>
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
  const { ctx, page } = await open(MOBILE, 'no-preference');
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

await test('form: labels, native validation, aria-live success and error', async () => {
  const { ctx, page, requests } = await open(DESKTOP, 'reduce');
  const unlabeled = await page.$$eval(
    '#contact-form input:not(.hp), #contact-form textarea',
    (els) =>
      els.filter((el) => !document.querySelector(`label[for="${el.id}"]`)).map((el) => el.name),
  );
  assert.deepEqual(unlabeled, []);
  const status = page.locator('#form-status');
  assert.equal(await status.getAttribute('aria-live'), 'polite');

  await page.click('#contact-form button[type="submit"]');
  assert.equal(requests.filter((u) => u === ENDPOINT).length, 0, 'empty form was sent');

  let reply = 200;
  await page.route(ENDPOINT, (route) =>
    route.fulfill({ status: reply, contentType: 'application/json', body: '{}' }),
  );
  const fill = async () => {
    await page.fill('#f-name', 'Test');
    await page.fill('#f-email', 'test@example.com');
    await page.fill('#f-subject', 'Hello');
    await page.fill('#f-message', 'Testing the form.');
    await page.click('#contact-form button[type="submit"]');
  };
  await fill();
  await page.waitForFunction(
    () => document.querySelector('#contact-form').dataset.state === 'success',
  );
  assert.match(await status.textContent(), /Thanks/);
  assert.equal(await page.inputValue('#f-name'), '');

  reply = 500;
  await fill();
  await page.waitForFunction(
    () => document.querySelector('#contact-form').dataset.state === 'error',
  );
  assert.match(await status.textContent(), /went wrong/);
  await ctx.close();
});

await browser.close();
server.kill();
