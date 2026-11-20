// Online booking on the home page (#book): pick home size, day and time, details, payment option,
// then hold the time and go to Stripe. Talks to the inspection app's public booking API, which
// computes the real price and checks the slot again. Until online booking is switched on
// (VITE_ONLINE_BOOKING=1 at build time), it only appears with ?booking=test in the address, and
// everyone else keeps the "Request a booking" form. If the API can't be reached, the request form stays.
import { createIcons, House, Building2, ChevronLeft, ChevronRight, CreditCard, Banknote, Lock, Clock, LoaderCircle } from 'lucide';

const API = (import.meta.env.VITE_BOOKING_API || 'https://home-inspection-app-pi.vercel.app/api/public/booking').replace(/\/+$/, '');
const DAYS_PER_PAGE = 6;

const on = import.meta.env.VITE_ONLINE_BOOKING === '1' || new URLSearchParams(location.search).get('booking') === 'test';
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const icons = (/** @type {Element} */ root) => createIcons({ icons: { House, Building2, ChevronLeft, ChevronRight, CreditCard, Banknote, Lock, Clock, LoaderCircle }, attrs: { 'aria-hidden': 'true' }, root });

/** @param {unknown} s */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
/** @param {number} cents */
const money = cents => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
/** A calendar date ("2026-11-18") in words, without the browser's time zone shifting it. */
const dayWords = (/** @type {string} */ date, /** @type {Intl.DateTimeFormatOptions} */ opts) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

/** @typedef {{ start: string, end: string, time: string, label: string, open: boolean }} Slot */
/** @typedef {{ date: string, weekday: number, slots: Slot[] }} Day */
/** @typedef {{ tier: string, label: string, cents: number, property_type: string, max_sqft: number | null }} Price */

const state = {
  /** @type {Price[]} */ prices: [],
  /** @type {Day[]} */ days: [],
  page: 0,
  /** @type {string | null} */ date: null,
  /** @type {Slot | null} */ slot: null,
  sending: false,
};

