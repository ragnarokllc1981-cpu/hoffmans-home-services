// Ship content/services.json as a static file so it can be edited without code changes.
import fs from 'node:fs';
fs.mkdirSync('dist/content', { recursive: true });
fs.copyFileSync('content/services.json', 'dist/content/services.json');
fs.writeFileSync('dist/.nojekyll', '');
console.log('copied content/services.json -> dist/content/');

const { SITE } = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const lastmod = new Date().toISOString().slice(0, 10);
fs.writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`);
console.log('wrote robots.txt + sitemap.xml for', SITE);
