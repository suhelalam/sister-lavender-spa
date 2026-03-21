import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

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
        const tipAmountCents = Math.max(0, Number(charge?.amount_details?.tip?.amount || 0));
        const discountAmountCents = (() => {
          const centsValue = Number(metadata.discount_amount_cents);
          if (Number.isFinite(centsValue) && centsValue >= 0) return Math.round(centsValue);

          // Backward compatibility if discount was stored in dollars.
          const dollarsValue = Number(metadata.discount_amount);
          if (Number.isFinite(dollarsValue) && dollarsValue >= 0) return Math.round(dollarsValue * 100);
          return 0;
        })();

        return {
          id: pi.id,
          amount: pi.amount,
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
          coupon_code: metadata.coupon_code || '',
          discount_amount_cents: discountAmountCents,
          tip_amount_cents: tipAmountCents,
        };
      })
    );

    res.status(200).json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
}
