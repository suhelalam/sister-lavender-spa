import { adminDb, isAdminConfigured } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdminConfigured || !adminDb) {
    return res.status(500).json({ error: 'Admin Firestore is not configured' });
  }

  try {
    const {
      bookingId,
      customerName,
      agreed,
      signature,
      notes,
      timestamp,
      phone,
      email,
      address,
      serviceDate,
    } = req.body;

    if (!customerName || !agreed || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = {
      bookingId: bookingId || null,
      customerName,
      agreed,
      signature,
      notes: notes?.trim() || null,
      timestamp: timestamp || new Date().toISOString(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      serviceDate: serviceDate || null,
    };

    const docRef = await adminDb.collection('checkins').add(payload);

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('Firestore check-in write failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to store check-in' });
  }
}
