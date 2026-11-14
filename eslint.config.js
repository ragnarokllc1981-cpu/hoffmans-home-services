import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'screenshots/**', 'data/**'] },
  js.configs.recommended,
  {
    // Browser code (bundled by Vite)
    files: ['src/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Node code: Vercel functions, local server, build/maintenance scripts, content data
    files: ['api/**/*.js', 'server/**/*.js', 'scripts/**/*.js', 'content/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Puppeteer scripts run callbacks inside the page, so they also see browser globals
    files: ['scripts/check-cities.js', 'scripts/screenshot.js', 'scripts/render-images.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
