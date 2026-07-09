import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { value } = req.query;
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return res.status(400).json({ error: 'Search value is required' });
  }

  if (!isAdminConfigured || !adminDb) {
    return res.status(500).json({ error: 'Admin Firestore is not configured' });
  }

  try {
    const normalizedSearch = rawValue.toLowerCase();
    const normalizedDigits = rawValue.replace(/\D/g, '');

    const snapshot = await adminDb
      .collection('customerBookings')
      .where('status', '==', 'active')
      .get();

    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const filteredBookings = bookings.filter((booking) => {
      const customer = booking.customer || {};
      const fullName = String(customer.fullName || customer.name || '').toLowerCase();
      const email = String(customer.email || customer.emailAddress || '').toLowerCase();
      const phone = String(customer.phone || '').toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');

      const matchesName = fullName.includes(normalizedSearch);
      const matchesEmail = email.includes(normalizedSearch);
      const matchesPhone = normalizedDigits
        ? phoneDigits.includes(normalizedDigits)
        : phone.includes(normalizedSearch);

      return matchesName || matchesEmail || matchesPhone;
    });

    return res.status(200).json({ bookings: filteredBookings.slice(0, 20) });
  } catch (error) {
    console.error('Check-in search failed:', error);
    return res.status(500).json({ error: 'Failed to search bookings' });
  }
}
