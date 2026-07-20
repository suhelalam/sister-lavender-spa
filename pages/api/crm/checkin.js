import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';
import { createVisit, upsertCustomer } from '../../../lib/crm';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdminConfigured || !adminDb) return res.status(503).json({ error: 'Customer database is not configured.' });
  try {
    const body = req.body || {};
    if (!body.customerId && (!body.name || !body.phone)) return res.status(400).json({ error: 'Name and full phone are required for a new customer.' });
    if (!Array.isArray(body.services) || !body.services.length) return res.status(400).json({ error: 'Select at least one service.' });
    if (!body.consent) return res.status(400).json({ error: 'Service consent is required.' });
    const customer = await upsertCustomer(adminDb, body);
    const visit = await createVisit(adminDb, customer, {
      bookingId: body.bookingId, appointmentAt: body.appointmentAt, services: body.services,
      serviceTotalCents: body.services.reduce((sum, item) => sum + Number(item.price || 0), 0),
      durationMinutes: body.services.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0),
      notes: body.notes, safetyNotes: body.safetyNotes,
    });
    await adminDb.collection('checkins').doc(visit.id).set({ ...visit, customerId: customer.id, visitId: visit.id }, { merge: true });
    return res.status(201).json({ customer, visit });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
