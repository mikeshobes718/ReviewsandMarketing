import puppeteer from 'puppeteer';

const APP_URL = process.env.APP_URL || 'https://reviewsandmarketing.com';

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'smoke-home.png', fullPage: true });

    const res = await fetch(`${APP_URL}/api/health`, { method: 'GET' });
    const text = await res.text();
    if (!res.ok || !/"status":"ok"/.test(text)) {
      console.error('Health check failed:', res.status, text);
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


