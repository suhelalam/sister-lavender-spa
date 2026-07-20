import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { maskName, normalizePhone, upsertCustomer } from '../../../lib/crm';

function bookingCustomer(doc) {
  const booking = doc.data();
  const customer = booking.customer || {};
  const name = String(customer.fullName || customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const email = String(customer.email || customer.emailAddress || '').trim().toLowerCase();
  return {
    id: null,
    bookingId: doc.id,
    maskedName: maskName(name),
    name,
    phone,
    email,
    appointmentAt: booking.startAt || null,
    services: Array.isArray(booking.services) ? booking.services : [],
    pointsBalance: 0,
    source: 'booking',
  };
}

export default async function handler(req, res) {
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer database is not configured.' });
  if (req.method === 'POST') {
    try { return res.status(201).json({ customer: await upsertCustomer(adminDb, req.body || {}) }); }
    catch (error) { return res.status(500).json({ error: error.message }); }
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const value = String(req.query.q || req.query.last4 || '').trim().toLowerCase();
  if (!value) return res.status(400).json({ error: 'Search value is required.' });
  try {
    let snapshot;
    const digits = normalizePhone(value);
    if (digits.length === 4) snapshot = await adminDb.collection('customers').where('phoneLast4', '==', digits).limit(10).get();
    else if (digits.length >= 10) snapshot = await adminDb.collection('customers').where('phoneNormalized', '==', digits).limit(10).get();
    else snapshot = await adminDb.collection('customers').where('searchTokens', 'array-contains', value).limit(20).get();
    let customers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, maskedName: maskName(data.name), name: data.name, phone: data.phone, email: data.email, pointsBalance: data.pointsBalance || 0, source: 'customer' };
    });

    // Existing appointments predate the CRM collection. Reuse their customer
    // details instead of treating an already-booked guest as a new customer.
    if (customers.length === 0 && digits.length >= 4) {
      const bookingsSnapshot = await adminDb
        .collection('customerBookings')
        .where('status', '==', 'active')
        .limit(200)
        .get();
      const bookingMatches = bookingsSnapshot.docs
        .map(bookingCustomer)
        .filter((customer) => {
          const bookingPhone = normalizePhone(customer.phone);
          return digits.length === 4
            ? bookingPhone.endsWith(digits)
            : bookingPhone === digits;
        })
        .sort((a, b) => {
          const today = new Date().toISOString().slice(0, 10);
          const aToday = String(a.appointmentAt || '').startsWith(today) ? 1 : 0;
          const bToday = String(b.appointmentAt || '').startsWith(today) ? 1 : 0;
          return bToday - aToday || String(a.appointmentAt || '').localeCompare(String(b.appointmentAt || ''));
        });
      const seen = new Set();
      customers = bookingMatches.filter((customer) => {
        const identity = `${normalizePhone(customer.phone)}|${customer.email}`;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      }).slice(0, 10);
    }
    return res.json({ customers, requiresFullPhone: digits.length === 4 && customers.length > 1 });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
