import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
      serviceDate
    } = req.body;

    // Required fields validation
    if (!customerName || !agreed || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare data object with required fields
    const data = {
      customerName,
      agreed,
      signature,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Optional fields
    if (bookingId) data.bookingId = bookingId;
    if (notes && notes.trim()) data.notes = notes.trim();
    if (phone && phone.trim()) data.phone = phone.trim();
    if (email && email.trim()) data.email = email.trim();
    if (address && address.trim()) data.address = address.trim();
    if (serviceDate) data.serviceDate = serviceDate;

    // Save to Firestore
    const docRef = await addDoc(collection(db, "checkins"), data);

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("Firebase write error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
