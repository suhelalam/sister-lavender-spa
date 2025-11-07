import { google } from "googleapis";
import { getToken } from "next-auth/jwt";

export default async function handler(req, res) {
  const token = await getToken({ req });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const calendar = google.calendar({ version: "v3" });
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      timeMax: tomorrow,
      singleEvents: true,
      orderBy: "startTime",
      auth: token.accessToken,
    });
    res.status(200).json(response.data.items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
}
