import crypto from 'crypto';
import { google } from 'googleapis';
import { fromZonedTime } from 'date-fns-tz';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { displayEventDate, escapeHtml, getGroupEventTransporter, hashGroupEventToken } from '../../../lib/groupEvents';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'selena@sisterlavenderspa.com';
const TIME_ZONE = 'America/Chicago';

function tokenMatches(expected, token) {
  if (!expected || !token) return false;
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hashGroupEventToken(token), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function loadInquiry(id, token) {
  if (!id || !token || !adminDb) return null;
  const snapshot = await adminDb.collection('groupEventInquiries').doc(String(id)).get();
  if (!snapshot.exists || !tokenMatches(snapshot.data().confirmationTokenHash, String(token))) return null;
  return { ref: snapshot.ref, data: snapshot.data() };
}

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

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method Not Allowed' });
  if (!isAdminConfigured) return res.status(503).json({ error: 'Event management is temporarily unavailable.' });
  const source = req.method === 'GET' ? req.query : req.body;
  const inquiry = await loadInquiry(source?.id, source?.token);
  if (!inquiry) return res.status(404).json({ error: 'This management link is invalid or expired.' });
  const { data, ref } = inquiry;

  if (req.method === 'GET') {
    return res.status(200).json({
      event: {
        name: data.name, email: data.email, phone: data.phone,
        eventDate: data.eventDate, preferredTime: data.preferredTime,
        eventWhen: displayEventDate(data.eventDate, data.preferredTime),
        guestCount: data.guestCount, occasion: data.occasion,
        services: data.services, notes: data.notes || '', status: data.status,
      },
    });
  }
  if (data.status !== 'confirmed') return res.status(409).json({ error: `This event is already ${data.status}.` });

  const transporter = getGroupEventTransporter();
  const ownerEmail = process.env.WORK_EMAIL || 'selena@sisterlavenderspa.com';
  const calendar = await getCalendar();

  if (req.method === 'PUT') {
    const eventDate = String(source?.eventDate || '').trim();
    const preferredTime = String(source?.preferredTime || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) {
      return res.status(400).json({ error: 'Choose a valid date and time.' });
    }
    const start = fromZonedTime(`${eventDate}T${preferredTime}:00`, TIME_ZONE);
    if (start.getTime() <= Date.now()) return res.status(400).json({ error: 'Choose a future date and time.' });
    const duration = Math.max(1, Number(process.env.GROUP_EVENT_DURATION_MINUTES) || 120);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    await calendar.events.patch({
      calendarId: data.calendarId || CALENDAR_ID,
      eventId: data.calendarEventId,
      requestBody: {
        start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
      },
    });
    const previousWhen = displayEventDate(data.eventDate, data.preferredTime);
    const newWhen = displayEventDate(eventDate, preferredTime);
    await ref.update({ eventDate, preferredTime, updatedAt: new Date().toISOString(), updatedBy: 'owner' });
    await Promise.all([
      transporter.sendMail({
        from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`, to: data.email,
        subject: `Your group event time was updated - ${newWhen}`,
        text: `Hi ${data.name},\n\nYour confirmed group event has been updated.\n\nPrevious date/time: ${previousWhen}\nNew date/time: ${newWhen}\nGuests: ${data.guestCount}\nServices: ${data.services}\n\nQuestions? Call (312) 900-3131.`,
        html: `<h2>Your group event was updated</h2><p>Hi ${escapeHtml(data.name)},</p><p><strong>Previous date/time:</strong> ${escapeHtml(previousWhen)}<br><strong>New date/time:</strong> ${escapeHtml(newWhen)}</p><p>Guests: ${data.guestCount}<br>Services: ${escapeHtml(data.services)}</p>`,
      }),
      transporter.sendMail({
        from: `"Group Event Updates" <${process.env.SMTP_USER}>`, to: ownerEmail,
        subject: `Group event updated: ${data.name} - ${newWhen}`,
        text: `The group event for ${data.name} was updated.\n\nPrevious: ${previousWhen}\nNew: ${newWhen}`,
      }),
    ]);
    return res.status(200).json({ success: true, eventWhen: newWhen });
  }

  try {
    await calendar.events.delete({ calendarId: data.calendarId || CALENDAR_ID, eventId: data.calendarEventId });
  } catch (error) {
    const status = error?.code || error?.response?.status;
    if (status !== 404 && status !== 410) throw error;
  }
  const canceledAt = new Date().toISOString();
  await ref.update({ status: 'canceled', canceledAt, canceledBy: 'owner' });
  const eventWhen = displayEventDate(data.eventDate, data.preferredTime);
  await Promise.all([
    transporter.sendMail({
      from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`, to: data.email,
      subject: `Your group event was canceled - ${eventWhen}`,
      text: `Hi ${data.name},\n\nYour group event scheduled for ${eventWhen} has been canceled. Please call us at (312) 900-3131 if you have questions or would like to discuss another date.`,
      html: `<h2>Group event canceled</h2><p>Hi ${escapeHtml(data.name)},</p><p>Your group event scheduled for <strong>${escapeHtml(eventWhen)}</strong> has been canceled.</p><p>Please call (312) 900-3131 if you have questions or would like to discuss another date.</p>`,
    }),
    transporter.sendMail({
      from: `"Group Event Updates" <${process.env.SMTP_USER}>`, to: ownerEmail,
      subject: `Group event canceled: ${data.name} - ${eventWhen}`,
      text: `The group event for ${data.name} on ${eventWhen} was canceled and removed from Google Calendar.`,
    }),
  ]);
  return res.status(200).json({ success: true });
}
