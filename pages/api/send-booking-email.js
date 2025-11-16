import nodemailer from 'nodemailer';
import { google } from 'googleapis';

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

  // ✅ Basic validation
  if (!firstName || !lastName || !email || !phone || !startAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ✅ Build appointment date safely
  const appointmentDate = startAt
  ? new Date(startAt).toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  : 'Not provided';

  // ✅ Build services list safely
  const serviceList = Array.isArray(services)
    ? services.map((s) => s.serviceName || s.serviceVariationId || 'Unknown Service').join(', ')
    : 'None';

  // ✅ Configure transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 🗓️ GOOGLE CALENDAR INTEGRATION
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
    const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));
    
    const event = {
      summary: `Appointment: ${firstName} ${lastName} - ${serviceList}`,
      description: `
Client: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Services: ${serviceList}
Party Size: ${partySize || 1}
Total: ${totalFormatted || 'N/A'}
Note: ${note || 'None'}
      `.trim(),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Chicago',
      },
      // ❌ REMOVED attendees array
      location: '2706 W Chicago Ave, Chicago, IL 60622',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      // ❌ REMOVED sendUpdates
    });

    console.log('Google Calendar event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

  // 📧 Email 1: Notification to YOU
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
Services: ${serviceList}
Note: ${note || 'None'}
    `,
  };

  // 📧 Email 2: Confirmation to CUSTOMER
  const confirmationMail = {
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
    <p><strong>Services:</strong> ${serviceList}</p>
    <p><strong>Party Size:</strong> ${partySize || 1}</p>
    ${totalFormatted ? `<p><strong>Total:</strong> ${totalFormatted}</p>` : ''}
    
    <p><strong>Note:</strong> ${note || 'None provided'}</p>
    
    <p>Please arrive 10-15 minutes before your scheduled time.</p>
    
    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
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
Services: ${serviceList}
Party Size: ${partySize || 1}
${totalFormatted ? `Total: ${totalFormatted}` : ''}
Note: ${note || 'None provided'}

Please arrive 10-15 minutes before your scheduled time.

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Thank you for choosing us!
Sister Lavender Spa
Phone: (312) 900-3131
Address: 2706 W Chicago Ave, Chicago, IL 60622
    `
  };

  try {
    // 🗓️ 1. Add to Google Calendar
    const calendarEvent = await addToGoogleCalendar();
    
    // 📧 2. Send both emails
    await transporter.sendMail(notificationMail);
    await transporter.sendMail(confirmationMail);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Booking created in calendar and emails sent successfully',
      calendarEvent: {
        id: calendarEvent.id,
        link: calendarEvent.htmlLink
      }
    });
  } catch (err) {
    console.error('Error processing booking:', err);
    return res.status(500).json({ error: 'Failed to process booking' });
  }
}