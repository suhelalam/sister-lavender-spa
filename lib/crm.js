import admin from 'firebase-admin';

export const normalizePhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};

export const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export const maskName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Guest';
  return `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ''}`;
};

export const customerSearchTokens = ({ name = '', phone = '', email = '' }) => {
  const phoneDigits = normalizePhone(phone);
  const normalizedName = String(name).trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  return Array.from(new Set([
    normalizedName,
    normalizedEmail,
    phoneDigits,
    phoneDigits.slice(-4),
    ...normalizedName.split(/\s+/),
  ].filter(Boolean)));
};

export async function findCustomer(adminDb, { phone, email }) {
  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) {
    const hit = await adminDb.collection('customers').where('phoneNormalized', '==', phoneDigits).limit(1).get();
    if (!hit.empty) return hit.docs[0];
  }
  const emailNormalized = normalizeEmail(email);
  if (emailNormalized) {
    const hit = await adminDb.collection('customers').where('emailNormalized', '==', emailNormalized).limit(1).get();
    if (!hit.empty) return hit.docs[0];
  }
  return null;
}

export async function upsertCustomer(adminDb, input) {
  const existing = input.customerId
    ? await adminDb.collection('customers').doc(input.customerId).get()
    : await findCustomer(adminDb, input);
  const ref = existing?.exists ? existing.ref : adminDb.collection('customers').doc();
  const previous = existing?.exists ? existing.data() : {};
  const now = new Date().toISOString();
  const data = {
    name: String(input.name || previous.name || '').trim(),
    phone: String(input.phone || previous.phone || '').trim(),
    phoneNormalized: normalizePhone(input.phone || previous.phone),
    phoneLast4: normalizePhone(input.phone || previous.phone).slice(-4),
    email: normalizeEmail(input.email || previous.email),
    emailNormalized: normalizeEmail(input.email || previous.email),
    stripeCustomerId: input.stripeCustomerId || previous.stripeCustomerId || null,
    preferences: { ...(previous.preferences || {}), ...(input.preferences || {}) },
    safetyNotes: { ...(previous.safetyNotes || {}), ...(input.safetyNotes || {}) },
    marketingConsent: { ...(previous.marketingConsent || {}), ...(input.marketingConsent || {}) },
    rewards: {
      enrolled: Boolean(input.rewards?.enrolled ?? previous.rewards?.enrolled ?? false),
      enrolledAt: input.rewards?.enrolled
        ? (previous.rewards?.enrolledAt || input.rewards.enrolledAt || now)
        : (previous.rewards?.enrolledAt || null),
      ...(previous.rewards || {}),
      ...(input.rewards || {}),
    },
    internalNotes: previous.internalNotes || '',
    searchTokens: customerSearchTokens({ ...previous, ...input }),
    updatedAt: now,
    createdAt: previous.createdAt || now,
    firstVisitAt: previous.firstVisitAt || null,
    lastVisitAt: previous.lastVisitAt || null,
    totalVisits: Number(previous.totalVisits || 0),
    totalSpentCents: Number(previous.totalSpentCents || 0),
    pointsBalance: Number(previous.pointsBalance || 0),
  };
  await ref.set(data, { merge: true });
  return { id: ref.id, ...data };
}

