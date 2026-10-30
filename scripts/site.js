// Resolve the canonical site URL per build target.
// GitHub Pages (default): site.config.json. Vercel: SITE_URL env, else the production vercel.app URL.
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
export const SITE = (process.env.SITE_URL || (process.env.VERCEL ? vercelUrl : null) || cfg.SITE).replace(/\/$/, '');
export const BASE = process.env.BASE_PATH || process.env.VITE_BASE || '/';
