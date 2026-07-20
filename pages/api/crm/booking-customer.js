import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { findCustomer, normalizeEmail, normalizePhone, upsertCustomer } from '../../../lib/crm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer lookup is temporarily unavailable.' });
  const phone = String(req.body?.phone || '').trim();
  const email = normalizeEmail(req.body?.email);
  if (normalizePhone(phone).length < 10 && !email) return res.status(400).json({ error: 'Enter your full phone number or email.' });
  try {
    let match = await findCustomer(adminDb, { phone, email });
    let customer = match?.exists ? { id: match.id, ...match.data() } : null;
    if (!customer) {
      let stripeCustomer = null;
      if (email) {
        const results = await stripe.customers.list({ email, limit: 1 });
        stripeCustomer = results.data[0] || null;
      }
      if (!stripeCustomer && normalizePhone(phone).length >= 10) {
        const normalized = normalizePhone(phone);
        const results = await stripe.customers.search({ query: `phone:"+1${normalized}"`, limit: 1 });
        stripeCustomer = results.data[0] || null;
      }
      if (stripeCustomer) {
        customer = await upsertCustomer(adminDb, {
          name: stripeCustomer.name || '', phone: stripeCustomer.phone || phone,
          email: stripeCustomer.email || email, stripeCustomerId: stripeCustomer.id,
        });
      }
    }
    if (!customer) return res.status(404).json({ found: false, error: 'We could not find a matching customer. You can continue as a new guest.' });
    const names = String(customer.name || '').trim().split(/\s+/);
    return res.json({ found: true, customer: {
      id: customer.id, firstName: names[0] || '', lastName: names.slice(1).join(' '),
      phone: customer.phone || phone, email: customer.email || email,
      rewardsEnrolled: Boolean(customer.rewards?.enrolled), pointsBalance: Number(customer.pointsBalance || 0),
    } });
  } catch (error) {
    console.error('Booking customer lookup failed:', error);
    return res.status(500).json({ error: 'Customer lookup failed. You can continue as a new guest.' });
  }
}
