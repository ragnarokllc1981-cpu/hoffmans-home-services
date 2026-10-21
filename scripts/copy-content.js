// Ship content/services.json as a static file so it can be edited without code changes.
import fs from 'node:fs';
fs.mkdirSync('dist/content', { recursive: true });
fs.copyFileSync('content/services.json', 'dist/content/services.json');
fs.writeFileSync('dist/.nojekyll', '');
console.log('copied content/services.json -> dist/content/');
