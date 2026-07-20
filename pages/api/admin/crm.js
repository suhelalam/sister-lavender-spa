import admin from 'firebase-admin';
import crypto from 'crypto';
import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { customerSearchTokens, normalizeEmail, normalizePhone, recordPayment } from '../../../lib/crm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const serialize = (doc) => ({ id: doc.id, ...doc.data() });

async function syncHistoricalCustomers() {
  const syncRef = adminDb.collection('systemMetadata').doc('crmCustomerSync');
  const syncSnapshot = await syncRef.get();
  const lastSyncMs = Date.parse(syncSnapshot.data()?.completedAt || '');
  if (Number.isFinite(lastSyncMs) && Date.now() - lastSyncMs < 6 * 60 * 60 * 1000) return;

  const [existing, bookings, spending, stripeCustomers] = await Promise.all([
    adminDb.collection('customers').limit(2000).get(),
    adminDb.collection('customerBookings').limit(2000).get(),
    adminDb.collection('customerSpending').limit(2000).get(),
    stripe.customers.list({ limit: 100 }).autoPagingToArray({ limit: 2000 }),
  ]);
  const byPhone = new Map();
  const byEmail = new Map();
  const existingPaths = new Set(existing.docs.map((doc) => doc.ref.path));
  existing.docs.forEach((doc) => {
    const data = doc.data();
    if (data.phoneNormalized) byPhone.set(data.phoneNormalized, doc.ref);
    if (data.emailNormalized) byEmail.set(data.emailNormalized, doc.ref);
  });
  const records = [
    ...stripeCustomers.map((item) => ({ name: item.name, phone: item.phone, email: item.email, stripeCustomerId: item.id, source: 'stripe' })),
    ...bookings.docs.map((doc) => { const customer = doc.data().customer || {}; return { name: customer.fullName || customer.name, phone: customer.phone, email: customer.email || customer.emailAddress, source: 'booking' }; }),
    ...spending.docs.map((doc) => { const item = doc.data(); return { name: item.name, phone: item.phone, email: item.email, stripeCustomerId: item.stripeCustomerId, source: 'spending' }; }),
  ];
  const updates = new Map();
  records.forEach((record) => {
    const phoneNormalized = normalizePhone(record.phone);
    const emailNormalized = normalizeEmail(record.email);
    if (!phoneNormalized && !emailNormalized) return;
    let ref = byPhone.get(phoneNormalized) || byEmail.get(emailNormalized);
    if (!ref) {
      const identity = phoneNormalized || emailNormalized;
      ref = adminDb.collection('customers').doc(`legacy_${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 24)}`);
      if (phoneNormalized) byPhone.set(phoneNormalized, ref);
      if (emailNormalized) byEmail.set(emailNormalized, ref);
    }
    const previous = updates.get(ref.path) || {};
    updates.set(ref.path, { ref, name: record.name || previous.name || '', phone: record.phone || previous.phone || '', email: emailNormalized || previous.email || '', phoneNormalized: phoneNormalized || previous.phoneNormalized || '', stripeCustomerId: record.stripeCustomerId || previous.stripeCustomerId || null, sources: Array.from(new Set([...(previous.sources || []), record.source])) });
  });
  const entries = Array.from(updates.values());
  for (let index = 0; index < entries.length; index += 400) {
    const batch = adminDb.batch();
    entries.slice(index, index + 400).forEach((item) => {
      const now = new Date().toISOString();
      const customerData = {
        name: item.name, phone: item.phone, phoneNormalized: item.phoneNormalized,
        phoneLast4: item.phoneNormalized.slice(-4), email: item.email, emailNormalized: item.email,
        stripeCustomerId: item.stripeCustomerId,
        searchTokens: customerSearchTokens(item), importedSources: item.sources,
        updatedAt: now,
      };
      if (!existingPaths.has(item.ref.path)) Object.assign(customerData, {
        createdAt: now, rewards: { enrolled: false, enrolledAt: null },
        pointsBalance: 0, totalSpentCents: 0, totalVisits: 0,
      });
      batch.set(item.ref, customerData, { merge: true });
    });
    await batch.commit();
  }
  await syncRef.set({ completedAt: new Date().toISOString(), importedRecords: entries.length }, { merge: true });
}

