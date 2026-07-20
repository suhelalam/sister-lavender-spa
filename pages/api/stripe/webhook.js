import Stripe from 'stripe';
import admin from 'firebase-admin';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { recordPayment } from '../../../lib/crm';

export const config = { api: { bodyParser: false } };
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const readBody = (req) => new Promise((resolve, reject) => { const chunks=[]; req.on('data',(chunk)=>chunks.push(chunk)); req.on('end',()=>resolve(Buffer.concat(chunks))); req.on('error',reject); });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Database unavailable' });
  let event;
  try { event = stripe.webhooks.constructEvent(await readBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return res.status(400).send(`Webhook error: ${error.message}`); }
  try {
    const object = event.data.object;
    if (event.type === 'payment_intent.succeeded') {
      const customerId = object.metadata?.customer_id;
      const visitId = object.metadata?.visit_id;
      if (customerId && visitId) await recordPayment(adminDb, { customerId, visitId, externalPaymentId: object.id, provider: 'stripe', method: 'card', status: 'succeeded', amountCents: object.amount_received, eligibleAmountCents: Math.max(0, Number(object.amount_received||0)-Number(object.metadata?.tip_amount_cents||0)-Number(object.metadata?.processing_fee_amount_cents||0)), pointsToRedeem: Number(object.metadata?.reward_points_to_redeem || 0), rewardDiscountCents: Number(object.metadata?.reward_discount_amount_cents || 0), discountCents: Number(object.metadata?.discount_amount_cents || 0) + Number(object.metadata?.reward_discount_amount_cents || 0) });
      else await adminDb.collection('unmatchedPayments').doc(object.id).set({ paymentIntentId: object.id, stripeCustomerId: object.customer || null, amountCents: object.amount_received || object.amount, status: object.status, reason: 'Missing customer or visit metadata', createdAt: new Date().toISOString() }, { merge:true });
    }
    if (['payment_intent.payment_failed','payment_intent.canceled'].includes(event.type)) {
      await adminDb.collection('payments').doc(object.id).set({ externalPaymentId:object.id, status:object.status, updatedAt:new Date().toISOString() },{merge:true});
    }
    if (event.type === 'charge.refunded') {
      const paymentId = object.payment_intent;
      const ref = adminDb.collection('payments').doc(paymentId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const p = snap.data();
        const previousRefund = Number(p.refundedCents || 0);
        const refundedCents = Number(object.amount_refunded || 0);
        const delta = Math.max(0, refundedCents - previousRefund);
        if (!delta) return;
        const pointsRemoved = Math.min(Number(p.pointsEarned || 0), Math.floor(delta / 100));
        const pointsRestored = object.refunded && !p.rewardPointsRestored
          ? Number(p.pointsRedeemed || 0)
          : 0;
        const now = new Date().toISOString();
        tx.set(ref, { refundedCents, status: object.refunded ? 'refunded' : 'partially_refunded', rewardPointsRestored: Boolean(p.rewardPointsRestored || pointsRestored), updatedAt: now }, { merge: true });
        tx.set(adminDb.collection('customers').doc(p.customerId), { totalSpentCents: admin.firestore.FieldValue.increment(-delta), pointsBalance: admin.firestore.FieldValue.increment(pointsRestored - pointsRemoved) }, { merge: true });
        tx.set(adminDb.collection('visits').doc(p.visitId), { refundStatus: object.refunded ? 'full' : 'partial', amountPaidCents: admin.firestore.FieldValue.increment(-delta), updatedAt: now }, { merge: true });
        if (pointsRemoved) tx.set(adminDb.collection('pointTransactions').doc(), { customerId: p.customerId, visitId: p.visitId, paymentId, type: 'refund', points: -pointsRemoved, reason: 'Stripe refund', createdAt: now });
        if (pointsRestored) tx.set(adminDb.collection('pointTransactions').doc(), { customerId: p.customerId, visitId: p.visitId, paymentId, type: 'redemption-refund', points: pointsRestored, reason: 'Reward returned after full refund', createdAt: now });
      });
    }
    if (event.type === 'charge.dispute.created') await adminDb.collection('payments').doc(object.payment_intent).set({ status:'disputed', disputeId:object.id, updatedAt:new Date().toISOString() },{merge:true});
    return res.json({ received:true });
  } catch(error){console.error('Stripe webhook processing failed',error);return res.status(500).json({error:error.message});}
}
