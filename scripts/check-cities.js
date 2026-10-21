import puppeteer from 'puppeteer-core';
const [base, out] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url())); p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 1440, height: 900 });
for (const c of ['livonia','westland','canton','plymouth','farmington-hills','novi','redford','dearborn']) {
  const r = await p.goto(base + c + '/', { waitUntil: 'networkidle0' });
  if (c === 'dearborn' && out) { await new Promise(r => setTimeout(r, 1200)); await p.screenshot({ path: out, fullPage: true }); }
  console.log(c, r.status());
}
console.log(errs.length ? errs.join('\n') : 'no console errors'); await b.close();
