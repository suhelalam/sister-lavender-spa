// pages/api/cancel-payment-intent.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_intent_id, reader_id } = req.body || {};
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Missing payment_intent_id' });
    }

    let readerCanceled = false;
    let readerCancelError = null;

    // If a reader is actively collecting payment, cancel that action too so the terminal UI clears.
    if (reader_id) {
      try {
        await stripe.terminal.readers.cancelAction(reader_id);
        readerCanceled = true;
      } catch (readerError) {
        readerCancelError = readerError.message;
      }
    }

    const canceled = await stripe.paymentIntents.cancel(payment_intent_id);

    res.status(200).json({
      ok: true,
      status: canceled.status,
      reader_canceled: readerCanceled,
      reader_cancel_error: readerCancelError,
    });
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    res.status(500).json({ error: error.message });
  }
}
