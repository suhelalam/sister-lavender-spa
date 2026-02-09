import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Missing email' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1,
    });

    if (!existing.data || existing.data.length === 0) {
      return res.status(200).json({ found: false });
    }

    const c = existing.data[0];

    const fullName = (c.name || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const givenName = parts.length ? parts[0] : '';
    const familyName = parts.length > 1 ? parts.slice(1).join(' ') : '';

    return res.status(200).json({
      found: true,
      customer: {
        givenName,
        familyName,
        emailAddress: c.email || normalizedEmail,
        phoneNumber: c.phone || '',
      },
    });
  } catch (err) {
    console.error('Stripe lookup error:', err);
    return res.status(500).json({ error: 'Failed to lookup customer' });
  }
}
