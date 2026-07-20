import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import {
  createGroupEventToken, displayEventDate, escapeHtml, getGroupEventTransporter,
  getSiteUrl, hashGroupEventToken,
} from '../../../lib/groupEvents';

const clean = (value, max = 500) => String(value || '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!isAdminConfigured) return res.status(503).json({ error: 'Group event requests are temporarily unavailable. Please call us.' });
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return res.status(503).json({ error: 'Email is temporarily unavailable. Please call us.' });

  const inquiry = {
    name: clean(req.body?.name, 120), email: clean(req.body?.email, 254).toLowerCase(),
    phone: clean(req.body?.phone, 40), eventDate: clean(req.body?.eventDate, 10),
    preferredTime: clean(req.body?.preferredTime, 5), guestCount: Number(req.body?.guestCount),
    occasion: clean(req.body?.occasion, 160), services: clean(req.body?.services, 500),
    notes: clean(req.body?.notes, 2000),
  };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(inquiry.eventDate);
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(inquiry.preferredTime);
  if (!inquiry.name || !validEmail || !inquiry.phone || !validDate || !validTime ||
      !Number.isInteger(inquiry.guestCount) || inquiry.guestCount < 2 || inquiry.guestCount > 100 ||
      !inquiry.occasion || !inquiry.services) {
    return res.status(400).json({ error: 'Please complete all required fields with valid information.' });
  }

  const token = createGroupEventToken();
  const createdAt = new Date().toISOString();
  const doc = await adminDb.collection('groupEventInquiries').add({
    ...inquiry, status: 'pending', createdAt, confirmedAt: null,
    confirmationTokenHash: hashGroupEventToken(token),
  });
  const eventWhen = displayEventDate(inquiry.eventDate, inquiry.preferredTime);
  const confirmationUrl = `${getSiteUrl(req)}/group-events/confirm?id=${encodeURIComponent(doc.id)}&token=${encodeURIComponent(token)}`;
  const safe = Object.fromEntries(Object.entries(inquiry).map(([key, value]) => [key, escapeHtml(value)]));
  const transporter = getGroupEventTransporter();
  const ownerEmail = process.env.WORK_EMAIL || 'selena@sisterlavenderspa.com';

  try {
    await Promise.all([
      transporter.sendMail({
        from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`, to: inquiry.email,
        subject: `We received your group event request - ${eventWhen}`,
        text: `Hi ${inquiry.name},\n\nWe received your group event request for ${eventWhen} for ${inquiry.guestCount} guests. This is not confirmed yet. We will review availability and email you when it is confirmed.\n\nServices: ${inquiry.services}\nOccasion: ${inquiry.occasion}\n\nSister Lavender Spa\n(312) 900-3131`,
        html: `<h2>We received your request</h2><p>Hi ${safe.name},</p><p>We received your group event request for <strong>${escapeHtml(eventWhen)}</strong> for <strong>${inquiry.guestCount} guests</strong>.</p><p>This is not confirmed yet. We will review availability and email you when it is confirmed.</p><p><strong>Services:</strong> ${safe.services}<br><strong>Occasion:</strong> ${safe.occasion}</p><p>Sister Lavender Spa<br>(312) 900-3131</p>`,
      }),
      transporter.sendMail({
        from: `"Group Event Requests" <${process.env.SMTP_USER}>`, to: ownerEmail,
        replyTo: inquiry.email, subject: `Group event inquiry: ${inquiry.name} - ${eventWhen}`,
        text: `New group event inquiry\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone}\nDate/time: ${eventWhen}\nGuests: ${inquiry.guestCount}\nOccasion: ${inquiry.occasion}\nServices: ${inquiry.services}\nNotes: ${inquiry.notes || 'None'}\n\nReview and confirm: ${confirmationUrl}`,
        html: `<h2>New group event inquiry</h2><p><strong>Name:</strong> ${safe.name}<br><strong>Email:</strong> ${safe.email}<br><strong>Phone:</strong> ${safe.phone}<br><strong>Date/time:</strong> ${escapeHtml(eventWhen)}<br><strong>Guests:</strong> ${inquiry.guestCount}<br><strong>Occasion:</strong> ${safe.occasion}<br><strong>Services:</strong> ${safe.services}<br><strong>Notes:</strong> ${safe.notes || 'None'}</p><p><a href="${confirmationUrl}" style="display:inline-block;background:#66516f;color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">Review and confirm availability</a></p><p style="font-size:13px;color:#666">Opening this link does not confirm the event. You will confirm it on the next screen.</p>`,
      }),
    ]);
    return res.status(201).json({ success: true, id: doc.id });
  } catch (error) {
    console.error('Group event email failed:', error);
    await doc.delete();
    return res.status(500).json({ error: 'We could not send your request. Please try again or call us.' });
  }
}
