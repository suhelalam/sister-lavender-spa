import { google } from 'googleapis';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function parseFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return Boolean(value.booleanValue);
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.mapValue?.fields) return parseFirestoreFields(value.mapValue.fields);
  if (value.arrayValue?.values) return value.arrayValue.values.map(parseFirestoreValue);
  return null;
}

function parseFirestoreFields(fields = {}) {
  const parsed = {};
  Object.entries(fields).forEach(([key, value]) => {
    parsed[key] = parseFirestoreValue(value);
  });
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
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
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/checkins?pageSize=500`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('Firestore check-ins read failed:', body);
      return res.status(500).json({ error: 'Failed to fetch check-ins' });
    }

    const payload = await response.json();
    const checkins = (payload.documents || [])
      .map((doc) => {
        const id = String(doc.name || '').split('/').pop();
        return {
          id,
          ...parseFirestoreFields(doc.fields || {}),
        };
      })
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

    return res.status(200).json({ success: true, checkins });
  } catch (err) {
    console.error('Admin fetch error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
