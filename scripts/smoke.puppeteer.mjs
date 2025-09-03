import puppeteer from 'puppeteer';

const APP_URL = process.env.APP_URL || 'https://reviewsandmarketing.com';
const FALLBACK_URL = process.env.FALLBACK_URL || '';

async function waitForHealth(url, attempts = 60, delayMs = 10000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { method: 'GET' });
      const text = await res.text();
      if (res.ok && /"status":"ok"/.test(text)) return true;
      console.log(`Health attempt ${i}: code=${res.status} body=${text}`);
    } catch (e) {
      console.log(`Health attempt ${i} error:`, e.message || e);
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function visit(page, url, screenshot) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.screenshot({ path: screenshot, fullPage: true });
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    // First try apex domain
    let ok = await waitForHealth(APP_URL, 60, 10000);
    if (ok) {
      await visit(page, APP_URL, 'smoke-home.png');
      return;
    }

    // Fallback to EB CNAME if provided
    if (FALLBACK_URL) {
      const fallbackOk = await waitForHealth(FALLBACK_URL.startsWith('http') ? FALLBACK_URL : `http://${FALLBACK_URL}`, 60, 10000);
      if (fallbackOk) {
        await visit(page, FALLBACK_URL.startsWith('http') ? FALLBACK_URL : `http://${FALLBACK_URL}`, 'smoke-fallback.png');
        return;
      }
    }

    throw new Error('Smoke test failed: LIVE domain and fallback did not become healthy in time');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Additional API sanity check (non-blocking)
try {
  const res = await fetch(`${process.env.APP_URL}/api/analytics/links/timeseries?days=7`);
  console.log('Timeseries status:', res.status);
} catch (e) {
  console.warn('Timeseries check skipped:', (e && e.message) || e);
}


