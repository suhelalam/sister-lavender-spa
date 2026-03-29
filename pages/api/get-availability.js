import { google } from "googleapis";
import { fromZonedTime } from "date-fns-tz";
import { defaultBusinessHours } from "../../lib/homeSettings";

const FIRESTORE_DOC_PATH = "settings/homepage";
const FIRESTORE_DB = "(default)";
const BUSINESS_TIME_ZONE = "America/Chicago";

function normalizePrivateKey(rawValue) {
  if (!rawValue) return "";
  let key = String(rawValue).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n").trim();
}

function getFirestoreClient() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || ""
  );

  if (!clientEmail || !privateKey) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });

  return google.firestore({ version: "v1", auth });
}

function getSettingsDocName() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return `projects/${projectId}/databases/${FIRESTORE_DB}/documents/${FIRESTORE_DOC_PATH}`;
}

function sanitizeBusinessHours(input) {
  if (!Array.isArray(input)) return defaultBusinessHours;
  return input.map((entry, index) => ({
    day: String(entry?.day || defaultBusinessHours[index]?.day || `Day ${index + 1}`),
    open: String(entry?.open || defaultBusinessHours[index]?.open || "10:00"),
    close: String(entry?.close || defaultBusinessHours[index]?.close || "20:00"),
    closed: Boolean(entry?.closed),
  }));
}

function parseBusinessHoursDoc(document) {
  try {
    const json = document?.fields?.businessHoursJson?.stringValue || "[]";
    return sanitizeBusinessHours(JSON.parse(json));
  } catch {
    return defaultBusinessHours;
  }
}

async function loadBusinessHours() {
  const firestore = getFirestoreClient();
  const name = getSettingsDocName();
  if (!firestore || !name) return defaultBusinessHours;

  try {
    const response = await firestore.projects.databases.documents.get({ name });
    return parseBusinessHoursDoc(response.data);
  } catch (error) {
    if (error?.code === 404 || error?.status === 404) return defaultBusinessHours;
    console.error("Failed to load business hours for availability:", error);
    return defaultBusinessHours;
  }
}

function padTwo(value) {
  return String(value).padStart(2, "0");
}

function getDayName(year, month, day) {
  const localDateTime = `${year}-${padTwo(month)}-${padTwo(day)}T12:00:00`;
  const utcDate = fromZonedTime(localDateTime, BUSINESS_TIME_ZONE);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(utcDate);
}

function toUtcDateFromBusinessLocal(year, month, day, hour, minute) {
  const localDateTime = `${year}-${padTwo(month)}-${padTwo(day)}T${padTwo(hour)}:${padTwo(minute)}:00`;
  return fromZonedTime(localDateTime, BUSINESS_TIME_ZONE);
}

function parseTimeValue(value, fallbackHour, fallbackMinute) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: fallbackHour, minute: fallbackMinute };

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }

  return { hour, minute };
}

export default async function handler(req, res) {
  const { startDate } = req.body;

  const generateTimeSlots = (dateString, businessHours) => {
    const slots = [];
    const durationMinutes = 30;

    const [yearRaw, monthRaw, dayRaw] = dateString.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const dayName = getDayName(year, month, day);
    const dayHours = Array.isArray(businessHours)
      ? businessHours.find((entry) => String(entry?.day).toLowerCase() === dayName.toLowerCase())
      : null;

    if (!dayHours || dayHours.closed) return [];

    const { hour: startHour, minute: startMinute } = parseTimeValue(dayHours.open, 10, 0);
    const { hour: closeHour, minute: closeMinute } = parseTimeValue(dayHours.close, 20, 0);
    const closeTotalMinutes = closeHour * 60 + closeMinute;

    let currentHour = startHour;
    let currentMinute = startMinute;

    while ((currentHour * 60 + currentMinute + durationMinutes) <= closeTotalMinutes) {
      const utcDate = toUtcDateFromBusinessLocal(
        year,
        month,
        day,
        currentHour,
        currentMinute
      );

      const now = new Date();
      if (utcDate > now) {
        slots.push({
          startAt: utcDate.toISOString(),
          endAt: new Date(utcDate.getTime() + durationMinutes * 60000).toISOString()
        });
      }

      currentMinute += durationMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  };

  try {
    if (!startDate) return res.status(400).json({ success: false, error: 'startDate required' });

    const businessHours = await loadBusinessHours();
    const slots = generateTimeSlots(startDate, businessHours);
    res.status(200).json({ success: true, availabilities: slots });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate availability' });
  }
}
