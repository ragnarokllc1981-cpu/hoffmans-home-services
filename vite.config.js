import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
const { SITE } = JSON.parse(fs.readFileSync('./site.config.json', 'utf8'));
const cities = JSON.parse(fs.readFileSync('./cities.json', 'utf8'));
export default defineConfig({
  build: { rollupOptions: { input: Object.fromEntries([['main', 'index.html'], ...cities.map(c => [c, `${c}/index.html`])]) } },
  base: process.env.BASE_PATH || '/',
  plugins: [tailwindcss(), { name: 'site-url', transformIndexHtml: h => h.replaceAll('%SITE%', SITE) }],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
});
