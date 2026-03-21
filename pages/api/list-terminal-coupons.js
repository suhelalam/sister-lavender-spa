import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const parseProductIdsFromMetadata = (metadata = {}) => {
  const candidates = [
    metadata?.eligible_product_ids,
    metadata?.applicable_product_ids,
    metadata?.applies_to_product_ids,
    metadata?.product_ids,
  ]
    .filter((value) => typeof value === 'string')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(candidates));
};

const getCouponProductRestrictions = (coupon, promotionCodeMetadata = {}) => {
  const appliesToProducts = Array.isArray(coupon?.applies_to?.products)
    ? coupon.applies_to.products.filter(Boolean)
    : [];
  const metadataProducts = parseProductIdsFromMetadata(coupon?.metadata || {});
  const promoMetadataProducts = parseProductIdsFromMetadata(promotionCodeMetadata || {});
  return Array.from(new Set([...appliesToProducts, ...metadataProducts, ...promoMetadataProducts]));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const promotionCodes = await stripe.promotionCodes.list({
      active: true,
      limit: 100,
      expand: ['data.coupon'],
    });

    const promotionCodeCoupons = promotionCodes.data
      .filter((promo) => promo.coupon && typeof promo.coupon !== 'string' && promo.coupon.valid)
      .map((promo) => {
        const coupon = promo.coupon;
        const percentOff = coupon.percent_off || null;
        const amountOff = coupon.amount_off || null;

        const discountLabel = percentOff
          ? `${percentOff}% off`
          : amountOff
            ? `$${(amountOff / 100).toFixed(2)} off`
            : 'Discount';
        const productRestrictions = getCouponProductRestrictions(coupon, promo?.metadata || {});
        const scopeLabel = productRestrictions.length > 0 ? `${productRestrictions.length} service(s)` : 'All services';

        return {
          id: promo.id,
          code: promo.code || coupon.name || promo.id,
          name: coupon.name || '',
          discount_type: percentOff ? 'percent' : 'amount',
          percent_off: percentOff,
          amount_off: amountOff,
          currency: (coupon.currency || 'usd').toUpperCase(),
          label: `${promo.code || coupon.name || promo.id} (${discountLabel} • ${scopeLabel})`,
          applies_to_product_ids: productRestrictions,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const promoCouponIds = new Set(promotionCodeCoupons.map((coupon) => coupon.id));

    const directCoupons = await stripe.coupons.list({
      limit: 100,
    });

    const standaloneCoupons = directCoupons.data
      .filter((coupon) => coupon.valid && !promoCouponIds.has(coupon.id))
      .map((coupon) => {
        const percentOff = coupon.percent_off || null;
        const amountOff = coupon.amount_off || null;
        const discountLabel = percentOff
          ? `${percentOff}% off`
          : amountOff
            ? `$${(amountOff / 100).toFixed(2)} off`
            : 'Discount';
        const productRestrictions = getCouponProductRestrictions(coupon);
        const scopeLabel = productRestrictions.length > 0 ? `${productRestrictions.length} service(s)` : 'All services';

        return {
          id: `coupon_${coupon.id}`,
          code: coupon.name || coupon.id,
          name: coupon.name || '',
          discount_type: percentOff ? 'percent' : 'amount',
          percent_off: percentOff,
          amount_off: amountOff,
          currency: (coupon.currency || 'usd').toUpperCase(),
          label: `${coupon.name || coupon.id} (${discountLabel} • ${scopeLabel})`,
          applies_to_product_ids: productRestrictions,
        };
      });

    const coupons = [...promotionCodeCoupons, ...standaloneCoupons].sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    res.status(200).json({ coupons });
  } catch (error) {
    console.error('Error listing terminal coupons:', error);
    res.status(500).json({ error: error.message });
  }
}
