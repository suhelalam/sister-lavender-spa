import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../lib/firebaseAdmin';
import { createVisit, findCustomer, recordPayment, upsertCustomer } from '../../lib/crm';

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
    const processingFeeCents = Math.max(0, Number(paymentIntent?.metadata?.processing_fee_amount_cents || 0));
    const preTipAmountCents = Math.max(0, totalAmountCents - tipAmountCents - processingFeeCents);

    let rewards = null;
    if (isAdminConfigured && adminDb) {
      await adminDb.collection('terminalCardPayments').doc(payment_intent_id).set({
        paymentIntentId: payment_intent_id,
        status: paymentIntent?.status || null,
        tipAmountCents,
        preTipAmountCents,
        totalAmountCents,
        receiptEmail: charge?.receipt_email || null,
        finalizedAt: new Date().toISOString(),
      }, { merge: true });

      if (paymentIntent.status === 'succeeded') {
        const metadata = paymentIntent.metadata || {};
        let customerId = metadata.customer_id || '';
        let visitId = metadata.visit_id || '';
        if (!customerId) {
          const match = await findCustomer(adminDb, { phone: metadata.customer_phone, email: metadata.customer_email });
          if (match?.exists) customerId = match.id;
          else if (metadata.customer_name || metadata.customer_phone || metadata.customer_email) customerId = (await upsertCustomer(adminDb, { name: metadata.customer_name, phone: metadata.customer_phone, email: metadata.customer_email })).id;
        }
        if (!visitId && customerId) {
          const openVisits = await adminDb.collection('visits').where('customerId', '==', customerId).limit(20).get();
          const recent = openVisits.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((v) => v.paymentStatus !== 'paid').sort((a,b)=>String(b.checkedInAt||'').localeCompare(String(a.checkedInAt||'')))[0];
          visitId = recent?.id || '';
        }
        if (!visitId && customerId) {
          const customerSnapshot = await adminDb.collection('customers').doc(customerId).get();
          if (customerSnapshot.exists) {
            let services = [];
            try { services = JSON.parse(metadata.services || '[]'); } catch {}
            const visit = await createVisit(adminDb, { id: customerSnapshot.id, ...customerSnapshot.data() }, {
              status: 'completed', services,
              serviceTotalCents: preTipAmountCents + Number(metadata.discount_amount_cents || 0) + Number(metadata.reward_discount_amount_cents || 0),
            });
            visitId = visit.id;
          }
        }
        if (customerId && visitId) {
          const payment = await recordPayment(adminDb, { customerId, visitId, externalPaymentId: payment_intent_id, provider: 'stripe', method: 'card', status: 'succeeded', amountCents: totalAmountCents, eligibleAmountCents: preTipAmountCents, discountCents: Number(metadata.discount_amount_cents || 0) + Number(metadata.reward_discount_amount_cents || 0), pointsToRedeem: Number(metadata.reward_points_to_redeem || 0), rewardDiscountCents: Number(metadata.reward_discount_amount_cents || 0) });
          const updatedCustomer = await adminDb.collection('customers').doc(customerId).get();
          rewards = { pointsEarned: Number(payment.pointsEarned || 0), pointsRedeemed: Number(payment.pointsRedeemed || 0), pointsBalance: Number(updatedCustomer.data()?.pointsBalance || 0) };
        } else {
          await adminDb.collection('unmatchedPayments').doc(payment_intent_id).set({ paymentIntentId: payment_intent_id, customerId: customerId || null, amountCents: totalAmountCents, status: paymentIntent.status, createdAt: new Date().toISOString() }, { merge: true });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      payment_intent_id,
      status: paymentIntent?.status || null,
      tip_amount_cents: tipAmountCents,
      pre_tip_amount_cents: preTipAmountCents,
      total_amount_cents: totalAmountCents,
      rewards,
    });
  } catch (error) {
    console.error('Error finalizing terminal payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to finalize terminal payment' });
  }
}
