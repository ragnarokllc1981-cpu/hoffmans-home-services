# Hoffman's Home Services

Site for Hoffman's Home Services (a DBA of Ragnarok LLC, Livonia, MI). It covers ICA-certified home inspections, small engine repair, light handyman work, and cleaning coordination with Cozy & Clean. Service area: Wayne & Oakland Counties.

Stack (all free/OSS): Vite, Tailwind CSS v4, Three.js (procedural house cross-section hero), GSAP (flashing banner and marquee), Motion (`animate`/`inView`), Express API.

## Run
```
npm install
npm run server          # API on :8787 (POST /api/leads, POST /api/pageview, GET /api/content)
npm run dev             # Vite dev server, proxies /api to :8787
npm run build && npm run preview
npm run screenshot      # headless Chrome + SwiftShader → screenshots/
npm run summary         # last-24h leads + pageviews (add --json)
```
Production single-process: `npm run build && SERVE_DIST=1 npm run server`.

## Content updates without redeploy
Edit `content/services.json`. The API re-reads it on each request, and the front end fetches `/api/content` and falls back to the bundled `src/services.fallback.json`.

## Booking Boss
`server/booking-boss.js` is a config stub. Set `BOOKING_BOSS_URL`/`BOOKING_BOSS_TOKEN` and map the fields once the real intake API is confirmed. Leads are always logged to `data/leads.jsonl` first.

Hero debug: append `?peel=0` or `?peel=1` to pin the cross-section state.
<!-- Hosted on Vercel (hoffmans-home-services, ragnarok-llc); canonical https://hoffmanshomeservices.com -->
