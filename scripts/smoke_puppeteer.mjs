#!/usr/bin/env node
import puppeteer from 'puppeteer';

const BASE = process.env.APP_URL || 'https://reviewsandmarketing.com';

async function status(page, url) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { url: page.url(), status: res?.status() };
}

async function assert(cond, msg) { if (!cond) { throw new Error(msg); } }

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const results = [];
  try {
    // Home
    results.push(await status(page, BASE + '/'));
    await page.waitForSelector('a[href="/onboarding/business"]', { timeout: 15000 });
    // Ensure hero CTA button text "View Dashboard" is not present for visitors
    const txt = await page.evaluate(() => document.body.innerText || '');
    await assert(!/\bView Dashboard\b/.test(txt), 'Visitor should not see View Dashboard CTA on home');

    // Pricing
    results.push(await status(page, BASE + '/pricing'));
    await page.waitForSelector('button', { timeout: 15000 });

    // Onboarding page should be reachable
    results.push(await status(page, BASE + '/onboarding/business'));
    await assert(/onboarding\/business/.test(page.url()), 'Onboarding page reachable');

    // Login page
    results.push(await status(page, BASE + '/login'));
    await page.waitForSelector('input[type=email]');
    await page.type('input[type=email]', 'invalid');
    // Just ensure form exists and button present (not necessarily type attr if older build)
    await page.waitForSelector('form');
    await page.waitForSelector('button');

    // Register page
    results.push(await status(page, BASE + '/register'));
    await page.waitForSelector('input[type=email]');
    const pwd = await page.$('input[type="password"], input[aria-label="Password"]');
    await assert(!!pwd, 'Register should have password input');

    // Forgot page
    results.push(await status(page, BASE + '/forgot'));
    await page.waitForSelector('input[type=email]');

    // Dashboard redirect (check login with next param)
    results.push(await status(page, BASE + '/login?next=%2Fdashboard'));
    await assert(page.url().includes('/login'), 'Login page should be reachable with next param');

    // Mobile nav
    await page.setViewport({ width: 360, height: 800 });
    await status(page, BASE + '/');
    const toggle = await page.$('button[aria-label="Open menu"]');
    await assert(!!toggle, 'Mobile menu toggle exists');
    await toggle.click();
    await page.waitForSelector('a[href="/login"]', { timeout: 10000 });

    // Optional E2E auth flow
    if (process.env.E2E_REGISTER === '1') {
      const uniq = Date.now();
      const testEmail = `e2e-${uniq}@example.com`;
      const testPass = 'Puppeteer123!';
      // Register
      await status(page, BASE + '/register');
      await page.waitForSelector('input[type=email]');
      await page.type('input[type=email]', testEmail);
      await page.type('input[type=password]', testPass);
      await page.click('button[type=submit]');
      // Either lands on /verify-email or onboarding
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
      const url = page.url();
      await assert(url.includes('/verify-email') || url.includes('/onboarding'), 'Expected verify or onboarding after register');
      // Skip verify for now
      if (url.includes('/verify-email')) {
        const skip = await page.$('a[href="/onboarding/business"]');
        if (skip) await skip.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
      }
      // Confirm onboarding loaded
      const hasHeader = await page.$x("//h1[contains(., 'Connect your business')]");
      await assert(hasHeader.length>0, 'Onboarding should show');
      // Non‑Pro dashboard gate
      await status(page, BASE + '/dashboard');
      await assert(page.url().includes('/pricing'), 'Non‑Pro should be redirected to /pricing');
    }

    console.log(JSON.stringify({ ok: true, results }, null, 2));
    await browser.close();
  } catch (e) {
    console.error('Smoke failed:', e);
    try { console.log(JSON.stringify({ ok: false, results }, null, 2)); } catch {}
    await browser.close();
    process.exit(1);
  }
}

run();
