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
  const selectedSlot = { startAt };
  

  // ✅ Basic validation
  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ✅ Build appointment date safely
  const appointmentDate = selectedSlot?.startAt
    ? new Date(selectedSlot.startAt).toLocaleString()
    : 'Not provided';

  // ✅ Build services list safely
  const serviceList = Array.isArray(services)
    ? services.map((s) => s.serviceName || s.serviceVariationId || 'Unknown Service').join(', ')
    : 'None';

  // ✅ Configure transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or use { host, port, secure } for custom SMTP
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App password or SMTP password
    },
  });

  const mailOptions = {
    from: `"Booking Form" <${process.env.SMTP_USER}>`,
    to: process.env.WORK_EMAIL, // Your receiving email
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

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
