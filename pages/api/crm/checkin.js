import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { createVisit, upsertCustomer } from '../../../lib/crm';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'selena@sisterlavenderspa.com';
const CHECKED_IN_COLOR_ID = '10'; // Google Calendar "Basil" green.
const TIME_ZONE = 'America/Chicago';

async function getCalendar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth: await auth.getClient() });
}

async function markCalendarEventCheckedIn(eventId) {
  const calendar = await getCalendar();
  const current = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const currentTitle = String(current.data.summary || 'Appointment').trim();
  const guestTitle = currentTitle
    .replace(/^checked-in\s*[-:–—]?\s*/i, '')
    .replace(/^appointment\s*[-:–—]?\s*/i, '')
    .trim() || 'Guest';
  const summary = `Checked-in - ${guestTitle}`;

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: { summary, colorId: CHECKED_IN_COLOR_ID },
  });
}

async function createWalkInCalendarEvent(body) {
  const calendar = await getCalendar();
  const start = new Date();
  const durationMinutes = Math.max(15, body.services.reduce(
    (sum, service) => sum + Math.max(0, Number(service.durationMinutes || 0)),
    0
  ) || 30);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const serviceLines = body.services
    .map((service) => `- ${service.name || service.serviceName || service.label || 'Service'} × ${Math.max(1, Number(service.quantity || 1))} (${Number(service.durationMinutes || 0)} min each)`)
    .join('\n');

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `Walk-in - ${String(body.name || 'Guest').trim()}`,
      description: `Walk-in checked in\n\nServices:\n${serviceLines}\n\nPhone: ${body.phone || 'Not provided'}\nEmail: ${body.email || 'Not provided'}\nNotes: ${body.notes || 'None'}`,
      start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
      end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
      colorId: CHECKED_IN_COLOR_ID,
    },
  });
  return response.data;
}

async function sendWalkInNotification(body, visit) {
  const recipient = process.env.WORK_EMAIL;
  if (!recipient) throw new Error('WORK_EMAIL is not configured');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const services = body.services
    .map((service) => `${service.name || service.serviceName || service.label || 'Service'} × ${Math.max(1, Number(service.quantity || 1))} (${Number(service.durationMinutes || 0)} min each)`)
    .join('\n');
  const checkedInAt = new Date(visit.checkedInAt).toLocaleString('en-US', {
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await transporter.sendMail({
    from: `"Sister Lavender Check-in" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `Walk-in checked in - ${body.name || 'Guest'}`,
    text: `A walk-in guest has checked in.\n\nName: ${body.name || 'Guest'}\nTime: ${checkedInAt}\nPhone: ${body.phone || 'Not provided'}\nEmail: ${body.email || 'Not provided'}\n\nServices:\n${services}\n\nNotes: ${body.notes || 'None'}`,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer database is not configured.' });
  try {
    const body = req.body || {};
    if (!body.customerId && !body.name) return res.status(400).json({ error: 'A guest name is required.' });
    if (!body.skipProfile && !body.customerId && !body.phone) return res.status(400).json({ error: 'A full phone number is required to create a profile.' });
    if (!Array.isArray(body.services) || !body.services.length) return res.status(400).json({ error: 'Select at least one service.' });
    if (!body.consent) return res.status(400).json({ error: 'Service consent is required.' });
    let calendarEvent = null;
    if (body.bookingId) {
      try {
        await markCalendarEventCheckedIn(body.bookingId);
      } catch (error) {
        console.error('Failed to mark calendar appointment as checked in:', error);
        return res.status(502).json({ error: 'We found your appointment, but could not notify the staff. Please ask the front desk for help.' });
      }
    } else {
      try {
        calendarEvent = await createWalkInCalendarEvent(body);
      } catch (error) {
        console.error('Failed to add walk-in to the calendar:', error);
        return res.status(502).json({ error: 'We could not notify the staff about this walk-in. Please ask the front desk for help.' });
      }
    }
    const customer = body.skipProfile ? null : await upsertCustomer(adminDb, body);
    const visit = await createVisit(adminDb, customer, {
      bookingId: body.bookingId, appointmentAt: body.appointmentAt, services: body.services,
      serviceTotalCents: body.services.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0),
      durationMinutes: body.services.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0),
      notes: body.notes, safetyNotes: body.safetyNotes, name: body.name, phone: body.phone,
      calendarEventId: body.bookingId || calendarEvent?.id || null,
      source: body.bookingId ? 'appointment' : 'walk-in',
    });
    await adminDb.collection('checkins').doc(visit.id).set({ ...visit, customerId: customer?.id || null, visitId: visit.id }, { merge: true });
    if (body.bookingId) {
      await adminDb.collection('customerBookings').doc(body.bookingId).set({ checkedInAt: visit.checkedInAt }, { merge: true });
    } else {
      try {
        await sendWalkInNotification(body, visit);
        await adminDb.collection('checkins').doc(visit.id).set({ staffNotification: { status: 'sent', sentAt: new Date().toISOString(), recipient: process.env.WORK_EMAIL } }, { merge: true });
      } catch (error) {
        console.error('Failed to send walk-in notification email:', error);
        await adminDb.collection('checkins').doc(visit.id).set({ staffNotification: { status: 'failed', error: error.message, attemptedAt: new Date().toISOString() } }, { merge: true });
      }
    }
    return res.status(201).json({ customer: customer || { name: body.name, pointsBalance: null }, visit, calendarEventId: body.bookingId || calendarEvent?.id || null });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
