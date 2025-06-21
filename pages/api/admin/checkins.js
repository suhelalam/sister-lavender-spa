import { db } from '../../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const checkinRef = collection(db, 'checkins');
    const q = query(checkinRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const checkins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ success: true, checkins });
  } catch (err) {
    console.error('Admin fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
