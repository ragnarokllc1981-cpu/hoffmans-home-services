import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
const { SITE } = JSON.parse(fs.readFileSync('./site.config.json', 'utf8'));
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [tailwindcss(), { name: 'site-url', transformIndexHtml: h => h.replaceAll('%SITE%', SITE) }],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
});
