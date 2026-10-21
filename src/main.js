import './style.css';
import gsap from 'gsap';
import { animate, inView, stagger } from 'motion';
import fallback from './services.fallback.json';
import { initHero } from './hero.js';

document.getElementById('yr').textContent = new Date().getFullYear();

// Hero (guard so a WebGL failure never breaks the page)
try { initHero(document.getElementById('hero-canvas')); }
catch (err) { console.warn('3D hero unavailable:', err.message); document.getElementById('hero').classList.add('no-webgl'); }

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
fetch('/api/content').then(r => r.ok ? r.json() : Promise.reject()).then(d => d?.services?.length && renderServices(d.services)).catch(() => {});

// Page-view beacon
try { navigator.sendBeacon?.('/api/pageview', new Blob([JSON.stringify({ path: location.pathname, ref: document.referrer })], { type: 'application/json' })); } catch {}

// Booking form
const form = document.getElementById('booking-form');
const status = document.getElementById('form-status');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.phone || !data.email || !data.service || !data.county) {
    status.className = 'sm:col-span-2 text-sm text-ember'; status.textContent = 'Please fill in name, phone, email, service, and county.'; return;
  }
  status.className = 'sm:col-span-2 text-sm text-zinc-400'; status.textContent = 'Sending…';
  try {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Request failed');
    form.reset(); status.className = 'sm:col-span-2 text-sm text-volt font-semibold';
    status.textContent = "Got it! We'll reach out within one business day.";
  } catch (err) {
    status.className = 'sm:col-span-2 text-sm text-ember';
    status.textContent = `${err.message}. You can also call 313-643-0815 or email ragnarokllc1981@gmail.com.`;
  }
});
