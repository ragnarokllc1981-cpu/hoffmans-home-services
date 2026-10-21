// Headless screenshots with SwiftShader WebGL. Usage: node scripts/screenshot.js [url]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.setViewport({ width: 1440, height: 900 });
for (const [name, peel] of [['hero-closed', 0], ['hero-peeled', 1]]) {
  await page.goto(`${url}?peel=${peel}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: `screenshots/${name}.png` });
}
const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); return c ? c.getParameter(c.RENDERER) : 'none'; });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: 'screenshots/full-page.png', fullPage: true });
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto(url, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: 'screenshots/mobile-hero.png' });
console.log('GL renderer:', gl);
console.log(errors.length ? errors.join('\n') : 'No console errors/warnings');
await browser.close();
