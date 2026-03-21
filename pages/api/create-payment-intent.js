// pages/api/create-payment-intent.js
import Stripe from 'stripe';
import { db } from '../../lib/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      amount,
      currency = 'usd',
      services = [],
      coupon_code = '',
      discount_amount_cents = 0,
      processing_fee_amount_cents = 0,
    } = req.body || {};

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
      metadata.services = JSON.stringify(safeServices);
      metadata.service_summary = summary;
      metadata.service_count = String(safeServices.length);
    }
    if (coupon_code) {
      metadata.coupon_code = String(coupon_code).slice(0, 100);
    }
    const safeDiscountAmountCents = Math.max(0, Math.round(Number(discount_amount_cents || 0)));
    if (safeDiscountAmountCents > 0) {
      metadata.discount_amount_cents = String(safeDiscountAmountCents);
    }
    const safeProcessingFeeAmountCents = Math.max(
      0,
      Math.round(Number(processing_fee_amount_cents || 0))
    );
    if (safeProcessingFeeAmountCents > 0) {
      metadata.processing_fee_amount_cents = String(safeProcessingFeeAmountCents);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata,
    });

    try {
      await setDoc(doc(db, 'terminalCardPayments', paymentIntent.id), {
        paymentIntentId: paymentIntent.id,
        amount: Math.max(0, Math.round(Number(amount || 0))),
        currency: String(currency || 'usd').toLowerCase(),
        services: safeServices,
        couponCode: coupon_code ? String(coupon_code).slice(0, 100) : '',
        discountAmountCents: safeDiscountAmountCents,
        processingFeeAmountCents: safeProcessingFeeAmountCents,
        createdAt: serverTimestamp(),
      });
    } catch (persistError) {
      // Keep checkout flow resilient even if persistence fails.
      console.warn('Failed to persist terminal card payment draft:', persistError);
    }

    res.status(200).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
}
