// pages/api/create-payment-intent.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, currency = 'usd', services = [], coupon_code = '' } = req.body || {};

    const safeServices = Array.isArray(services)
      ? services
          .map((service) => ({
            name: String(service?.name || '').trim(),
            quantity: Math.max(1, Number(service?.quantity || 1)),
            amount: Math.max(0, Number(service?.amount || 0)),
          }))
          .filter((service) => service.name && Number.isFinite(service.amount))
      : [];

    const metadata = {};
    if (safeServices.length > 0) {
      const summary = safeServices
        .map((service) => `${service.quantity}x ${service.name}`)
        .join(', ')
        .slice(0, 500);
      metadata.services = summary;
      metadata.service_count = String(safeServices.length);
    }
    if (coupon_code) {
      metadata.coupon_code = String(coupon_code).slice(0, 100);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata,
    });

    res.status(200).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
}
