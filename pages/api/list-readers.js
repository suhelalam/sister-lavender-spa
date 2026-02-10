// pages/api/list-readers.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const readers = await stripe.terminal.readers.list({ limit: 20 });
    res.status(200).json({ readers: readers.data });
  } catch (error) {
    console.error('Error listing readers:', error);
    res.status(500).json({ error: error.message });
  }
}
