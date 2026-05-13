import nodemailer from 'nodemailer';
import { adminDb } from '../../../lib/firebaseAdmin';

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.authorization || '';
  if (authHeader === `Bearer ${secret}`) return true;
  if (req.query?.secret === secret) return true;
  return false;
}

function formatAppointmentDate(startAt) {
  if (!startAt) return 'your appointment';
  return new Date(startAt).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPostVisitFollowUpMail({ email, firstName, appointmentDate }) {
  const reviewUrl = process.env.REVIEW_URL || 'https://g.page/r/CWJDaqiAGB-iEAE/review';
  const fromEmail = process.env.FOLLOW_UP_FROM_EMAIL || process.env.SMTP_USER;

  return {
    from: `"Sister Lavender Spa" <${fromEmail}>`,
    to: email,
    subject: 'Thank You for Visiting Sister Lavender Spa',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi ${firstName},</p>
  <p>Thank you for visiting Sister Lavender Spa on ${appointmentDate}.</p>
  <p>We would appreciate your feedback. If you enjoyed your visit, please leave us a quick review:</p>
  <p><a href="${reviewUrl}" target="_blank" rel="noopener noreferrer">Leave a Review</a></p>
  <p>We hope to see you again soon.<br/>Sister Lavender Spa</p>
</body>
</html>
    `,
    text: `Hi ${firstName},

Thank you for visiting Sister Lavender Spa on ${appointmentDate}.

We would appreciate your feedback. If you enjoyed your visit, please leave us a quick review:
${reviewUrl}

We hope to see you again soon.
Sister Lavender Spa`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Admin Firestore is not configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const nowIso = new Date().toISOString();
  const snapshot = await adminDb
    .collection('customerBookings')
    .where('status', '==', 'active')
    .get();

  let scanned = 0;
  let sent = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const followUp = data.followUpEmail || {};
    const customer = data.customer || {};

    const shouldSend =
      followUp.status === 'scheduled' &&
      typeof followUp.sendAt === 'string' &&
      followUp.sendAt <= nowIso &&
      customer.email;

    if (!shouldSend) continue;

    const appointmentDate = formatAppointmentDate(data.startAt);
    const firstName = customer.firstName || customer.fullName || 'there';
    const recipient = String(customer.email).trim().toLowerCase();

    try {
      await transporter.sendMail(
        buildPostVisitFollowUpMail({
          email: recipient,
          firstName,
          appointmentDate,
        })
      );

      await doc.ref.update({
        followUpEmail: {
          ...followUp,
          status: 'sent',
          sentAt: new Date().toISOString(),
          error: null,
        },
      });
      sent += 1;
    } catch (error) {
      await doc.ref.update({
        followUpEmail: {
          ...followUp,
          status: 'failed',
          error: String(error?.message || error),
        },
      });
      failed += 1;
    }
  }

  return res.status(200).json({
    success: true,
    now: nowIso,
    scanned,
    sent,
    failed,
  });
}
