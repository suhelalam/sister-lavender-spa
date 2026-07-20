import crypto from 'crypto';
import { google } from 'googleapis';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { displayEventDate, escapeHtml, getGroupEventTransporter, getSiteUrl, hashGroupEventToken } from '../../../lib/groupEvents';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'selena@sisterlavenderspa.com';
const TIME_ZONE = 'America/Chicago';
const GROUP_EVENT_COLOR_ID = '11'; // Google Calendar "Tomato" (red)

function addMinutesToLocalDateTime(value, minutes) {
  const [datePart, timePart] = String(value).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00`;
}

async function addGroupEventToCalendar(data, updateUrl, cancelUrl) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const client = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: client });
  const startDateTime = `${data.eventDate}T${data.preferredTime}:00`;
  const configuredDuration = Number(process.env.GROUP_EVENT_DURATION_MINUTES);
  const durationMinutes = Number.isFinite(configuredDuration) && configuredDuration > 0
    ? configuredDuration
    : 120;
  const endDateTime = addMinutesToLocalDateTime(startDateTime, durationMinutes);
  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `GROUP EVENT: ${data.occasion} - ${data.name}`,
      description: `<strong>Confirmed group event</strong><br><br>Customer: ${escapeHtml(data.name)}<br>Email: ${escapeHtml(data.email)}<br>Phone: ${escapeHtml(data.phone)}<br>Guests: ${data.guestCount}<br>Occasion: ${escapeHtml(data.occasion)}<br>Services: ${escapeHtml(data.services)}<br>Notes: ${escapeHtml(data.notes || 'None')}<br><br><strong>Event actions</strong><br><a href="${escapeHtml(updateUrl)}">✏️ Update event</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${escapeHtml(cancelUrl)}">✕ Cancel event</a>`,
      location: '2706 W Chicago Ave, Chicago, IL 60622',
      colorId: GROUP_EVENT_COLOR_ID,
      start: { dateTime: startDateTime, timeZone: TIME_ZONE },
      end: { dateTime: endDateTime, timeZone: TIME_ZONE },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  });
  return response.data;
}

