import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';

function toUnixSeconds(value, fallbackIso = null) {
  if (!value && !fallbackIso) return Math.floor(Date.now() / 1000);

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Math.floor(date.getTime() / 1000);
  }

  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Accept ms or seconds.
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }

  if (fallbackIso) {
    const parsedFallback = Date.parse(fallbackIso);
    if (Number.isFinite(parsedFallback)) return Math.floor(parsedFallback / 1000);
  }

  return Math.floor(Date.now() / 1000);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const storedPaymentsByIntentId = new Map();
    const cashReceipts = [];
    if (isAdminConfigured && adminDb) {
      try {
        const storedPaymentsSnapshot = await adminDb.collection('terminalCardPayments').get();
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

      try {
        const cashSnapshot = await adminDb.collection('cashPayments').get();
        cashSnapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const receiptNumber = String(data.receiptNumber || '').trim();
          const id = receiptNumber || `cash-${docSnap.id}`;
          const amountCents = Math.max(0, Math.round(Number(data.amount || 0)));
          const discountAmountCents = Math.max(
            0,
            Math.round(Number(data.discountAmount || 0) * 100)
          );
          const createdUnixSeconds = toUnixSeconds(data.createdAt, data.timestamp);

          cashReceipts.push({
            id,
            amount: amountCents,
            currency: 'usd',
            created: createdUnixSeconds,
            metadata: { payment_type: 'cash' },
            customer: data.stripeCustomerId || null,
            description: 'Cash payment',
            receipt_email: data.customerEmail || data.customer_email || null,
            receipt_url: null,
            customer_name: data.customerName || data.customer_name || null,
            customer_phone: data.customerPhone || data.customer_phone || null,
            customer_email: data.customerEmail || data.customer_email || null,
            coupon_code: data.couponCode || '',
            coupon_id: '',
            promotion_code_id: '',
            coupon_name: '',
            coupon_discount_type: '',
            coupon_percent_off: null,
            coupon_amount_off_cents: 0,
            coupon_currency: '',
            coupon_discount_display: '',
            discount_amount_cents: discountAmountCents,
            processing_fee_amount_cents: 0,
            tip_amount_cents: 0,
            pre_tip_amount_cents: amountCents,
            stored_services: Array.isArray(data.services) ? data.services : [],
          });
        });
      } catch (cashError) {
        console.warn('Failed to load cashPayments for receipts:', cashError);
      }
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
        const metadata = pi.metadata || {};
        const storedPayment = storedPaymentsByIntentId.get(pi.id) || null;
        const customerName =
          chargeDetails?.name ||
          customer?.name ||
          storedPayment?.customerName ||
          metadata.customer_name ||
          null;
        const customerPhone =
          chargeDetails?.phone ||
          customer?.phone ||
          storedPayment?.customerPhone ||
          metadata.customer_phone ||
          null;
        const customerEmailResolved =
          (charge ? charge.receipt_email : null) ||
          customerEmail ||
          storedPayment?.customerEmail ||
          metadata.customer_email ||
          null;
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
          receipt_email: customerEmailResolved,
          receipt_url: charge ? charge.receipt_url : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmailResolved,
          coupon_code: storedPayment?.couponCode || metadata.coupon_code || '',
          coupon_id: storedPayment?.couponId || metadata.coupon_id || '',
          promotion_code_id: storedPayment?.promotionCodeId || metadata.promotion_code_id || '',
          coupon_name: storedPayment?.couponName || metadata.coupon_name || '',
          coupon_discount_type:
            storedPayment?.couponDiscountType || metadata.coupon_discount_type || '',
          coupon_percent_off: (() => {
            if (storedPayment?.couponPercentOff !== undefined && storedPayment?.couponPercentOff !== null) {
              const storedPercent = Number(storedPayment.couponPercentOff);
              return Number.isFinite(storedPercent) && storedPercent > 0 ? storedPercent : null;
            }
            const metadataPercent = Number(metadata.coupon_percent_off || 0);
            return Number.isFinite(metadataPercent) && metadataPercent > 0 ? metadataPercent : null;
          })(),
          coupon_amount_off_cents:
            storedPayment?.couponAmountOffCents ??
            Math.max(0, Number(metadata.coupon_amount_off_cents || 0)),
          coupon_currency: storedPayment?.couponCurrency || metadata.coupon_currency || '',
          coupon_discount_display:
            storedPayment?.couponDiscountDisplay || metadata.coupon_discount_display || '',
          discount_amount_cents: discountAmountCents,
          processing_fee_amount_cents: processingFeeAmountCents,
          tip_amount_cents: tipAmountCents,
          pre_tip_amount_cents: preTipAmountCents,
          stored_services: Array.isArray(storedPayment?.services) ? storedPayment.services : [],
        };
      })
    );

    const combinedReceipts = [...receipts, ...cashReceipts].sort(
      (a, b) => Number(b.created || 0) - Number(a.created || 0)
    );

    res.status(200).json({ receipts: combinedReceipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
}
