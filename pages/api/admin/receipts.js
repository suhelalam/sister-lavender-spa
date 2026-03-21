import Stripe from 'stripe';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const storedPaymentsByIntentId = new Map();
    try {
      const storedPaymentsSnapshot = await getDocs(collection(db, 'terminalCardPayments'));
      storedPaymentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const intentId = String(data.paymentIntentId || docSnap.id || '').trim();
        if (!intentId) return;
        storedPaymentsByIntentId.set(intentId, data);
      });
    } catch (firestoreError) {
      // Keep receipts page usable even if Firestore read is unavailable.
      console.warn('Failed to load terminalCardPayments fallback data:', firestoreError);
    }

    // List payment intents, limit to 100 for now, then filter by succeeded
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      expand: ['data.customer', 'data.charges'],
    });

    // Filter to only succeeded
    const succeededIntents = paymentIntents.data.filter(pi => pi.status === 'succeeded');

    // For each payment intent, get the charge to get more details if needed
    const receipts = await Promise.all(
      succeededIntents.map(async (pi) => {
        let charge = null;
        if (pi.charges && pi.charges.data && pi.charges.data.length > 0) {
          charge = pi.charges.data[0];
        }
        const customer = pi.customer && typeof pi.customer === 'object' ? pi.customer : null;
        const customerEmail = customer?.email || null;
        const chargeDetails = charge?.billing_details || {};
        const customerName = chargeDetails?.name || customer?.name || null;
        const customerPhone = chargeDetails?.phone || customer?.phone || null;
        const metadata = pi.metadata || {};
        const storedPayment = storedPaymentsByIntentId.get(pi.id) || null;
        const tipFromStripe = Number(
          charge?.amount_details?.tip?.amount ?? pi?.amount_details?.tip?.amount
        );
        const tipAmountCents = (() => {
          if (Number.isFinite(tipFromStripe) && tipFromStripe >= 0) return Math.round(tipFromStripe);
          return 0;
        })();
        const totalAmountCents = (() => {
          const storedTotal = Number(storedPayment?.totalAmountCents);
          if (Number.isFinite(storedTotal) && storedTotal > 0) return Math.round(storedTotal);
          return Math.max(0, Number(pi.amount_received || pi.amount || 0));
        })();
        const preTipAmountCents = (() => {
          return Math.max(0, totalAmountCents - tipAmountCents);
        })();
        const discountAmountCents = (() => {
          const storedDiscount = Number(storedPayment?.discountAmountCents);
          if (Number.isFinite(storedDiscount) && storedDiscount >= 0) return Math.round(storedDiscount);

          const centsValue = Number(metadata.discount_amount_cents);
          if (Number.isFinite(centsValue) && centsValue >= 0) return Math.round(centsValue);

          // Backward compatibility if discount was stored in dollars.
          const dollarsValue = Number(metadata.discount_amount);
          if (Number.isFinite(dollarsValue) && dollarsValue >= 0) return Math.round(dollarsValue * 100);
          return 0;
        })();
        const processingFeeAmountCents = (() => {
          const storedFee = Number(storedPayment?.processingFeeAmountCents);
          if (Number.isFinite(storedFee) && storedFee >= 0) return Math.round(storedFee);

          const metadataFee = Number(metadata.processing_fee_amount_cents);
          if (Number.isFinite(metadataFee) && metadataFee >= 0) return Math.round(metadataFee);
          return 0;
        })();

        return {
          id: pi.id,
          amount: totalAmountCents,
          currency: pi.currency,
          created: pi.created,
          metadata,
          customer: pi.customer,
          description: pi.description,
          receipt_email: charge ? charge.receipt_email : customerEmail,
          receipt_url: charge ? charge.receipt_url : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: charge ? charge.receipt_email || customerEmail : customerEmail,
          coupon_code: storedPayment?.couponCode || metadata.coupon_code || '',
          discount_amount_cents: discountAmountCents,
          processing_fee_amount_cents: processingFeeAmountCents,
          tip_amount_cents: tipAmountCents,
          pre_tip_amount_cents: preTipAmountCents,
          stored_services: Array.isArray(storedPayment?.services) ? storedPayment.services : [],
        };
      })
    );

    res.status(200).json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
}
