import nodemailer from 'nodemailer';

const formatCurrencyFromCents = (amountCents) => {
  const cents = Number(amountCents);
  if (!Number.isFinite(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildReceiptEmailHtml = ({ transaction, services, breakdown }) => {
  const serviceRows = Array.isArray(services)
    ? services
        .map((service) => {
          const label = escapeHtml(service?.label || 'Service');
          const amount = escapeHtml(formatCurrencyFromCents(service?.amountCents || 0));
          return `
            <tr>
              <td style="padding: 6px 0; color: #374151;">${label}</td>
              <td style="padding: 6px 0; color: #111827; text-align: right; font-weight: 600;">${amount}</td>
            </tr>
          `;
        })
        .join('')
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
                <tr>
                  <td>
                    <h2 style="margin:0 0 6px;color:#111827;">Sister Lavender Spa Receipt</h2>
                    <p style="margin:0 0 18px;color:#6b7280;font-size:14px;">Thank you for your visit.</p>
                    <p style="margin:0 0 6px;font-size:14px;"><strong>Transaction ID:</strong> ${escapeHtml(transaction.id)}</p>
                    <p style="margin:0 0 6px;font-size:14px;"><strong>Date:</strong> ${escapeHtml(transaction.date)}</p>
                    <p style="margin:0 0 6px;font-size:14px;"><strong>Customer:</strong> ${escapeHtml(transaction.customerName || 'N/A')}</p>
                    <p style="margin:0 0 16px;font-size:14px;"><strong>Email:</strong> ${escapeHtml(transaction.customerEmail || 'N/A')}</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:10px 0;">
                      ${serviceRows || '<tr><td style="padding: 6px 0; color:#6b7280;">No service details saved</td></tr>'}
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;">
                      <tr><td style="padding:4px 0;color:#4b5563;">Services Subtotal</td><td style="padding:4px 0;text-align:right;">${escapeHtml(formatCurrencyFromCents(breakdown.servicesSubtotalCents))}</td></tr>
                      <tr><td style="padding:4px 0;color:#4b5563;">Processing Fee</td><td style="padding:4px 0;text-align:right;">${escapeHtml(formatCurrencyFromCents(breakdown.processingFeeCents))}</td></tr>
                      <tr><td style="padding:4px 0;color:#065f46;">Coupon${breakdown.couponLineLabel ? ` (${escapeHtml(breakdown.couponLineLabel)})` : ''}</td><td style="padding:4px 0;text-align:right;color:#065f46;">-${escapeHtml(formatCurrencyFromCents(breakdown.discountAmountCents))}</td></tr>
                      <tr><td style="padding:4px 0;color:#92400e;">Tip</td><td style="padding:4px 0;text-align:right;color:#92400e;">${escapeHtml(formatCurrencyFromCents(breakdown.tipAmountCents))}</td></tr>
                      <tr><td style="padding:4px 0;color:#4b5563;">Pre-tip Total</td><td style="padding:4px 0;text-align:right;">${escapeHtml(formatCurrencyFromCents(breakdown.preTipAmountCents))}</td></tr>
                      <tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;">Total Charged</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;">${escapeHtml(formatCurrencyFromCents(breakdown.totalCents))}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { toEmail, transaction, services, breakdown } = req.body || {};
    const recipient = String(toEmail || '').trim().toLowerCase();

    if (!recipient || !emailRegex.test(recipient)) {
      return res.status(400).json({ error: 'A valid recipient email is required.' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'SMTP is not configured on the server.' });
    }

    if (!transaction?.id || !breakdown) {
      return res.status(400).json({ error: 'Missing required receipt payload.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Sister Lavender Spa" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: 'Your receipt from Sister Lavender Spa',
      html: buildReceiptEmailHtml({
        transaction,
        services: Array.isArray(services) ? services : [],
        breakdown,
      }),
      text: [
        'Sister Lavender Spa Receipt',
        `Transaction ID: ${transaction.id}`,
        `Date: ${transaction.date || ''}`,
        `Total Charged: ${formatCurrencyFromCents(breakdown.totalCents || 0)}`,
      ].join('\n'),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return res.status(500).json({ error: error.message || 'Failed to send receipt email.' });
  }
}
