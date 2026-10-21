import './style.css';
import gsap from 'gsap';
import { animate, inView, stagger } from 'motion';
import fallback from './services.fallback.json';

document.getElementById('yr').textContent = new Date().getFullYear();

// Hero (guard so a WebGL failure never breaks the page)
// Lazy-load the Three.js hero after first paint; the static fallback image + HTML text stay for crawlers / no-WebGL.
const loadHero = () => import('./hero.js').then(({ initHero }) => {
  const canvas = document.getElementById('hero-canvas');
  initHero(canvas);
  requestAnimationFrame(() => { canvas.classList.remove('opacity-0'); document.getElementById('hero-fallback').classList.add('opacity-0'); });
}).catch(err => console.warn('3D hero unavailable:', err.message));
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) ('requestIdleCallback' in window ? requestIdleCallback(loadHero, { timeout: 1500 }) : setTimeout(loadHero, 300));

// GSAP: flashing banner + marquee + legend blink
gsap.to('#flash-banner', { backgroundColor: '#ff6a1a', duration: 0.6, repeat: -1, yoyo: true, ease: 'steps(1)' });
const marquee = document.getElementById('marquee');
gsap.to(marquee, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
gsap.to('.legend', { opacity: 0.35, duration: 0.5, repeat: -1, yoyo: true, stagger: 0.25 });

// Motion: hero copy entrance + reveal-on-scroll
animate('.hero-in', { opacity: [0, 1], y: [30, 0] }, { delay: stagger(0.12), duration: 0.8, ease: [0.16, 1, 0.3, 1] });
inView('#trust', () => { animate('.trust-card', { opacity: [0, 1], y: [40, 0] }, { delay: stagger(0.1), duration: 0.6 }); });
inView('#area', () => { animate('.county', { opacity: [0, 1], scale: [0.85, 1] }, { delay: stagger(0.15), duration: 0.7 }); });

// Services: live content from /api/content, bundled fallback
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderServices(services) {
  const grid = document.getElementById('service-grid');
  grid.innerHTML = services.map(s => `
    <article class="service-card group relative rounded-2xl border ${s.featured ? 'border-volt/60 bg-gradient-to-b from-volt/10' : 'border-zinc-800 bg-gradient-to-b from-zinc-900'} to-zinc-950 p-6 overflow-hidden transition-colors hover:border-volt">
      ${s.featured ? '<span class="absolute top-4 right-4 text-[10px] font-black bg-volt text-ink px-2 py-0.5 rounded-full">ANCHOR</span>' : ''}
      <div class="text-4xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6">${esc(s.icon)}</div>
      <h3 class="mt-4 font-display text-xl font-black">${esc(s.title)}</h3>
      <p class="text-xs font-mono text-ember mt-1">${esc(s.tag)}</p>
      <p class="mt-3 text-sm text-zinc-400">${esc(s.blurb)}</p>
      ${s.scope ? `<p class="mt-3 text-xs text-zinc-300 border-l-2 border-volt pl-2">${esc(s.scope)}</p>` : ''}
      ${s.link ? `<a href="${esc(s.link)}" target="_blank" rel="noopener" class="mt-4 inline-block text-sm text-volt hover:underline">Visit Cozy &amp; Clean ↗</a>` : ''}
      <div class="pointer-events-none absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-volt/0 blur-3xl transition group-hover:bg-volt/30"></div>
    </article>`).join('');
  document.getElementById('service-select').innerHTML = '<option value="">Select…</option>' + services.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  grid.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      animate(card, { rotateY: x * 14, rotateX: -y * 14, scale: 1.04 }, { duration: 0.25 });
    });
    card.addEventListener('pointerleave', () => animate(card, { rotateX: 0, rotateY: 0, scale: 1 }, { type: 'spring', stiffness: 300, damping: 18 }));
  });
  inView('#service-grid', () => { animate('.service-card', { opacity: [0, 1], y: [50, 0] }, { delay: stagger(0.1), duration: 0.6 }); });
}
renderServices(fallback.services);
// Runtime content: static content/services.json (GitHub Pages), then /api/content (Node server), else bundled fallback.
const BASE = import.meta.env.BASE_URL;
(async () => {
  for (const url of [`${BASE}content/services.json?v=${Date.now()}`, `${BASE}api/content`]) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) continue; const d = await r.json(); if (d?.services?.length) { renderServices(d.services); return; } } catch {}
  }
})();

// Page-view beacon: only when a Node API is deployed (VITE_API_ENABLED=1). No-op on static hosting.
if (import.meta.env.VITE_API_ENABLED) try { navigator.sendBeacon?.('/api/pageview', new Blob([JSON.stringify({ path: location.pathname, ref: document.referrer })], { type: 'application/json' })); } catch {}

// Booking form
const form = document.getElementById('booking-form');
const status = document.getElementById('form-status');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.phone || !data.email || !data.service || !data.county) {
    status.className = 'sm:col-span-2 text-sm text-ember'; status.textContent = 'Please fill in name, phone, email, service, and county.'; return;
  }
  if (data.website) return; // honeypot
  const bad = msg => { status.className = 'sm:col-span-2 text-sm text-ember'; status.textContent = msg; };
  if (!['Wayne', 'Oakland'].includes(data.county)) return bad('Sorry, we only serve Wayne and Oakland Counties, MI.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) || data.phone.replace(/\D/g, '').length < 10) return bad('Please enter a valid email and 10-digit phone number.');
  const serviceTitle = document.querySelector(`#service-select option[value="${CSS.escape(data.service)}"]`)?.textContent || data.service;
  status.className = 'sm:col-span-2 text-sm text-zinc-400'; status.textContent = 'Sending…';
  try {
    // Booking Boss intake: FormSubmit relays to the Ragnarok LLC inbox, which Booking Boss sweeps at 9 AM and 6 PM.
    const payload = {
      _subject: `[Booking Request] ${serviceTitle} - ${data.name}`,
      _template: 'table', _captcha: 'false', _honey: '', _replyto: data.email,
      Name: data.name, Phone: data.phone, Email: data.email, Service: serviceTitle, 'Service ID': data.service,
      County: data.county, 'Preferred Date': data.preferredDate || '(none)', 'Address / Details': data.message || '(none)',
      'Page': location.href, 'Submitted At': new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' }) + ' ET',
    };
    const res = await fetch('https://formsubmit.co/ajax/ragnarokllc1981@gmail.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || String(out.success) === 'false') throw new Error(out.message || 'Request failed');
    form.reset(); status.className = 'sm:col-span-2 text-sm text-volt font-semibold';
    status.textContent = "Got it! We'll reach out within one business day.";
  } catch (err) {
    status.className = 'sm:col-span-2 text-sm text-ember';
    status.textContent = `${err.message}. You can also call 313-643-0815 or email ragnarokllc1981@gmail.com.`;
  }
});
