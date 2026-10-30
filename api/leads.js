// Vercel function: POST /api/leads. Emails the booking request to the Ragnarok LLC inbox
// (Booking Boss sweeps it) via the Gmail API. Same rules as server/index.js.
// Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN (gmail.send scope), LEAD_EMAIL.

const SERVICES = { inspection: 'ICA Certified Home Inspections', 'small-engine': 'Small Engine Repair', handyman: 'Light Handyman', cleaning: 'Cleaning Coordination' };
const COUNTIES = ['Wayne', 'Oakland'];
const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

async function gmailSend({ to, replyTo, subject, text }) {
  const env = process.env;
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then(r => r.json());
  if (!tok.access_token) throw new Error(`token: ${tok.error || 'no access_token'}`);
  const mime = [
    `To: ${to}`, `Reply-To: ${replyTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    Buffer.from(text).toString('base64'),
  ].join('\r\n');
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
  });
  if (!r.ok) throw new Error(`gmail ${r.status}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b.website) return res.json({ ok: true }); // honeypot
  const lead = {
    name: clip(b.name, 120), phone: clip(b.phone, 40), email: clip(b.email, 200),
    service: clip(b.service, 40), county: clip(b.county, 20),
    preferredDate: clip(b.preferredDate, 20), message: String(b.message ?? '').trim().slice(0, 2000), page: clip(b.page, 300),
  };
  const errors = [];
  if (!lead.name) errors.push('name');
  if (lead.phone.replace(/\D/g, '').length < 10) errors.push('phone');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) errors.push('email');
  if (!SERVICES[lead.service]) errors.push('service');
  if (!COUNTIES.includes(lead.county)) errors.push('county (Wayne or Oakland only)');
  if (errors.length) return res.status(400).json({ error: `Invalid: ${errors.join(', ')}` });

  const service = SERVICES[lead.service];
  const text = [
    `Name: ${lead.name}`, `Phone: ${lead.phone}`, `Email: ${lead.email}`, `Service: ${service}`, `Service ID: ${lead.service}`,
    `County: ${lead.county}`, `Preferred Date: ${lead.preferredDate || '(none)'}`, `Address / Details: ${lead.message || '(none)'}`,
    `Page: ${lead.page || '(unknown)'}`, `Submitted At: ${new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' })} ET`,
  ].join('\n');
  try {
    await gmailSend({ to: process.env.LEAD_EMAIL || 'ragnarokllc1981@gmail.com', replyTo: lead.email, subject: `[Booking Request] ${service} - ${lead.name}`, text });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[leads] send failed', err.message);
    res.status(502).json({ error: 'Could not send right now' });
  }
}
