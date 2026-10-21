// Lead intake + content + pageview API for Hoffman's Home Services.
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardToBookingBoss } from './booking-boss.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const CONTENT = process.env.CONTENT_FILE || path.join(ROOT, 'content', 'services.json');
const PORT = process.env.PORT || 8787;
await fs.mkdir(DATA, { recursive: true });

const app = express();
app.use(express.json({ limit: '20kb', type: ['application/json', 'text/plain'] }));
const append = (file, obj) => fs.appendFile(path.join(DATA, file), JSON.stringify(obj) + '\n');

const SERVICES = ['inspection', 'small-engine', 'handyman', 'cleaning'];
const COUNTIES = ['Wayne', 'Oakland'];
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

app.post('/api/leads', async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  const lead = {
    name: clip(b.name, 120), phone: clip(b.phone, 40), email: clip(b.email, 200),
    service: clip(b.service, 40), county: clip(b.county, 20),
    preferredDate: clip(b.preferredDate, 20), message: clip(b.message, 2000),
  };
  const errors = [];
  if (!lead.name) errors.push('name');
  if (lead.phone.replace(/\D/g, '').length < 10) errors.push('phone');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) errors.push('email');
  if (!SERVICES.includes(lead.service)) errors.push('service');
  if (!COUNTIES.includes(lead.county)) errors.push('county (Wayne or Oakland only)');
  if (errors.length) return res.status(400).json({ error: `Invalid: ${errors.join(', ')}` });
  const record = { id: crypto.randomUUID(), receivedAt: new Date().toISOString(), ip: req.ip, ...lead };
  await append('leads.jsonl', record);
  const fwd = await forwardToBookingBoss(record).catch(e => ({ forwarded: false, error: e.message }));
  if (fwd.forwarded || fwd.error) await append('booking-boss-forwards.jsonl', { id: record.id, at: new Date().toISOString(), ...fwd });
  res.status(201).json({ ok: true, id: record.id });
});

app.post('/api/pageview', async (req, res) => {
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  await append('pageviews.jsonl', { at: new Date().toISOString(), path: clip(b?.path, 200), ref: clip(b?.ref, 300), ua: clip(req.get('user-agent'), 200) });
  res.status(204).end();
});

// Re-read on every request: edit content/services.json and the site updates, no redeploy.
app.get('/api/content', async (_req, res) => {
  try { res.set('Cache-Control', 'no-cache').json(JSON.parse(await fs.readFile(CONTENT, 'utf8'))); }
  catch (e) { res.status(500).json({ error: 'content unavailable' }); }
});

if (process.env.SERVE_DIST) app.use(express.static(path.join(ROOT, 'dist')));
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
