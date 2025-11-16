import nodemailer from 'nodemailer';

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
  if (!firstName || !lastName || !email || !phone) {
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
    Your Business Name<br>
    Phone: (555) 123-4567<br>
    Address: 123 Business St, Your City</p>
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
Your Business Name
Phone: (555) 123-4567
Address: 123 Business St, Your City
    `
  };

  try {
    // Send both emails
    await transporter.sendMail(notificationMail);
    await transporter.sendMail(confirmationMail);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Booking notification and customer confirmation sent successfully' 
    });
  } catch (err) {
    console.error('Error sending emails:', err);
    return res.status(500).json({ error: 'Failed to send emails' });
  }
}