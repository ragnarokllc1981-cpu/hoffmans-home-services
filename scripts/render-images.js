// Render the 3D hero (no overlay) into public/hero-fallback.webp (1440x900) and public/og-image.jpg (1200x630).
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
const shoot = async (w, h, opts, css = '') => {
  await p.setViewport({ width: w, height: h });
  await p.goto(url + '?peel=0.75', { waitUntil: 'networkidle0' });
  await p.addStyleTag({ content: `header,#flash-banner,#hero-copy,#layer-legend,#hero-fallback{display:none!important} #hero .bg-gradient-to-r{opacity:.35} ${css}` });
  await p.waitForFunction(() => !document.getElementById('hero-canvas').classList.contains('opacity-0'));
  await new Promise(r => setTimeout(r, 2500));
  await p.screenshot(opts);
};
await shoot(1440, 900, { path: 'public/hero-fallback.webp', type: 'webp', quality: 72 });
// OG card: render, then overlay brand text
await p.setViewport({ width: 1200, height: 630 });
await p.goto(url + '?peel=0.75', { waitUntil: 'networkidle0' });
await p.addStyleTag({ content: `header,#flash-banner,#layer-legend,#hero-fallback,#hero-copy .hero-in:nth-child(3),#hero-copy .hero-in:nth-child(4),#hero-copy .hero-in:nth-child(5){display:none!important} #hero-copy h1{font-size:64px}` });
await p.evaluate(() => { const t = document.createElement('p'); t.textContent = 'Wayne & Oakland County, MI · (313) 643-0815'; t.style.cssText = 'margin-top:20px;font-size:26px;font-weight:700;color:#c6ff2e'; document.querySelector('#hero-copy').append(t); document.querySelectorAll('.hero-in').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); });
await p.waitForFunction(() => !document.getElementById('hero-canvas').classList.contains('opacity-0'));
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: 'public/og-image.jpg', type: 'jpeg', quality: 78 });
await b.close();
