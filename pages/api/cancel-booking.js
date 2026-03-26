import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { adminDb, isAdminConfigured } from '../../lib/firebaseAdmin';

function hashCancelToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function deleteCalendarEvent(eventId) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'selena@sisterlavenderspa.com',
      eventId,
    });
    return { removed: true };
  } catch (error) {
    const status = error?.code || error?.response?.status;
    if (status === 404 || status === 410) {
      return { removed: false, missing: true };
    }
    throw error;
  }
}

async function updateCalendarEventTime(eventId, startAt, durationMinutes) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const startDate = new Date(startAt);
  const safeDurationMinutes = Math.max(1, Number(durationMinutes || 60));
  const endDate = new Date(startDate.getTime() + safeDurationMinutes * 60 * 1000);

  await calendar.events.patch({
    calendarId: 'selena@sisterlavenderspa.com',
    eventId,
    requestBody: {
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Chicago',
      },
    },
  });
}

function getBookingDurationMinutes(services) {
  if (!Array.isArray(services) || services.length === 0) return 60;
  const total = services.reduce((sum, service) => {
    const minutes = Math.max(0, Number(service?.durationMinutes || 0));
    const qty = Math.max(1, Number(service?.quantity || 1));
    return sum + minutes * qty;
  }, 0);
  return total > 0 ? total : 60;
}

