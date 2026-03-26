import admin from 'firebase-admin';

function normalizePrivateKey(rawValue) {
  if (!rawValue) return '';
  let key = String(rawValue).trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, '\n').trim();
}

function getAdminCredentials() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY
  );

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const credentials = getAdminCredentials();

if (credentials && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  });
}

const adminDb = admin.apps.length ? admin.firestore() : null;
const isAdminConfigured = Boolean(adminDb);

export { adminDb, isAdminConfigured };