function tokenMatches(expected, token) {
  if (!expected || !token) return false;
  const actual = hashGroupEventToken(token);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getInquiry(id, token) {
  if (!id || !token || !adminDb) return null;
  const snapshot = await adminDb.collection('groupEventInquiries').doc(String(id)).get();
  if (!snapshot.exists || !tokenMatches(snapshot.data().confirmationTokenHash, String(token))) return null;
  return { ref: snapshot.ref, data: snapshot.data() };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method Not Allowed' });
  if (!isAdminConfigured) return res.status(503).json({ error: 'Confirmation is temporarily unavailable.' });
  const id = req.method === 'GET' ? req.query.id : req.body?.id;
  const token = req.method === 'GET' ? req.query.token : req.body?.token;
  const inquiry = await getInquiry(id, token);
  if (!inquiry) return res.status(404).json({ error: 'This confirmation link is invalid or expired.' });
  const { data, ref } = inquiry;
  const eventWhen = displayEventDate(data.eventDate, data.preferredTime);

  if (req.method === 'GET') {
    return res.status(200).json({
      status: data.status,
      inquiry: { name: data.name, eventWhen, guestCount: data.guestCount, occasion: data.occasion, services: data.services },
    });
  }
  if (data.status === 'confirmed') return res.status(200).json({ success: true, alreadyConfirmed: true });
  if (data.status === 'confirming') return res.status(409).json({ error: 'This request is already being confirmed.' });
  if (data.status !== 'pending') return res.status(409).json({ error: 'This request can no longer be confirmed.' });

  try {
    const claimed = await adminDb.runTransaction(async (transaction) => {
      const latest = await transaction.get(ref);
      if (latest.data().status === 'confirmed') return false;
      if (latest.data().status === 'confirming') throw new Error('ALREADY_CONFIRMING');
      if (latest.data().status !== 'pending') throw new Error('NOT_PENDING');
      transaction.update(ref, { status: 'confirming', confirmationStartedAt: new Date().toISOString() });
      return true;
    });
    if (!claimed) return res.status(200).json({ success: true, alreadyConfirmed: true });

    const manageBaseUrl = `${getSiteUrl(req)}/group-events/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    const updateUrl = `${manageBaseUrl}#update`;
    const cancelUrl = `${manageBaseUrl}#cancel`;

    // If a previous email attempt failed after calendar creation, reuse the
    // stored event instead of creating a duplicate on retry.
    let calendarEventId = data.calendarEventId || '';
    let calendarEventLink = data.calendarEventLink || '';
    if (!calendarEventId) {
      const calendarEvent = await addGroupEventToCalendar(data, updateUrl, cancelUrl);
      calendarEventId = calendarEvent.id;
      calendarEventLink = calendarEvent.htmlLink || '';
      await ref.update({
        calendarEventId,
        calendarEventLink,
        calendarId: CALENDAR_ID,
        calendarCreatedAt: new Date().toISOString(),
      });
    }

    const safeName = escapeHtml(data.name);
    const transporter = getGroupEventTransporter();
    const ownerEmail = process.env.WORK_EMAIL || 'selena@sisterlavenderspa.com';
    const calendarText = calendarEventLink ? `\nGoogle Calendar: ${calendarEventLink}` : '';
    const calendarHtml = calendarEventLink
      ? `<p><a href="${escapeHtml(calendarEventLink)}" style="display:inline-block;background:#66516f;color:#fff;padding:10px 18px;border-radius:22px;text-decoration:none;font-weight:bold">Open in Google Calendar</a></p>`
      : '';
    if (!data.customerConfirmationSentAt) {
      await transporter.sendMail({
        from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`,
        to: data.email,
        subject: `Your group event is confirmed - ${eventWhen}`,
        text: `Hi ${data.name},\n\nGreat news—your group event at Sister Lavender Spa is confirmed.\n\nDate/time: ${eventWhen}\nGuests: ${data.guestCount}\nServices: ${data.services}\nOccasion: ${data.occasion}\n\nWe will contact you if we need any final details. Questions? Call (312) 900-3131.`,
        html: `<h2>Your group event is confirmed!</h2><p>Hi ${safeName},</p><p>Great news—your group event at Sister Lavender Spa is confirmed.</p><p><strong>Date/time:</strong> ${escapeHtml(eventWhen)}<br><strong>Guests:</strong> ${data.guestCount}<br><strong>Services:</strong> ${escapeHtml(data.services)}<br><strong>Occasion:</strong> ${escapeHtml(data.occasion)}</p><p>We will contact you if we need any final details. Questions? Call (312) 900-3131.</p>`,
      });
      await ref.update({ customerConfirmationSentAt: new Date().toISOString() });
    }
    if (!data.ownerConfirmationSentAt) {
      await transporter.sendMail({
        from: `"Group Event Confirmations" <${process.env.SMTP_USER}>`,
        to: ownerEmail,
        replyTo: data.email,
        subject: `Group event confirmed: ${data.name} - ${eventWhen}`,
        text: `You confirmed this group event.\n\nCustomer: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nDate/time: ${eventWhen}\nGuests: ${data.guestCount}\nOccasion: ${data.occasion}\nServices: ${data.services}\nNotes: ${data.notes || 'None'}${calendarText}\n\nUpdate event: ${updateUrl}\nCancel event: ${cancelUrl}`,
        html: `<h2>Group event confirmed</h2><p>You confirmed this event and the customer was sent a confirmation.</p><p><strong>Customer:</strong> ${safeName}<br><strong>Email:</strong> ${escapeHtml(data.email)}<br><strong>Phone:</strong> ${escapeHtml(data.phone)}<br><strong>Date/time:</strong> ${escapeHtml(eventWhen)}<br><strong>Guests:</strong> ${data.guestCount}<br><strong>Occasion:</strong> ${escapeHtml(data.occasion)}<br><strong>Services:</strong> ${escapeHtml(data.services)}<br><strong>Notes:</strong> ${escapeHtml(data.notes || 'None')}</p><p><a href="${updateUrl}" style="display:inline-block;background:#66516f;color:#fff;padding:11px 18px;border-radius:24px;text-decoration:none;font-weight:bold;margin-right:8px">Update event</a><a href="${cancelUrl}" style="display:inline-block;background:#b33a3a;color:#fff;padding:11px 18px;border-radius:24px;text-decoration:none;font-weight:bold">Cancel event</a></p>${calendarHtml}`,
      });
      await ref.update({ ownerConfirmationSentAt: new Date().toISOString() });
    }
    await ref.update({ status: 'confirmed', confirmedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, calendarEventId, calendarEventLink });
  } catch (error) {
    console.error('Group event confirmation failed:', error);
    if (!['ALREADY_CONFIRMING', 'NOT_PENDING'].includes(error.message)) {
      await ref.update({ status: 'pending', confirmationErrorAt: new Date().toISOString() });
    }
    const conflict = ['ALREADY_CONFIRMING', 'NOT_PENDING'].includes(error.message);
    return res.status(conflict ? 409 : 500).json({ error: conflict ? 'This request is already being confirmed or is no longer pending.' : 'The event could not be added to the calendar or emailed. Please try again.' });
  }
}