/** @param {string} path */
async function getJson(path) {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

const form = /** @type {HTMLFormElement} */ ($('bk-form'));
const field = (/** @type {string} */ name) => /** @type {HTMLInputElement} */ (form.elements.namedItem(name));
const value = (/** @type {string} */ name) => {
  const el = form.elements.namedItem(name);
  return el && 'value' in el ? String(el.value).trim() : '';
};
const sqftNumber = () => Math.round(Number(value('sqft').replace(/[,\s]/g, '')));

/** Same table the server uses (the server's figure is the one charged). */
function currentPrice() {
  if (value('property_type') === 'condo') return state.prices.find(p => p.property_type === 'condo') || null;
  const sqft = sqftNumber();
  if (!(sqft >= 100 && sqft <= 50000)) return null;
  return state.prices.find(p => p.property_type === 'house' && (p.max_sqft === null || sqft <= p.max_sqft)) || null;
}

function renderPrice() {
  const condo = value('property_type') === 'condo';
  $('bk-sqft-field').hidden = condo;
  const p = currentPrice();
  $('bk-price').textContent = p ? money(p.cents) : '';
  $('bk-tier').textContent = p ? p.label : 'Enter the square footage to see your price';
  $('bk-full-note').textContent = p ? `${money(p.cents)} by card, Apple Pay or Google Pay` : 'By card, Apple Pay or Google Pay';
  $('bk-deposit-note').textContent = p ? `${money(Math.ceil(p.cents / 2))} now, ${money(p.cents - Math.ceil(p.cents / 2))} cash at the inspection` : 'Cash balance due at the inspection';
  renderSummary();
}

function renderDays() {
  const pages = Math.max(1, Math.ceil(state.days.length / DAYS_PER_PAGE));
  state.page = Math.min(state.page, pages - 1);
  const shown = state.days.slice(state.page * DAYS_PER_PAGE, (state.page + 1) * DAYS_PER_PAGE);
  /** @type {HTMLButtonElement} */ ($('bk-prev')).disabled = state.page === 0;
  /** @type {HTMLButtonElement} */ ($('bk-next')).disabled = state.page >= pages - 1;
  $('bk-range').textContent = shown.length
    ? `${dayWords(shown[0].date, { month: 'short', day: 'numeric' })} – ${dayWords(shown[shown.length - 1].date, { month: 'short', day: 'numeric' })}`
    : '';
  $('bk-days').innerHTML = shown.map(d => {
    const open = d.slots.some(s => s.open);
    const picked = d.date === state.date;
    return `<button type="button" class="bk-day" role="radio" data-date="${d.date}" aria-checked="${picked}" ${open ? '' : 'disabled'}
      aria-label="${esc(dayWords(d.date, { weekday: 'long', month: 'long', day: 'numeric' }))}${open ? '' : ', fully booked'}">
      <small>${esc(dayWords(d.date, { weekday: 'short' }))}</small><strong>${esc(dayWords(d.date, { day: 'numeric' }))}</strong><small>${esc(dayWords(d.date, { month: 'short' }))}</small></button>`;
  }).join('');
  renderTimes();
}

function renderTimes() {
  const day = state.days.find(d => d.date === state.date);
  $('bk-times').innerHTML = day
    ? day.slots.map(s => `<button type="button" class="bk-time" role="radio" data-start="${esc(s.start)}" aria-checked="${state.slot?.start === s.start}" ${s.open ? '' : 'disabled'}
        aria-label="${esc(s.label)}${s.open ? '' : ', taken'}"><i data-lucide="clock"></i>${esc(s.label)}</button>`).join('')
    : '<p class="col-span-2 text-sm text-zinc-500">Pick a day to see open times.</p>';
  icons($('bk-times'));
  renderSummary();
}

function renderSummary() {
  const p = currentPrice();
  const deposit = value('payment_option') === 'deposit';
  const dueNow = p ? (deposit ? Math.ceil(p.cents / 2) : p.cents) : 0;
  const rows = [
    ['Inspection', p ? `${p.label} · ${money(p.cents)}` : '—'],
    ['When', state.slot && state.date ? `${dayWords(state.date, { weekday: 'long', month: 'long', day: 'numeric' })} at ${state.slot.label}` : '—'],
  ];
  if (p && deposit) rows.push(['Cash at the inspection', money(p.cents - dueNow)]);
  $('bk-summary').innerHTML = rows.map(([k, v]) => `<div class="bk-summary-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')
    + `<div class="bk-summary-row border-t border-zinc-800 pt-3 mt-1 text-lg"><dt class="!text-zinc-100 font-black">Due now</dt><dd class="font-display font-black text-volt">${p ? money(dueNow) : '—'}</dd></div>`;
  /** @type {HTMLElement} */ ($('bk-submit').querySelector('span')).textContent = p ? `Continue to payment · ${money(dueNow)}` : 'Continue to payment';
}

/** @param {string} msg @param {'bad' | 'info'} [tone] */
function say(msg, tone = 'bad') {
  const el = $('bk-status');
  el.className = `mt-4 text-sm ${tone === 'bad' ? 'text-ember' : 'text-zinc-400'}`;
  el.textContent = msg;
}

async function loadAvailability() {
  const a = await getJson('/availability');
  state.days = a.days || [];
  if (state.date && !state.days.some(d => d.date === state.date && d.slots.some(s => s.open))) state.date = null;
  if (state.slot && !state.days.some(d => d.slots.some(s => s.start === state.slot?.start && s.open))) state.slot = null;
  if (!state.date) {
    const first = state.days.findIndex(d => d.slots.some(s => s.open));
    if (first >= 0) { state.date = state.days[first].date; state.page = Math.floor(first / DAYS_PER_PAGE); }
  }
  renderDays();
}

/** Checks the form in the browser so people get quick, specific help. The server checks again. */
function problems() {
  const out = [];
  if (!currentPrice()) out.push(['sqft', 'the finished square footage']);
  if (!state.slot) out.push(['', 'a day and time']);
  if (!value('name')) out.push(['name', 'your name']);
  if (value('phone').replace(/\D/g, '').length < 10) out.push(['phone', 'a 10-digit phone number']);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value('email'))) out.push(['email', 'a valid email']);
  if (value('address').length < 6) out.push(['address', 'the property address']);
  return out;
}

async function submit(/** @type {SubmitEvent} */ e) {
  e.preventDefault();
  if (state.sending) return;
  const missing = problems();
  if (missing.length) {
    const words = missing.map(m => m[1]);
    say(`Please add ${words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]}.`);
    const first = missing.find(m => m[0]);
    if (first) field(first[0])?.focus();
    return;
  }
  state.sending = true;
  const btn = /** @type {HTMLButtonElement} */ ($('bk-submit'));
  btn.disabled = true;
  say('Holding your time…', 'info');
  try {
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: value('name'), phone: value('phone'), email: value('email'), address: value('address'),
        property_type: value('property_type'), sqft: value('property_type') === 'house' ? sqftNumber() : null,
        payment_option: value('payment_option'), notes: value('notes'), slot_start: state.slot?.start,
        page: location.href.split('?')[0], _hp_fax_x: value('_hp_fax_x'),
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 201 && out.checkout_url) {
      say('Opening secure checkout…', 'info');
      location.href = out.checkout_url;
      return; // keep the button disabled while the page changes
    }
    if (res.status === 201) { say('Thanks! Check your email for next steps.', 'info'); return; }
    if (res.status === 409) {
      state.slot = null;
      await loadAvailability().catch(() => {});
      say(out.error || 'Sorry, that time was just taken. Please pick another.');
      $('bk-days').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      say(out.error || 'Something went wrong. Please try again, or call 313-489-1202.');
    }
  } catch {
    say('We couldn’t reach the booking system. Please try again, or call 313-489-1202.');
  }
  state.sending = false;
  btn.disabled = false;
}

function wire() {
  form.addEventListener('input', e => {
    const t = /** @type {HTMLInputElement} */ (e.target);
    if (['property_type', 'sqft', 'payment_option'].includes(t.name)) renderPrice();
  });
  form.addEventListener('change', renderPrice);
  $('bk-days').addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button[data-date]');
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
    state.date = btn.dataset.date || null;
    state.slot = null;
    renderDays();
  });
  $('bk-times').addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button[data-start]');
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
    const day = state.days.find(d => d.date === state.date);
    state.slot = day?.slots.find(s => s.start === btn.dataset.start) || null;
    renderTimes();
  });
  $('bk-prev').addEventListener('click', () => { state.page = Math.max(0, state.page - 1); renderDays(); });
  $('bk-next').addEventListener('click', () => { state.page += 1; renderDays(); });
  form.addEventListener('submit', submit);
  // Coming back from Stripe with the browser's Back button can restore a stale page: refresh the times.
  addEventListener('pageshow', ev => {
    if (!ev.persisted) return;
    state.sending = false;
    /** @type {HTMLButtonElement} */ ($('bk-submit')).disabled = false;
    say('', 'info');
    loadAvailability().catch(() => {});
  });
}

async function start() {
  if (!on || !form) return;
  try {
    const [options] = await Promise.all([getJson('/options'), loadAvailability()]);
    state.prices = options.prices || [];
    if (!state.prices.length || !state.days.length) throw new Error('no prices or days');
  } catch (err) {
    console.warn('Online booking unavailable, showing the request form:', err);
    return;
  }
  $('request-booking').hidden = true;
  $('online-booking').hidden = false;
  icons($('online-booking'));
  wire();
  renderPrice();
}

start();