export async function createVisit(adminDb, customer, input = {}) {
  const now = new Date().toISOString();
  const ref = adminDb.collection('visits').doc();
  const services = Array.isArray(input.services) ? input.services : [];
  const visit = {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    bookingId: input.bookingId || null,
    appointmentAt: input.appointmentAt || now,
    checkedInAt: now,
    status: input.status || 'waiting',
    services,
    serviceNames: services.map((item) => item.name || item.serviceName || item.label).filter(Boolean),
    serviceTotalCents: Number(input.serviceTotalCents || 0),
    amountPaidCents: 0,
    paymentStatus: 'unpaid',
    paymentMethod: null,
    staffId: input.staffId || null,
    staffName: input.staffName || null,
    room: input.room || null,
    durationMinutes: Number(input.durationMinutes || 0),
    notes: String(input.notes || ''),
    safetyNotes: input.safetyNotes || {},
    refundStatus: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(visit);
  await adminDb.collection('customers').doc(customer.id).set({
    firstVisitAt: customer.firstVisitAt || now,
    lastVisitAt: now,
    totalVisits: admin.firestore.FieldValue.increment(1),
    updatedAt: now,
  }, { merge: true });
  return { id: ref.id, ...visit };
}

export async function recordPayment(adminDb, input) {
  const amountCents = Math.round(Number(input.amountCents || 0));
  const eligibleCents = input.pointsEligible === false ? 0 : Math.max(0, Math.round(Number(input.eligibleAmountCents ?? amountCents)));
  let points = 0;
  const pointsToRedeem = Math.max(0, Math.round(Number(input.pointsToRedeem || 0)));
  const rewardDiscountCents = Math.max(0, Math.round(Number(input.rewardDiscountCents || 0)));
  const now = new Date().toISOString();
  const paymentRef = input.externalPaymentId
    ? adminDb.collection('payments').doc(String(input.externalPaymentId))
    : adminDb.collection('payments').doc();
  let payment = {
    customerId: input.customerId,
    visitId: input.visitId,
    externalPaymentId: input.externalPaymentId || null,
    provider: input.provider || 'manual',
    method: input.method || 'other',
    status: input.status || 'succeeded',
    amountCents,
    eligibleAmountCents: eligibleCents,
    pointsEarned: points,
    pointsRedeemed: pointsToRedeem,
    rewardDiscountCents,
    discountCents: Number(input.discountCents || 0),
    notes: String(input.notes || ''),
    createdAt: now,
    updatedAt: now,
  };
  await adminDb.runTransaction(async (tx) => {
    const existingPayment = await tx.get(paymentRef);
    if (existingPayment.exists && existingPayment.data()?.status === payment.status) {
      payment = { ...payment, ...existingPayment.data() };
      points = Number(payment.pointsEarned || 0);
      return;
    }
    const customerRef = adminDb.collection('customers').doc(input.customerId);
    const customerSnapshot = await tx.get(customerRef);
    const rewardsEnrolled = Boolean(customerSnapshot.data()?.rewards?.enrolled);
    const currentPoints = Number(customerSnapshot.data()?.pointsBalance || 0);
    if (pointsToRedeem > 0 && (!rewardsEnrolled || currentPoints < pointsToRedeem)) {
      throw new Error('Customer no longer has enough reward points for this redemption.');
    }
    points = rewardsEnrolled ? Math.floor(eligibleCents / 100) : 0;
    payment.pointsEarned = points;
    payment.rewardsEligible = rewardsEnrolled;
    tx.set(paymentRef, payment, { merge: true });
    const visitUpdate = {
      amountPaidCents: admin.firestore.FieldValue.increment(amountCents),
      paymentStatus: input.status === 'succeeded' ? 'paid' : input.status,
      paymentMethod: input.method || 'other',
      updatedAt: now,
    };
    if (input.status === 'succeeded') visitUpdate.status = 'completed';
    tx.set(adminDb.collection('visits').doc(input.visitId), visitUpdate, { merge: true });
    tx.set(customerRef, {
      totalSpentCents: admin.firestore.FieldValue.increment(amountCents),
      pointsBalance: admin.firestore.FieldValue.increment(points - pointsToRedeem),
      updatedAt: now,
    }, { merge: true });
    if (points) {
      tx.set(adminDb.collection('pointTransactions').doc(), {
        customerId: input.customerId, visitId: input.visitId, paymentId: paymentRef.id,
        type: 'earned', points, reason: `${input.method || 'Payment'} service purchase`, createdAt: now,
      });
    }
    if (pointsToRedeem) {
      tx.set(adminDb.collection('pointTransactions').doc(), {
        customerId: input.customerId, visitId: input.visitId, paymentId: paymentRef.id,
        type: 'redeemed', points: -pointsToRedeem,
        reason: `$${(rewardDiscountCents / 100).toFixed(2)} terminal reward`, createdAt: now,
      });
    }
  });
  return { id: paymentRef.id, ...payment };
}
