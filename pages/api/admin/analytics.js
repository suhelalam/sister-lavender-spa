import Stripe from 'stripe';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const paymentIntentsResponse = await stripe.paymentIntents.list({ limit: 100 });

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

    return res.status(200).json({
      success: true,
      topServices,
      sources: {
        paymentIntentsScanned: successfulIntents.length,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