function formatDate(value) {
  if (!value) return 'Unknown date/time';
  try {
    return new Date(value).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export default async function handler(req, res) {
  const isGet = req.method === 'GET';
  const isPost = req.method === 'POST';
  const isPut = req.method === 'PUT';
  if (!isGet && !isPost && !isPut) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const source = isGet ? req.query : req.body;
  const bookingId = String(source?.bookingId || source?.booking || '').trim();
  const token = String(source?.token || '').trim();

  if (!bookingId || !token) {
    return res.status(400).json({ error: 'Missing bookingId or token' });
  }

  if (!isAdminConfigured || !adminDb) {
    return res.status(503).json({
      error: 'Cancellation service is temporarily unavailable. Please call the spa directly.',
    });
  }

  try {
    const bookingRef = adminDb.collection('customerBookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingSnap.data();
    const customerName = booking?.customer?.fullName || 'Customer';
    const startAtLabel = formatDate(booking?.startAt);
    const services = Array.isArray(booking?.services)
      ? booking.services.map((s) => s?.serviceName || 'Service').join(', ')
      : 'N/A';

    if (booking.status === 'canceled') {
      const payload = {
        success: true,
        alreadyCanceled: true,
        message: 'This booking has already been canceled.',
      };

      if (isGet) {
        return res.status(200).json({
          ...payload,
          canCancel: false,
          canReschedule: false,
          booking: {
            bookingId,
            status: booking.status || 'canceled',
            startAt: booking?.startAt || null,
            startAtLabel,
            partySize: booking?.partySize ?? 1,
            totalFormatted: booking?.totalFormatted || null,
            note: booking?.note || '',
            customer: booking?.customer || {},
            services: Array.isArray(booking?.services) ? booking.services : [],
          },
        });
      }

      return res.status(200).json(payload);
    }

    const incomingHash = hashCancelToken(token);
    if (!booking.cancelTokenHash || incomingHash !== booking.cancelTokenHash) {
      return res.status(403).json({ error: 'Invalid cancellation token' });
    }

    const startAtMs = Date.parse(booking?.startAt || '');
    if (Number.isFinite(startAtMs) && Date.now() >= startAtMs) {
      const errorMessage = 'This appointment can no longer be canceled online. Please call the spa directly.';
      if (isGet) {
        return res.status(200).json({
          success: true,
          canCancel: false,
          canReschedule: false,
          message: errorMessage,
          booking: {
            bookingId,
            status: booking.status || 'active',
            startAt: booking?.startAt || null,
            startAtLabel,
            partySize: booking?.partySize ?? 1,
            totalFormatted: booking?.totalFormatted || null,
            note: booking?.note || '',
            customer: booking?.customer || {},
            services: Array.isArray(booking?.services) ? booking.services : [],
          },
        });
      }
      return res.status(400).json({ error: errorMessage });
    }

    if (isPut) {
      const newStartAt = String(req.body?.newStartAt || '').trim();
      const parsedNewStartMs = Date.parse(newStartAt);
      if (!newStartAt || !Number.isFinite(parsedNewStartMs)) {
        return res.status(400).json({ error: 'newStartAt is required and must be a valid ISO date.' });
      }
      if (parsedNewStartMs <= Date.now()) {
        return res.status(400).json({ error: 'Please choose a future time slot.' });
      }
      if (booking?.startAt && newStartAt === booking.startAt) {
        return res.status(400).json({ error: 'Please choose a different time from your current booking.' });
      }

      const durationMinutes = getBookingDurationMinutes(booking?.services);
      await updateCalendarEventTime(
        booking.calendarEventId || bookingId,
        newStartAt,
        durationMinutes
      );

      const nowIso = new Date().toISOString();
      await bookingRef.update({
        startAt: newStartAt,
        updatedAt: nowIso,
        updatedBy: 'customer',
        rescheduledAt: nowIso,
      });

      const transporter = createTransporter();
      const customerEmail = booking?.customer?.email;
      const newStartAtLabel = formatDate(newStartAt);
      const oldStartAtLabel = formatDate(booking?.startAt);
      const outboundMails = [];

      if (customerEmail) {
        outboundMails.push(
          transporter.sendMail({
            from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`,
            to: customerEmail,
            subject: 'Booking updated',
            text: `Hi ${customerName},\n\nYour booking has been updated.\n\nPrevious time: ${oldStartAtLabel}\nNew time: ${newStartAtLabel}\n\nIf this was not requested by you, please call us at (312) 900-3131.`,
          })
        );
      }

      outboundMails.push(
        transporter.sendMail({
          from: `"Booking System" <${process.env.SMTP_USER}>`,
          to: process.env.WORK_EMAIL,
          subject: `Customer rescheduled booking - ${customerName}`,
          text: `A customer rescheduled their booking.\n\nBooking ID: ${bookingId}\nCustomer: ${customerName}\nEmail: ${booking?.customer?.email}\nOld Start: ${oldStartAtLabel}\nNew Start: ${newStartAtLabel}\nServices: ${services}`,
        })
      );

      try {
        await Promise.all(outboundMails);
      } catch (mailError) {
        // Reschedule already succeeded; do not fail customer flow if email notification fails.
        console.error('Reschedule email notification failed:', mailError);
      }

      return res.status(200).json({
        success: true,
        message: `Booking updated to ${newStartAtLabel}.`,
        booking: {
          bookingId,
          startAt: newStartAt,
          startAtLabel: newStartAtLabel,
          status: booking.status || 'active',
        },
      });
    }

    if (isGet) {
      return res.status(200).json({
        success: true,
        canCancel: true,
        canReschedule: true,
        booking: {
          bookingId,
          status: booking.status || 'active',
          startAt: booking?.startAt || null,
          startAtLabel,
          partySize: booking?.partySize ?? 1,
          totalFormatted: booking?.totalFormatted || null,
          note: booking?.note || '',
          customer: booking?.customer || {},
          services: Array.isArray(booking?.services) ? booking.services : [],
        },
      });
    }

    const nowIso = new Date().toISOString();
    await deleteCalendarEvent(booking.calendarEventId || bookingId);

    await bookingRef.update({
      status: 'canceled',
      canceledAt: nowIso,
      canceledBy: 'customer',
      canceledReason: 'self-service-link',
    });

    const transporter = createTransporter();
    const customerEmail = booking?.customer?.email;
    const outboundMails = [];
    if (customerEmail) {
      outboundMails.push(
        transporter.sendMail({
          from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`,
          to: customerEmail,
          subject: 'Booking canceled',
          text: `Hi ${customerName},\n\nYour booking on ${startAtLabel} has been canceled successfully.\n\nServices: ${services}\n\nIf this was a mistake, please book again on our website or call us at (312) 900-3131.`,
        })
      );
    }

    outboundMails.push(
      transporter.sendMail({
        from: `"Booking System" <${process.env.SMTP_USER}>`,
        to: process.env.WORK_EMAIL,
        subject: `Customer canceled booking - ${customerName}`,
        text: `A customer canceled their booking.\n\nBooking ID: ${bookingId}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nStart: ${startAtLabel}\nServices: ${services}\nCanceled At: ${formatDate(nowIso)}`,
      })
    );

    await Promise.all(outboundMails);

    return res.status(200).json({
      success: true,
      message: 'Booking canceled successfully.',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    const message = error?.response?.data?.error?.message || error?.message || 'Request failed';
    return res.status(500).json({ error: `Failed to process booking request: ${message}` });
  }
}