export default async function handler(req, res) {
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer database is not configured.' });
  try {
    if (req.method === 'GET') {
      const { customerId, q = '', export: exportType } = req.query;
      if (exportType) {
        const allowed = ['customers', 'visits', 'payments', 'pointTransactions'];
        if (!allowed.includes(exportType)) return res.status(400).json({ error: 'Invalid export.' });
        const snap = await adminDb.collection(exportType).limit(2000).get();
        const rows = snap.docs.map(serialize);
        const keys = Array.from(new Set(rows.flatMap(Object.keys))).filter((key) => !['signature'].includes(key));
        const cell = (value) => `"${String(typeof value === 'object' ? JSON.stringify(value) : value ?? '').replace(/"/g, '""')}"`;
        const csv = [keys.map(cell).join(','), ...rows.map((row) => keys.map((key) => cell(row[key])).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportType}.csv"`);
        return res.send(csv);
      }
      if (customerId) {
        const [customer, visits, payments, points] = await Promise.all([
          adminDb.collection('customers').doc(customerId).get(),
          adminDb.collection('visits').where('customerId', '==', customerId).get(),
          adminDb.collection('payments').where('customerId', '==', customerId).get(),
          adminDb.collection('pointTransactions').where('customerId', '==', customerId).get(),
        ]);
        if (!customer.exists) return res.status(404).json({ error: 'Customer not found.' });
        const byDate = (a, b) => String(b.createdAt || b.checkedInAt || '').localeCompare(String(a.createdAt || a.checkedInAt || ''));
        return res.json({ customer: serialize(customer), visits: visits.docs.map(serialize).sort(byDate), payments: payments.docs.map(serialize).sort(byDate), points: points.docs.map(serialize).sort(byDate) });
      }
      if (String(req.query.sync || '') === '1') {
        try { await syncHistoricalCustomers(); }
        catch (syncError) { console.error('Historical CRM sync failed:', syncError); }
      }
      const [customersSnap, visitsSnap] = await Promise.all([
        adminDb.collection('customers').limit(2000).get(),
        adminDb.collection('visits').limit(500).get(),
      ]);
      const term = String(q).trim().toLowerCase();
      const customers = customersSnap.docs.map(serialize).filter((item) => !term || [item.name, item.phone, item.email, item.phoneLast4].some((v) => String(v || '').toLowerCase().includes(term)));
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const visits = visitsSnap.docs.map(serialize).filter((item) => String(item.appointmentAt || item.checkedInAt || '').startsWith(today));
      return res.json({ customers, visits, summary: {
        waiting: visits.filter((v) => v.status === 'waiting').length,
        inProgress: visits.filter((v) => v.status === 'in-progress').length,
        completed: visits.filter((v) => v.status === 'completed').length,
        unpaid: visits.filter((v) => v.paymentStatus !== 'paid').length,
        salesCents: visits.reduce((sum, v) => sum + Number(v.amountPaidCents || 0), 0),
      } });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'payment') return res.status(201).json({ payment: await recordPayment(adminDb, body) });
      if (body.action === 'points') {
        const points = Math.round(Number(body.points || 0));
        if (!points) return res.status(400).json({ error: 'A non-zero point adjustment is required.' });
        const now = new Date().toISOString();
        await adminDb.runTransaction(async (tx) => {
          tx.set(adminDb.collection('customers').doc(body.customerId), { pointsBalance: admin.firestore.FieldValue.increment(points), updatedAt: now }, { merge: true });
          tx.set(adminDb.collection('pointTransactions').doc(), { customerId: body.customerId, visitId: body.visitId || null, type: points > 0 ? 'adjustment-add' : 'redeemed', points, reason: String(body.reason || 'Owner adjustment'), createdAt: now });
        });
        return res.json({ success: true });
      }
      if (body.action === 'visit') {
        await adminDb.collection('visits').doc(body.visitId).set({
          status: body.status, staffName: body.staffName || null, room: body.room || null,
          appointmentAt: body.appointmentAt || null, durationMinutes: Number(body.durationMinutes || 0), updatedAt: new Date().toISOString(),
        }, { merge: true });
        return res.json({ success: true });
      }
      if (body.action === 'customer') {
        await adminDb.collection('customers').doc(body.customerId).set({ internalNotes: String(body.internalNotes || ''), preferredStaff: String(body.preferredStaff || ''), updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ success: true });
      }
      if (body.action === 'merge') {
        const sourceRef = adminDb.collection('customers').doc(body.sourceCustomerId);
        const targetRef = adminDb.collection('customers').doc(body.targetCustomerId);
        if (sourceRef.id === targetRef.id) return res.status(400).json({ error: 'Choose two different profiles.' });
        const [source, target] = await Promise.all([sourceRef.get(), targetRef.get()]);
        if (!source.exists || !target.exists) return res.status(404).json({ error: 'Profile not found.' });
        const batch = adminDb.batch();
        for (const collectionName of ['visits', 'payments', 'pointTransactions']) {
          const refs = await adminDb.collection(collectionName).where('customerId', '==', sourceRef.id).get();
          refs.docs.forEach((doc) => batch.update(doc.ref, { customerId: targetRef.id }));
        }
        batch.set(targetRef, {
          totalVisits: Number(target.data().totalVisits || 0) + Number(source.data().totalVisits || 0),
          totalSpentCents: Number(target.data().totalSpentCents || 0) + Number(source.data().totalSpentCents || 0),
          pointsBalance: Number(target.data().pointsBalance || 0) + Number(source.data().pointsBalance || 0),
          mergedProfileIds: admin.firestore.FieldValue.arrayUnion(sourceRef.id),
        }, { merge: true });
        batch.delete(sourceRef);
        await batch.commit();
        return res.json({ success: true });
      }
      return res.status(400).json({ error: 'Unknown action.' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('CRM admin error', error); return res.status(500).json({ error: error.message }); }
}
