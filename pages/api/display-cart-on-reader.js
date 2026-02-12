import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reader_id, services = [], amount = null } = req.body || {};
    if (!reader_id) {
      return res.status(400).json({ error: 'Missing reader_id' });
    }

    const lineItems = Array.isArray(services)
      ? services
          .map((service) => ({
            description: String(service?.name || '').trim().slice(0, 127),
            amount: Math.max(0, Math.round(Number(service?.amount || 0))),
            quantity: Math.max(1, Math.round(Number(service?.quantity || 1))),
          }))
          .filter((service) => service.description && Number.isFinite(service.amount))
      : [];

    const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
    const fallbackTotal = Math.max(0, Math.round(Number(amount || 0)));

    const reader = await stripe.terminal.readers.setReaderDisplay(reader_id, {
      type: 'cart',
      cart: {
        line_items:
          lineItems.length > 0
            ? lineItems
            : [{ description: 'Custom amount', amount: fallbackTotal, quantity: 1 }],
        total: lineItems.length > 0 ? lineItemsTotal : fallbackTotal,
        currency: 'usd',
      },
    });

    const actionStatus = reader?.action?.status;
    const actionFailure = reader?.action?.failure_message;
    if (actionStatus === 'failed' || actionFailure) {
      return res.status(200).json({
        ok: false,
        reader,
        reader_display_error: actionFailure || 'Reader rejected cart display.',
      });
    }

    return res.status(200).json({ ok: true, reader });
  } catch (error) {
    console.error('Error displaying cart on reader:', error);
    return res.status(500).json({ error: error.message });
  }
}

