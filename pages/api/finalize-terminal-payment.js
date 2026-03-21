import Stripe from 'stripe';
import { db } from '../../lib/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_intent_id } = req.body || {};
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Missing payment_intent_id' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ['charges'],
    });

    const charge =
      paymentIntent?.charges?.data && paymentIntent.charges.data.length > 0
        ? paymentIntent.charges.data[0]
        : null;

    const tipAmountCents = Math.max(
      0,
      Math.round(
        Number(charge?.amount_details?.tip?.amount || paymentIntent?.amount_details?.tip?.amount || 0)
      )
    );
    const totalAmountCents = Math.max(
      0,
      Math.round(Number(paymentIntent?.amount_received || paymentIntent?.amount || 0))
    );
    const preTipAmountCents = Math.max(0, totalAmountCents - tipAmountCents);

    await setDoc(
      doc(db, 'terminalCardPayments', payment_intent_id),
      {
        paymentIntentId: payment_intent_id,
        status: paymentIntent?.status || null,
        tipAmountCents,
        preTipAmountCents,
        totalAmountCents,
        receiptEmail: charge?.receipt_email || null,
        finalizedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      payment_intent_id,
      status: paymentIntent?.status || null,
      tip_amount_cents: tipAmountCents,
      pre_tip_amount_cents: preTipAmountCents,
      total_amount_cents: totalAmountCents,
    });
  } catch (error) {
    console.error('Error finalizing terminal payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to finalize terminal payment' });
  }
}

