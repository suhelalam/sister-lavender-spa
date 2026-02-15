import { google } from 'googleapis';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function toFirestoreFields(data) {
  const fields = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
      return;
    }
    fields[key] = { stringValue: String(value) };
  });

  return fields;
}

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

    if (!FIREBASE_PROJECT_ID) {
      return res.status(500).json({ error: 'Missing Firebase project id configuration' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const accessToken = accessTokenResponse?.token;
    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to obtain Google access token' });
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/checkins`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('Firestore check-in write failed:', body);
      return res.status(500).json({ error: 'Failed to store check-in' });
    }

    const result = await response.json();
    const namePath = result?.name || '';
    const id = namePath.split('/').pop() || null;

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error("Firebase write error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
