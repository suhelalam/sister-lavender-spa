import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { google } from 'googleapis';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'selena@sisterlavenderspa.com';
const TIME_ZONE = 'America/Chicago';

function formatLocalDateTime(value) {
  if (!value) return '';
  if (value.length === 16) return `${value}:00`;
  return value;
}

function addMinutesToLocalDateTime(value, minutes) {
  const [datePart, timePart] = String(value).split('T');
  if (!datePart || !timePart) return value;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  date.setUTCMinutes(date.getUTCMinutes() + Number(minutes));
  const padded = (num) => String(num).padStart(2, '0');
  return `${date.getUTCFullYear()}-${padded(date.getUTCMonth() + 1)}-${padded(date.getUTCDate())}T${padded(date.getUTCHours())}:${padded(date.getUTCMinutes())}:00`;
}

function formatServicePrice(price) {
  if (!Number.isFinite(price)) return null;
  return `$${(price / 100).toFixed(2)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdminConfigured || !adminDb) {
    return res.status(500).json({ error: 'Admin Firestore is not configured' });
  }

  const {
    customerName,
    email,
    phone,
    notes,
    agreed,
    signature,
    startAt,
    services,
  } = req.body || {};

  if (!customerName || !Array.isArray(services) || services.length === 0 || !startAt || !agreed || !signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedServices = services.map((service) => ({
    serviceName: String(service.name || service.label || 'Walk-in service').trim(),
    durationMinutes: Number(service.durationMinutes || 30),
    price: Number(service.price || 0),
    priceLabel: service.priceLabel || (Number(service.price) > 0 ? formatServicePrice(Number(service.price)) : null),
  }));

  const totalDuration = normalizedServices.reduce((sum, item) => sum + item.durationMinutes, 0);
  const totalPrice = normalizedServices.reduce((sum, item) => sum + (item.price || 0), 0);
  const serviceList = normalizedServices
    .map((item) => `- ${item.serviceName} (${item.durationMinutes} min${item.priceLabel ? `, ${item.priceLabel}` : ''})`)
    .join('\n');
  const startDateTime = formatLocalDateTime(startAt);
  const endDateTime = addMinutesToLocalDateTime(startDateTime, totalDuration);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const client = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: client });

    const eventResponse = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `Walk-in check-in: ${customerName}`,
        description: `Walk-in check-in for ${customerName}\nServices:\n${serviceList}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nNotes: ${notes || 'None'}`,
        start: {
          dateTime: startDateTime,
          timeZone: TIME_ZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: TIME_ZONE,
        },
      },
    });

    const event = eventResponse.data;
    const bookingId = event.id;
    const now = new Date().toISOString();

    await adminDb.collection('customerBookings').doc(bookingId).set({
      bookingId,
      status: 'active',
      createdAt: now,
      canceledAt: null,
      calendarEventId: bookingId,
      calendarEventLink: event.htmlLink || '',
      startAt: startDateTime,
      locationId: CALENDAR_ID,
      totalFormatted: totalPrice > 0 ? formatServicePrice(totalPrice) : null,
      note: notes || null,
      customer: {
        fullName: customerName,
        email: String(email || '').trim().toLowerCase(),
        phone: String(phone || '').trim(),
      },
      services: normalizedServices.map((item) => ({
        serviceName: item.serviceName,
        durationMinutes: item.durationMinutes,
        quantity: 1,
        priceLabel: item.priceLabel,
        price: item.price,
      })),
      followUpEmail: {
        status: 'scheduled',
        sendAt: new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        sentAt: null,
        error: null,
      },
    });

    await adminDb.collection('checkins').add({
      bookingId,
      customerName,
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      notes: String(notes || '').trim(),
      services: normalizedServices,
      totalServiceDurationMinutes: totalDuration,
      totalServicePrice: totalPrice,
      totalFormatted: totalPrice > 0 ? formatServicePrice(totalPrice) : null,
      startAt: startDateTime,
      agreed: Boolean(agreed),
      signature: String(signature),
      source: 'walk-in',
      timestamp: now,
    });

    return res.status(200).json({ success: true, bookingId, eventLink: event.htmlLink || null });
  } catch (error) {
    console.error('Walk-in booking failed:', error);
    return res.status(500).json({ error: 'Failed to create walk-in booking' });
  }
}
