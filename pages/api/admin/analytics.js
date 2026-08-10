import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../../lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const IGNORED_SERVICE_NAMES = new Set([
  'processing fee (3%)',
  'custom amount',
  'custom add-on',
]);

const parseServicesFromMetadata = (metadataServices) => {
  if (!metadataServices || typeof metadataServices !== 'string') return [];

  return metadataServices
    .split(',')
    .map((segment) => segment.trim())
    .map((segment) => {
      const match = segment.match(/^(\d+)\s*x\s+(.+)$/i);
      if (!match) return null;
      const quantity = Math.max(1, Number(match[1] || 1));
      const name = String(match[2] || '').trim();
      if (!name || IGNORED_SERVICE_NAMES.has(name.toLowerCase())) return null;
      return { name, quantity };
    })
    .filter(Boolean);
};

const normalizeServiceName = (value = '') => String(value)
  .toLowerCase()
  .replace(/[\u3400-\u9fff]/g, '')
  .replace(/\b(?:standard|\d{1,3}\s*(?:min|minute)s?)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [paymentIntentsResponse, bookingsSnapshot] = await Promise.all([
      stripe.paymentIntents.list({ limit: 100 }).catch((error) => {
        console.error('Stripe analytics unavailable:', error);
        return { data: [] };
      }),
      isAdminConfigured && adminDb
        ? adminDb.collection('bookingAnalytics').limit(2000).get()
        : Promise.resolve(null),
    ]);

    const successfulIntents = (paymentIntentsResponse.data || []).filter((pi) =>
      ['succeeded', 'requires_capture'].includes(pi.status)
    );

    const serviceCountMap = new Map();
    successfulIntents.forEach((paymentIntent) => {
      const parsedServices = parseServicesFromMetadata(paymentIntent?.metadata?.services);
      parsedServices.forEach((service) => {
        serviceCountMap.set(service.name, (serviceCountMap.get(service.name) || 0) + service.quantity);
      });
    });

    const topServices = Array.from(serviceCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bookingCountMap = new Map();
    (bookingsSnapshot?.docs || []).forEach((doc) => {
      const booking = doc.data();
      (Array.isArray(booking.services) ? booking.services : []).forEach((service) => {
        const name = String(service?.serviceName || service?.name || '').trim();
        if (!name || IGNORED_SERVICE_NAMES.has(name.toLowerCase())) return;
        bookingCountMap.set(name, (bookingCountMap.get(name) || 0) + Math.max(1, Number(service?.quantity || 1)));
      });
    });
    const topBookedServices = Array.from(bookingCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const combined = new Map();
    [...topBookedServices, ...topServices].forEach((service) => {
      const key = normalizeServiceName(service.name);
      if (!key) return;
      const previous = combined.get(key) || { name: service.name, count: 0 };
      combined.set(key, { name: previous.name, count: previous.count + service.count });
    });
    const bestSellers = Array.from(combined.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    return res.status(200).json({
      success: true,
      topServices,
      topBookedServices,
      bestSellers,
      sources: {
        paymentIntentsScanned: successfulIntents.length,
        bookingsAnalyzed: bookingsSnapshot?.size || 0,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
