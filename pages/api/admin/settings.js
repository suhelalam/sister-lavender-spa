import { google } from "googleapis";
import { defaultHomeSettings } from "../../../lib/homeSettings";

const FIRESTORE_DOC_PATH = "settings/homepage";
const FIRESTORE_DB = "(default)";

function sanitizeBusinessHours(input) {
  if (!Array.isArray(input)) return defaultHomeSettings.businessHours;
  return input.map((entry, index) => ({
    day: String(entry?.day || defaultHomeSettings.businessHours[index]?.day || `Day ${index + 1}`),
    open: String(entry?.open || "10:00"),
    close: String(entry?.close || "20:00"),
    closed: Boolean(entry?.closed),
  }));
}

function sanitizeAnnouncements(input) {
  if (!Array.isArray(input)) return defaultHomeSettings.announcements;

  return input
    .map((item, index) => ({
      id: String(item?.id || `announcement-${Date.now()}-${index}`),
      title: String(item?.title || "").trim(),
      date: String(item?.date || "").trim(),
      description: String(item?.description || "").trim(),
      note: String(item?.note || "").trim(),
    }))
    .filter((item) => item.title || item.description);
}

function getFirestoreClient() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const normalizePrivateKey = (rawValue) => {
    if (!rawValue) return "";

    let key = String(rawValue).trim();

    // Remove wrapping quotes if env provider preserved them.
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }

    // Convert escaped newlines from env vars into real newlines.
    key = key.replace(/\\n/g, "\n").trim();

    return key;
  };

  const privateKey = normalizePrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || ""
  );

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing admin service account credentials. Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });

  return google.firestore({ version: "v1", auth });
}

function getDocName() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  return `projects/${projectId}/databases/${FIRESTORE_DB}/documents/${FIRESTORE_DOC_PATH}`;
}

function assertCredentialProjectMatch() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "";

  const emailProjectMatch = clientEmail.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  const emailProjectId = emailProjectMatch?.[1];

  if (projectId && emailProjectId && projectId !== emailProjectId) {
    throw new Error(
      `Service account project mismatch. Firestore project is "${projectId}" but credential email is for "${emailProjectId}". Set FIREBASE_ADMIN_PROJECT_ID/FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY for the Firestore project.`
    );
  }
}

function toFirestoreDocument(settings) {
  return {
    fields: {
      businessHoursJson: { stringValue: JSON.stringify(settings.businessHours) },
      announcementsJson: { stringValue: JSON.stringify(settings.announcements) },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
}

function fromFirestoreDocument(document) {
  const fields = document?.fields || {};
  try {
    const businessHours = sanitizeBusinessHours(
      JSON.parse(fields.businessHoursJson?.stringValue || "[]")
    );
    const announcements = sanitizeAnnouncements(
      JSON.parse(fields.announcementsJson?.stringValue || "[]")
    );
    return { businessHours, announcements };
  } catch {
    return defaultHomeSettings;
  }
}

export default async function handler(req, res) {
  try {
    assertCredentialProjectMatch();
    const firestore = getFirestoreClient();
    const name = getDocName();

    if (req.method === "GET") {
      try {
        const response = await firestore.projects.databases.documents.get({ name });
        return res.status(200).json({
          success: true,
          settings: fromFirestoreDocument(response.data),
        });
      } catch (error) {
        if (error?.code === 404 || error?.status === 404) {
          return res.status(200).json({ success: true, settings: defaultHomeSettings });
        }
        throw error;
      }
    }

    if (req.method === "PUT") {
      const businessHours = sanitizeBusinessHours(req.body?.businessHours);
      const announcements = sanitizeAnnouncements(req.body?.announcements);

      try {
        await firestore.projects.databases.documents.patch({
          name,
          requestBody: toFirestoreDocument({ businessHours, announcements }),
        });
      } catch (error) {
        if (!(error?.code === 404 || error?.status === 404)) throw error;

        const projectId =
          process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        await firestore.projects.databases.documents.createDocument({
          parent: `projects/${projectId}/databases/${FIRESTORE_DB}/documents`,
          collectionId: "settings",
          documentId: "homepage",
          requestBody: toFirestoreDocument({ businessHours, announcements }),
        });
      }

      return res.status(200).json({
        success: true,
        settings: { businessHours, announcements },
      });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Settings API error:", error);
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Internal server error";
    return res.status(500).json({ success: false, error: message });
  }
}
