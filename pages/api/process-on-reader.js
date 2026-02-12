// pages/api/process-on-reader.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reader_id, payment_intent_id } = req.body || {};
    if (!reader_id || !payment_intent_id) {
      return res.status(400).json({ error: 'Missing reader_id or payment_intent_id' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    const amountEligible = Math.max(0, Math.round(Number(paymentIntent?.amount || 0)));

    const reader = await stripe.terminal.readers.processPaymentIntent(reader_id, {
      payment_intent: payment_intent_id,
      process_config: {
        skip_tipping: false,
        tipping: {
          amount_eligible: amountEligible,
        },
      },
    });

    res.status(200).json({ ok: true, reader });
  } catch (error) {
    console.error('Error processing payment on reader:', error);
    res.status(500).json({ error: error.message });
  }
}
