import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { maskName, normalizePhone, upsertCustomer } from '../../../lib/crm';
import { fromZonedTime } from 'date-fns-tz';
import { google } from 'googleapis';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'selena@sisterlavenderspa.com';
const TIME_ZONE = 'America/Chicago';

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

function dateKeyInTimeZone(value, timeZone = 'America/Chicago') {
  if (!value) return '';
  const rawValue = String(value);
  // Firestore also contains walk-in timestamps saved as local calendar time.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(rawValue)) return rawValue.slice(0, 10);
  const date = value?.toDate?.() || new Date(value);
  if (Number.isNaN(date.getTime())) return rawValue.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

async function findTodaysBookings(digits) {
  if (digits.length < 4) return [];
  const today = dateKeyInTimeZone(new Date());
  const snapshot = await adminDb
    .collection('customerBookings')
    .where('status', '==', 'active')
    .limit(500)
    .get();

  return snapshot.docs
    .map(bookingCustomer)
    .filter((booking) => {
      const bookingPhone = normalizePhone(booking.phone);
      const phoneMatches = digits.length === 4
        ? bookingPhone.endsWith(digits)
        : bookingPhone === digits;
      return phoneMatches && dateKeyInTimeZone(booking.appointmentAt) === today;
    })
    .sort((a, b) => String(a.appointmentAt || '').localeCompare(String(b.appointmentAt || '')));
}

function calendarEventCustomer(event) {
  const description = String(event.description || '');
  const field = (name) => description.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
  const serviceBlock = description.match(/SERVICES BOOKED[^\n]*\n[^\n]*\n([\s\S]*?)(?:\n[^\n]*NOTES|$)/i)?.[1]
    || description.match(/Services:\s*\n([\s\S]*?)(?:\n\s*(?:Phone|Email|Notes):|$)/i)?.[1]
    || '';
  const services = serviceBlock.split('\n').map((line) => {
    const clean = line.replace(/^\s*(?:[•+-]|-\s*)+\s*/, '').trim();
    if (!clean || !/[a-z0-9\u3400-\u9fff]/i.test(clean) || /^none$/i.test(clean)) return null;
    const quantity = Number(clean.match(/\bx\s*(\d+)\s*$/i)?.[1] || 1);
    const durationMinutes = Number(clean.match(/\((\d{1,3})\s*min(?:ute)?s?\)/i)?.[1] || 0);
    const serviceName = clean
      .replace(/\s*\(\d{1,3}\s*min(?:ute)?s?\)/i, '')
      .replace(/\s+x\s*\d+\s*$/i, '')
      .trim();
    return serviceName ? { serviceName, durationMinutes, quantity } : null;
  }).filter(Boolean);
  const name = field('NAME') || String(event.summary || '').replace(/^checked-in\s*[-:–—]?\s*/i, '').trim();
  const phone = field('PHONE').replace(/[^\d+(). -].*$/, '').trim();
  return {
    id: null,
    bookingId: event.id,
    maskedName: maskName(name),
    name,
    phone,
    email: field('EMAIL').toLowerCase(),
    appointmentAt: event.start?.dateTime || event.start?.date || null,
    services,
    pointsBalance: 0,
    source: 'calendar',
  };
}

async function findTodaysCalendarBookings(digits) {
  if (digits.length < 4 || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return [];
  const today = dateKeyInTimeZone(new Date());
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  const calendar = google.calendar({ version: 'v3', auth: await auth.getClient() });
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: fromZonedTime(`${today}T00:00:00`, TIME_ZONE).toISOString(),
    timeMax: fromZonedTime(`${tomorrowKey}T00:00:00`, TIME_ZONE).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });
  return (response.data.items || [])
    .filter((event) => event.status !== 'cancelled')
    .map(calendarEventCustomer)
    .filter((booking) => {
      const phone = normalizePhone(booking.phone);
      return digits.length === 4 ? phone.endsWith(digits) : phone === digits;
    });
}

export default async function handler(req, res) {
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer database is not configured.' });
  if (req.method === 'POST') {
    try { return res.status(201).json({ customer: await upsertCustomer(adminDb, req.body || {}) }); }
    catch (error) { return res.status(500).json({ error: error.message }); }
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const value = String(req.query.q || req.query.last4 || '').trim().toLowerCase();
  const profilesOnly = req.query.profilesOnly === '1';
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

    // A kiosk lookup is visit-first: today's appointment carries the booking ID
    // and booked services that must be checked in, even when a CRM profile exists.
    let todaysBookings = profilesOnly ? [] : await findTodaysBookings(digits);
    if (!profilesOnly) {
      try {
        const calendarBookings = await findTodaysCalendarBookings(digits);
        const storedBookingIds = new Set(todaysBookings.map((booking) => booking.bookingId));
        todaysBookings = [...todaysBookings, ...calendarBookings.filter((booking) => !storedBookingIds.has(booking.bookingId))]
          .sort((a, b) => String(a.appointmentAt || '').localeCompare(String(b.appointmentAt || '')));
      } catch (error) {
        // A temporary Calendar outage should not hide appointments already stored in Firestore.
        console.error('Calendar appointment lookup failed:', error);
      }
    }
    if (todaysBookings.length) {
      const customersByPhone = new Map(customers.map((customer) => [normalizePhone(customer.phone), customer]));
      customers = todaysBookings.map((booking) => {
        const profile = customersByPhone.get(normalizePhone(booking.phone));
        return profile
          ? { ...profile, ...booking, id: profile.id, pointsBalance: profile.pointsBalance }
          : booking;
      });
    }

    // Existing appointments predate the CRM collection. Reuse their customer
    // details instead of treating an already-booked guest as a new customer.
    if (!profilesOnly && customers.length === 0 && digits.length >= 4) {
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
    const uniquePhones = new Set(customers.map((customer) => normalizePhone(customer.phone)).filter(Boolean));
    return res.json({
      customers,
      hasTodaysAppointment: todaysBookings.length > 0,
      // Multiple appointments for one guest are safe to display; different phone
      // numbers sharing the last four digits require full-phone verification.
      requiresFullPhone: digits.length === 4 && uniquePhones.size > 1,
    });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
