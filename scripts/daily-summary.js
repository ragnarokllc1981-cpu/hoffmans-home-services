// Summarize the last N hours (default 24) of leads and page views.
// Usage: node scripts/daily-summary.js [--hours 24] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const args = process.argv.slice(2);
const hours = Number(args[args.indexOf('--hours') + 1]) || 24;
const since = Date.now() - hours * 3600e3;
const read = f => { try { return fs.readFileSync(path.join(DATA, f), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const leads = read('leads.jsonl').filter(l => Date.parse(l.receivedAt) >= since);
const views = read('pageviews.jsonl').filter(v => Date.parse(v.at) >= since);
const count = (arr, k) => arr.reduce((m, x) => (m[x[k] || '(none)'] = (m[x[k] || '(none)'] || 0) + 1, m), {});
const summary = {
  window: { hours, from: new Date(since).toISOString(), to: new Date().toISOString() },
  pageviews: { total: views.length, byPath: count(views, 'path'), topReferrers: count(views.filter(v => v.ref), 'ref') },
  leads: { total: leads.length, byService: count(leads, 'service'), byCounty: count(leads, 'county'),
    list: leads.map(l => ({ at: l.receivedAt, name: l.name, phone: l.phone, email: l.email, service: l.service, county: l.county, preferredDate: l.preferredDate })) },
};
if (args.includes('--json')) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }
const fmt = o => Object.entries(o).map(([k, v]) => `  - ${k}: ${v}`).join('\n') || '  (none)';
console.log(`Hoffman's Home Services: last ${hours}h summary
Page views: ${views.length}
${fmt(summary.pageviews.byPath)}
Leads: ${leads.length}
By service:
${fmt(summary.leads.byService)}
By county:
${fmt(summary.leads.byCounty)}
${summary.leads.list.map(l => `  • ${l.at} | ${l.name} | ${l.phone} | ${l.email} | ${l.service} | ${l.county}${l.preferredDate ? ' | wants ' + l.preferredDate : ''}`).join('\n')}`);
