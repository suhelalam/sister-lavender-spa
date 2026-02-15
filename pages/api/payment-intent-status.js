import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_intent_id } = req.body || {};
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Missing payment_intent_id' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    return res.status(200).json({
      ok: true,
      status: paymentIntent.status,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error fetching payment intent status:', error);
    return res.status(500).json({ error: error.message });
  }
}
