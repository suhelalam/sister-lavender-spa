import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import Stripe from 'stripe';
import crypto from 'crypto';
import { adminDb, isAdminConfigured } from '../../lib/firebaseAdmin';

function hashCancelToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getBaseUrl(req) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const host = req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];

  if (forwardedProto && host) return `${forwardedProto}://${host}`;
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return 'http://localhost:3000';
}

function buildConfirmationMail({
  email,
  firstName,
  appointmentDate,
  formattedServicesHtml,
  formattedServices,
  partySize,
  totalFormatted,
  note,
  cancelUrl,
}) {
  const cancelHtml = cancelUrl
    ? `
    <p>If you need to cancel, use the secure link below:</p>
    <div class="cta-wrap">
      <a class="cta-link" href="${cancelUrl}" target="_blank" rel="noopener noreferrer">Cancel appointment</a>
    </div>
    <p style="font-size: 13px; color: #555;">If the button does not work, copy this URL into your browser:<br>${cancelUrl}</p>
  `
    : `
    <p>If you need to cancel, please call us at (312) 900-3131.</p>
  `;

  const cancelText = cancelUrl
    ? `To cancel your booking, use this secure link:\n${cancelUrl}`
    : 'To cancel your booking, please call us at (312) 900-3131.';

  return {
    from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Booking Confirmation - ${appointmentDate}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f8f9fa; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 14px; }
    .cta-wrap { margin: 20px 0; }
    .cta-link {
      display: inline-block;
      background: #7c3aed;
      color: #fff !important;
      text-decoration: none;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Booking Confirmed! 🎉</h2>
  </div>
  <div class="content">
    <p>Hi ${firstName},</p>
    <p>Your appointment has been confirmed. We look forward to seeing you!</p>

    <h3>Appointment Details:</h3>
    <p><strong>Date & Time:</strong> ${appointmentDate}</p>
    <p><strong>Services:</strong></p>
    ${formattedServicesHtml}
    <p><strong>Party Size:</strong> ${partySize || 1}</p>
    ${totalFormatted ? `<p><strong>Total:</strong> ${totalFormatted}</p>` : ''}

    <p><strong>Note:</strong> ${note || 'None provided'}</p>

    <p>Please arrive 10-15 minutes before your scheduled time.</p>

    ${cancelHtml}
  </div>
  <div class="footer">
    <p>Thank you for choosing us!<br>
    Sister Lavender Spa<br>
    Phone: (312) 900-3131<br>
    Address: 2706 W Chicago Ave, Chicago, IL 60622</p>
  </div>
</body>
</html>
    `,
    text: `
Booking Confirmed!

Hi ${firstName},

Your appointment has been confirmed. We look forward to seeing you!

Appointment Details:
----------------------------
Date & Time: ${appointmentDate}
Services:
${formattedServices}
Party Size: ${partySize || 1}
${totalFormatted ? `Total: ${totalFormatted}` : ''}
Note: ${note || 'None provided'}

Please arrive 10-15 minutes before your scheduled time.

${cancelText}

Thank you for choosing us!
Sister Lavender Spa
Phone: (312) 900-3131
Address: 2706 W Chicago Ave, Chicago, IL 60622
    `,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('Booking payload:', req.body);

  const {
    customer,
    services,
    startAt,
    locationId,
    partySize,
    note,
    totalFormatted,
  } = req.body || {};

  const firstName = customer?.givenName;
  const lastName = customer?.familyName;
  const email = customer?.emailAddress;
  const phone = customer?.phoneNumber;

  if (!firstName || !lastName || !email || !phone || !startAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const appointmentDate = startAt
    ? new Date(startAt).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not provided';

  const parseDurationMinutes = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed);
  };

  const normalizeCategory = (value = '') =>
    String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizedServices = Array.isArray(services)
    ? services.map((service) => ({
        ...service,
        serviceName: service.serviceName || service.serviceVariationId || 'Unknown Service',
        quantity: Math.max(1, Number(service.quantity || 1)),
        durationMinutes: parseDurationMinutes(service.durationMinutes),
        isAddOn: Boolean(service.isAddOn),
        category: service.category || '',
        appliesToCategory: service.appliesToCategory || '',
      }))
    : [];

  const servicesOnly = normalizedServices.filter((service) => !service.isAddOn);
  const addOnsOnly = normalizedServices.filter((service) => service.isAddOn);
  const matchedAddOnIndexes = new Set();

  const serviceGroups = servicesOnly.map((service) => {
    const serviceCategoryKey = normalizeCategory(service.category);
    const addOns = [];

    addOnsOnly.forEach((addOn, addOnIndex) => {
      if (matchedAddOnIndexes.has(addOnIndex)) return;
      const addOnCategoryKey = normalizeCategory(addOn.appliesToCategory || addOn.category);
      if (!serviceCategoryKey || !addOnCategoryKey) return;
      if (serviceCategoryKey !== addOnCategoryKey) return;
      addOns.push(addOn);
      matchedAddOnIndexes.add(addOnIndex);
    });

    return { service, addOns };
  });

  const unassignedAddOns = addOnsOnly.filter((_, index) => !matchedAddOnIndexes.has(index));

  const formatServiceLine = (service, prefix = '• ') => {
    const durationText = service.durationMinutes > 0 ? ` (${service.durationMinutes} min)` : '';
    return `${prefix}${service.serviceName}${durationText} x${service.quantity}`;
  };

  const formattedServices = normalizedServices.length > 0
    ? [
        ...serviceGroups.flatMap(({ service, addOns }) => [
          formatServiceLine(service, '• '),
          ...addOns.map((addOn) => formatServiceLine(addOn, '  + ')),
        ]),
        ...unassignedAddOns.map((addOn) => formatServiceLine(addOn, '• + ')),
      ].join('\n')
    : 'None';

  const formattedServicesHtml = normalizedServices.length > 0
    ? `
      <ul style="margin:8px 0 0 18px; padding:0;">
        ${serviceGroups
          .map(({ service, addOns }) => `
            <li style="margin:0 0 8px 0;">
              <strong>${service.serviceName}</strong>${service.durationMinutes > 0 ? ` (${service.durationMinutes} min)` : ''} x${service.quantity}
              ${addOns.length > 0
                ? `<ul style="margin:6px 0 0 16px; padding:0;">
                    ${addOns
                      .map((addOn) => `<li style="margin:0 0 4px 0;">+ ${addOn.serviceName}${addOn.durationMinutes > 0 ? ` (${addOn.durationMinutes} min)` : ''} x${addOn.quantity}</li>`)
                      .join('')}
                  </ul>`
                : ''}
            </li>
          `)
          .join('')}
        ${unassignedAddOns
          .map((addOn) => `<li style="margin:0 0 6px 0;">+ ${addOn.serviceName}${addOn.durationMinutes > 0 ? ` (${addOn.durationMinutes} min)` : ''} x${addOn.quantity}</li>`)
          .join('')}
      </ul>
    `
    : '<p>None</p>';

  const serviceList = normalizedServices.length > 0
    ? normalizedServices.map((s) => s.serviceName).join(', ')
    : 'None';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async function addToGoogleCalendar() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      const calendar = google.calendar({ version: 'v3', auth });

      const startTime = new Date(startAt);

      function calculateTotalDuration() {
        if (!Array.isArray(services) || services.length === 0) {
          return 60 * 60 * 1000;
        }

        const totalMinutes = services.reduce((total, service) => {
          return total + parseDurationMinutes(service.durationMinutes);
        }, 0);

        if (totalMinutes <= 0) {
          return 60 * 60 * 1000;
        }

        return totalMinutes * 60 * 1000;
      }

      const totalDuration = calculateTotalDuration();
      const endTime = new Date(startTime.getTime() + totalDuration);
      const totalMinutes = totalDuration / (60 * 1000);

      const event = {
        summary: `Appointment: ${firstName} ${lastName}`,
        description: `
═══════════════════════════
👤 CLIENT INFORMATION 👤
═══════════════════════════
NAME: ${firstName} ${lastName}
EMAIL: ${email}
PHONE: ${phone} 📞📞📞

═══════════════════════════
📅 APPOINTMENT DETAILS 📅
═══════════════════════════
DATE & TIME: ${appointmentDate}
DURATION: ${totalMinutes} minutes
PARTY SIZE: ${partySize || 1}
TOTAL: ${totalFormatted || 'N/A'}

═══════════════════════════
💆 SERVICES BOOKED 💆
═══════════════════════════
${formattedServices}

═══════════════════════════
📝 NOTES 📝
═══════════════════════════
${note || 'None'}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Chicago',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Chicago',
        },
        location: '2706 W Chicago Ave, Chicago, IL 60622',
        colorId: '1',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'selena@sisterlavenderspa.com',
        resource: event,
      });

      console.log(
        'Google Calendar event created with duration:',
        totalMinutes + ' minutes'
      );
      console.log('Event link:', response.data.htmlLink);
      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  const notificationMail = {
    from: `"Booking System" <${process.env.SMTP_USER}>`,
    to: process.env.WORK_EMAIL,
    subject: `New Booking Request - ${firstName} ${lastName}`,
    text: `
New booking request:
----------------------------
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Party Size: ${partySize || 1}
Date & Time: ${appointmentDate}
Total: ${totalFormatted || 'N/A'}
Services:
${formattedServices}
Note: ${note || 'None'}
    `,
  };

  async function upsertStripeCustomer() {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data && existing.data.length > 0) {
      return existing.data[0];
    }

    return await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        partySize: String(partySize || 1),
        startAt: String(startAt),
        totalFormatted: String(totalFormatted || ''),
        services: String(serviceList || ''),
        note: String(note || ''),
      },
    });
  }

  async function logBookingAnalytics() {
    const serviceLines = normalizedServices
      .map((service) => ({
          serviceName: service.serviceName || service.serviceVariationId || 'Unknown Service',
          serviceVariationId: service.serviceVariationId || '',
          quantity: Math.max(1, Number(service.quantity || 1)),
          durationMinutes: Math.max(0, Number(service.durationMinutes || 0)),
          isAddOn: Boolean(service.isAddOn),
          category: service.category || '',
          appliesToCategory: service.appliesToCategory || '',
        }))
      ;

    const totalServiceUnits = serviceLines.reduce(
      (sum, service) => sum + (service.quantity || 0),
      0
    );

    if (!adminDb) {
      throw new Error('Admin Firestore is not configured');
    }

    await adminDb.collection('bookingAnalytics').add({
      bookedAt: new Date().toISOString(),
      startAt: startAt || null,
      locationId: locationId || null,
      partySize: Number(partySize || 1),
      totalFormatted: totalFormatted || null,
      note: note || null,
      customer: {
        name: `${firstName} ${lastName}`.trim(),
        email: (email || '').trim().toLowerCase(),
        phone: phone || '',
      },
      services: serviceLines,
      totalServiceUnits,
      serviceNames: serviceLines.map((service) => service.serviceName),
    });
  }

  async function saveCancelableBooking(calendarEvent) {
    if (!adminDb) {
      throw new Error('Admin Firestore is not configured');
    }

    const bookingId = calendarEvent?.id;
    if (!bookingId) throw new Error('Calendar event id missing from booking response');

    const cancelToken = crypto.randomBytes(32).toString('hex');
    const cancelTokenHash = hashCancelToken(cancelToken);

    await adminDb.collection('customerBookings').doc(bookingId).set({
      bookingId,
      status: 'active',
      createdAt: new Date().toISOString(),
      canceledAt: null,
      cancelTokenHash,
      calendarEventId: bookingId,
      calendarEventLink: calendarEvent?.htmlLink || '',
      startAt: startAt || null,
      locationId: locationId || null,
      partySize: Number(partySize || 1),
      totalFormatted: totalFormatted || null,
      note: note || null,
      customer: {
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName} ${lastName}`.trim(),
        email: (email || '').trim().toLowerCase(),
        phone: phone || '',
      },
      services: normalizedServices,
    });

    return { bookingId, cancelToken };
  }

  try {
    const calendarEvent = await addToGoogleCalendar();
    let bookingId = null;
    let cancelUrl = '';
    if (isAdminConfigured) {
      try {
        const cancelData = await saveCancelableBooking(calendarEvent);
        bookingId = cancelData.bookingId;
        cancelUrl = `${getBaseUrl(req)}/cancel-booking?booking=${encodeURIComponent(cancelData.bookingId)}&token=${encodeURIComponent(cancelData.cancelToken)}`;
      } catch (cancelPersistenceError) {
        console.error('Cancelable booking persistence failed:', cancelPersistenceError);
      }
    } else {
      console.warn('Admin Firestore not configured. Self-serve cancellation link disabled.');
    }

    const confirmationMail = buildConfirmationMail({
      email,
      firstName,
      appointmentDate,
      formattedServicesHtml,
      formattedServices,
      partySize,
      totalFormatted,
      note,
      cancelUrl,
    });

    await transporter.sendMail(notificationMail);
    await transporter.sendMail(confirmationMail);

    const stripeCustomer = await upsertStripeCustomer();

    try {
      await logBookingAnalytics();
    } catch (analyticsError) {
      console.error('Booking analytics write failed:', analyticsError);
    }

    return res.status(200).json({
      success: true,
      message: 'Booking created in calendar and emails sent successfully',
      calendarEvent: {
        id: calendarEvent.id,
        link: calendarEvent.htmlLink,
      },
      stripeCustomerId: stripeCustomer.id,
      cancellation: {
        bookingId,
        selfServeEnabled: Boolean(bookingId),
      },
    });
  } catch (err) {
    console.error('Error processing booking:', err);
    return res.status(500).json({ error: 'Failed to process booking' });
  }
}
