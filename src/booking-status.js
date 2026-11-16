// /book/thanks/ (after Stripe payment) and /book/ (payment cancelled, hold expired, or link reopened).
// Reads ?booking=<id> and asks the inspection app's public booking API for the status.
import './style.css';
import { createIcons, CircleCheck, CalendarDays, MapPin, Banknote, Clock, Phone, CircleAlert, LoaderCircle, CreditCard } from 'lucide';

const API = (import.meta.env.VITE_BOOKING_API || 'https://home-inspection-app-pi.vercel.app/api/public/booking').replace(/\/+$/, '');
const PHONE = '313-489-1202';
const root = /** @type {HTMLElement} */ (document.getElementById('booking-status'));
const mode = root.dataset.mode; // "thanks" | "book"
const params = new URLSearchParams(location.search);
const id = params.get('booking') || '';

/** @param {unknown} s */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
/** @param {number} cents */
const money = cents => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const icons = () => createIcons({ icons: { CircleCheck, CalendarDays, MapPin, Banknote, Clock, Phone, CircleAlert, LoaderCircle, CreditCard }, attrs: { 'aria-hidden': 'true' } });

/** @param {string} icon @param {string} label @param {string} value */
const row = (icon, label, value) => `
  <div class="flex items-start gap-4 py-4 border-t border-zinc-800 first:border-t-0">
    <i data-lucide="${icon}" class="w-5 h-5 mt-0.5 shrink-0 text-volt"></i>
    <div><p class="text-xs font-mono uppercase tracking-widest text-zinc-500">${esc(label)}</p><p class="mt-1 text-lg font-semibold">${value}</p></div>
  </div>`;

/** @param {{ icon: string, tone: 'volt' | 'ember' | 'zinc', kicker: string, title: string, lead: string, card?: string, actions?: string }} p */
function show(p) {
  const tone = { volt: 'text-volt', ember: 'text-ember', zinc: 'text-zinc-400' }[p.tone];
  root.innerHTML = `
    <p class="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest ${tone}"><i data-lucide="${p.icon}" class="w-5 h-5"></i>${esc(p.kicker)}</p>
    <h1 class="mt-4 font-display text-5xl sm:text-7xl font-black leading-[0.95] tracking-tight">${esc(p.title)}</h1>
    <p class="mt-6 max-w-xl text-lg font-extralight text-zinc-300">${p.lead}</p>
    ${p.card ? `<div class="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-2 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]">${p.card}</div>` : ''}
    <div class="mt-8 flex flex-wrap gap-4">${p.actions || ''}
      <a href="tel:+13134891202" class="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-6 py-3.5 font-semibold hover:border-volt hover:text-volt transition"><i data-lucide="phone" class="w-4 h-4"></i>${PHONE}</a>
    </div>`;
  icons();
}

/** @param {any} b */
function details(b) {
  const balance = b.balance_cents > 0 ? `${money(b.balance_cents)} in cash at the inspection` : 'Nothing, you’re paid in full';
  return row('calendar-days', 'When', `${esc(b.when)} <span class="font-extralight text-zinc-400">(about 3–3½ hours)</span>`)
    + row('map-pin', 'Where', esc(b.address))
    + row('banknote', 'Paid online', money(b.paid_cents))
    + row('clock', 'Due at the inspection', balance);
}

/** @param {any} b */
function render(b) {
  if (b.status === 'confirmed' || b.status === 'completed') {
    return show({
      icon: 'circle-check', tone: 'volt', kicker: 'Payment received', title: 'You’re booked.',
      lead: 'Your inspection is confirmed and a confirmation email is on its way. We’ll send a reminder the day before. Please make sure the electrical panel, furnace, water heater, attic access and crawlspace are reachable, and that utilities are on.',
      card: details(b),
      actions: '<a href="/" class="rounded-xl bg-volt text-ink font-black px-6 py-3.5 hover:scale-105 transition">Back to home</a>'
    });
  }
  if (b.status === 'held') {
    const until = new Date(b.hold_expires_at).toLocaleString('en-US', { timeZone: 'America/Detroit', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return show({
      icon: 'credit-card', tone: 'ember', kicker: 'Not paid yet', title: 'Your time is still held.',
      lead: `We’re holding ${esc(b.when)} for you until ${esc(until)}. Pay the ${money(b.due_now_cents)} ${b.payment_option === 'deposit' ? 'deposit' : 'inspection fee'} to confirm it.`,
      actions: `<a href="${esc(`${API}/${encodeURIComponent(b.id)}/pay`)}" class="inline-flex items-center gap-2 rounded-xl bg-volt text-ink font-black px-6 py-3.5 hover:scale-105 transition"><i data-lucide="credit-card" class="w-4 h-4"></i>Pay ${money(b.due_now_cents)}</a>`
    });
  }
  return show({
    icon: 'circle-alert', tone: 'zinc', kicker: b.status === 'expired' ? 'Hold ended' : 'Booking closed',
    title: 'This booking isn’t active.',
    lead: b.status === 'expired'
      ? 'The payment window for this time ran out, so it was released. Please book a new time or give us a call.'
      : 'This booking was cancelled. If you were charged, the refund is on its way to your card. Please book a new time or give us a call.',
    actions: '<a href="/#book" class="rounded-xl bg-volt text-ink font-black px-6 py-3.5 hover:scale-105 transition">Book a new time</a>'
  });
}

function notFound() {
  show({
    icon: 'circle-alert', tone: 'zinc', kicker: 'Booking not found', title: 'We couldn’t find that booking.',
    lead: mode === 'thanks'
      ? 'If you just paid, check your email for the confirmation, or call us and we’ll sort it out.'
      : 'The link may be incomplete. Please book a time or call us.',
    actions: '<a href="/#book" class="rounded-xl bg-volt text-ink font-black px-6 py-3.5 hover:scale-105 transition">Book a new time</a>'
  });
}

/** Stripe sends the customer here a moment before its "paid" notice reaches us, so wait for it. */
async function load(attempt = 0) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
  try {
    const res = await fetch(`${API}/${encodeURIComponent(id)}/status`, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return notFound();
    if (!res.ok) throw new Error(String(res.status));
    const b = await res.json();
    if (mode === 'thanks' && b.status === 'held' && attempt < 15) {
      show({ icon: 'loader-circle', tone: 'volt', kicker: 'Almost done', title: 'Confirming your payment…', lead: 'This usually takes a few seconds. Please keep this page open.' });
      root.querySelector('svg')?.classList.add('animate-spin');
      return setTimeout(() => load(attempt + 1), 2000);
    }
    render(b);
  } catch {
    if (attempt < 3) return setTimeout(() => load(attempt + 1), 2000);
    show({
      icon: 'circle-alert', tone: 'zinc', kicker: 'Connection problem', title: 'We couldn’t load your booking.',
      lead: mode === 'thanks' ? 'If you just paid, your confirmation email has the details. Refresh to try again, or call us.' : 'Refresh to try again, or call us.'
    });
  }
}

load();
