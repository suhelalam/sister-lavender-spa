import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reader_id } = req.body || {};
    if (!reader_id) {
      return res.status(400).json({ error: 'Missing reader_id' });
    }

    let reader;

    if (typeof stripe.terminal.readers.clearReaderDisplay === 'function') {
      reader = await stripe.terminal.readers.clearReaderDisplay(reader_id);
    } else {
      // Older stripe-node versions don't expose clearReaderDisplay yet.
      // cancelAction clears the active reader action/display.
      reader = await stripe.terminal.readers.cancelAction(reader_id);
    }

    return res.status(200).json({ ok: true, reader });
  } catch (error) {
    console.error('Error clearing reader display:', error);
    return res.status(500).json({ error: error.message });
  }
}
