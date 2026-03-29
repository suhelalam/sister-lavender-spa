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
      stripe_customer_id = '',
      customer_name = '',
      customer_email = '',
      customer_phone = '',
      coupon_code = '',
      coupon_id = '',
      promotion_code_id = '',
      coupon_name = '',
      coupon_discount_type = '',
      coupon_percent_off = null,
      coupon_amount_off_cents = null,
      coupon_currency = '',
      coupon_discount_display = '',
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
    if (coupon_id) {
      metadata.coupon_id = String(coupon_id).slice(0, 100);
    }
    if (promotion_code_id) {
      metadata.promotion_code_id = String(promotion_code_id).slice(0, 100);
    }
    if (coupon_name) {
      metadata.coupon_name = String(coupon_name).slice(0, 100);
    }
    if (coupon_discount_type) {
      metadata.coupon_discount_type = String(coupon_discount_type).slice(0, 20);
    }
    if (coupon_discount_display) {
      metadata.coupon_discount_display = String(coupon_discount_display).slice(0, 100);
    }
    const safeCouponPercentOff = Number(coupon_percent_off);
    if (Number.isFinite(safeCouponPercentOff) && safeCouponPercentOff > 0) {
      metadata.coupon_percent_off = String(safeCouponPercentOff);
    }
    const safeCouponAmountOffCents = Math.max(0, Math.round(Number(coupon_amount_off_cents || 0)));
    if (safeCouponAmountOffCents > 0) {
      metadata.coupon_amount_off_cents = String(safeCouponAmountOffCents);
    }
    if (coupon_currency) {
      metadata.coupon_currency = String(coupon_currency).slice(0, 10).toUpperCase();
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
    const safeCustomerName = String(customer_name || '').trim();
    const safeCustomerEmail = String(customer_email || '').trim().toLowerCase();
    const safeCustomerPhone = String(customer_phone || '').trim();
    const safeStripeCustomerId = String(stripe_customer_id || '').trim();
    if (safeCustomerName) metadata.customer_name = safeCustomerName.slice(0, 100);
    if (safeCustomerEmail) metadata.customer_email = safeCustomerEmail.slice(0, 100);
    if (safeCustomerPhone) metadata.customer_phone = safeCustomerPhone.slice(0, 40);
    if (safeStripeCustomerId) metadata.stripe_customer_id = safeStripeCustomerId.slice(0, 100);

    const paymentIntentPayload = {
      amount,
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata,
    };
    if (safeStripeCustomerId) {
      paymentIntentPayload.customer = safeStripeCustomerId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentPayload);

    try {
      await setDoc(doc(db, 'terminalCardPayments', paymentIntent.id), {
        paymentIntentId: paymentIntent.id,
        amount: Math.max(0, Math.round(Number(amount || 0))),
        currency: String(currency || 'usd').toLowerCase(),
        services: safeServices,
        stripeCustomerId: safeStripeCustomerId || null,
        customerName: safeCustomerName || null,
        customerEmail: safeCustomerEmail || null,
        customerPhone: safeCustomerPhone || null,
        couponCode: coupon_code ? String(coupon_code).slice(0, 100) : '',
        couponId: coupon_id ? String(coupon_id).slice(0, 100) : '',
        promotionCodeId: promotion_code_id ? String(promotion_code_id).slice(0, 100) : '',
        couponName: coupon_name ? String(coupon_name).slice(0, 100) : '',
        couponDiscountType: coupon_discount_type ? String(coupon_discount_type).slice(0, 20) : '',
        couponPercentOff:
          Number.isFinite(safeCouponPercentOff) && safeCouponPercentOff > 0 ? safeCouponPercentOff : null,
        couponAmountOffCents: safeCouponAmountOffCents > 0 ? safeCouponAmountOffCents : 0,
        couponCurrency: coupon_currency ? String(coupon_currency).slice(0, 10).toUpperCase() : '',
        couponDiscountDisplay: coupon_discount_display
          ? String(coupon_discount_display).slice(0, 100)
          : '',
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
