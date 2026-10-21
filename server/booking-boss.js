// ============================================================================
// BOOKING BOSS FORWARDING — CONFIG STUB (NOT YET INTEGRATED)
// Leads are always saved to data/leads.jsonl first. Forwarding is disabled
// until BOOKING_BOSS_URL is set. Confirm Booking Boss's real intake API (URL,
// auth header, field names) and update mapLead() before enabling.
// ============================================================================
const URL = process.env.BOOKING_BOSS_URL || '';          // e.g. https://<booking-boss-host>/intake  (TODO)
const TOKEN = process.env.BOOKING_BOSS_TOKEN || '';      // TODO: auth scheme unknown

function mapLead(lead) {
  // TODO: match Booking Boss's expected schema.
  return { source: 'hoffmanshomeservices-site', ...lead };
}

export async function forwardToBookingBoss(lead) {
  if (!URL) return { forwarded: false, reason: 'BOOKING_BOSS_URL not configured' };
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) },
    body: JSON.stringify(mapLead(lead)),
  });
  return { forwarded: res.ok, status: res.status };
}
