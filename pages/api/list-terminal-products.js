import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      type: 'one_time',
      expand: ['data.product'],
    });

    const inferCategoryFromName = (name = '') => {
      const clean = String(name).trim();
      if (!clean) return 'Other Services';
      if (clean.includes(' - ')) return clean.split(' - ')[0].trim();
      if (clean.includes(':')) return clean.split(':')[0].trim();
      if (clean.includes('(')) return clean.split('(')[0].trim();
      return 'Other Services';
    };

    const items = prices.data
      .filter((price) => price.unit_amount && price.product && typeof price.product !== 'string')
      .map((price) => {
        const product = price.product;
        const amount = price.unit_amount || 0;
        const currency = (price.currency || 'usd').toUpperCase();
        const amountDisplay = (amount / 100).toFixed(2);
        const optionName = price.nickname ? `${product.name} (${price.nickname})` : product.name;
        const isAddOn = String(product.metadata?.is_add_on || '').toLowerCase() === 'true';
        const appliesToCategory = String(product.metadata?.applies_to_category || '').trim();
        const productCategory =
          String(product.metadata?.category || product.metadata?.service_category || '').trim() ||
          inferCategoryFromName(product.name);

        // Keep add-ons inside their main service category for easier terminal navigation.
        const category =
          isAddOn && appliesToCategory
            ? appliesToCategory
            : productCategory;

        return {
          id: `${product.id}:${price.id}`,
          product_id: product.id,
          price_id: price.id,
          name: product.name,
          category,
          is_add_on: isAddOn,
          description: product.description || '',
          label: `${optionName} — $${amountDisplay}`,
          amount,
          currency,
        };
      })
      .sort((a, b) => {
        const byCategory = String(a.category || '').localeCompare(String(b.category || ''));
        if (byCategory !== 0) return byCategory;
        const byAddOn = Number(a.is_add_on) - Number(b.is_add_on);
        if (byAddOn !== 0) return byAddOn;
        return a.name.localeCompare(b.name) || a.amount - b.amount;
      });

    res.status(200).json({ items });
  } catch (error) {
    console.error('Error listing terminal products:', error);
    res.status(500).json({ error: error.message });
  }
}
