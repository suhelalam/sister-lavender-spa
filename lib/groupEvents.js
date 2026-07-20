import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { fromZonedTime } from 'date-fns-tz';

export const hashGroupEventToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const createGroupEventToken = () => crypto.randomBytes(32).toString('hex');

export function getSiteUrl(req) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
  return host ? `${protocol}://${host}` : 'http://localhost:3000';
}

export function getGroupEventTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function displayEventDate(date, time) {
  const parsed = fromZonedTime(`${date}T${time}:00`, 'America/Chicago');
  if (Number.isNaN(parsed.getTime())) return `${date} at ${time}`;
  return parsed.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
  });
}
