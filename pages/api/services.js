// pages/api/services.js

import { SquareClient, SquareEnvironment } from 'square';


const client = new SquareClient({
  environment: SquareEnvironment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
    console.log('Using Square Token:', process.env.SQUARE_ACCESS_TOKEN); // Debug only
  try {
    const response = await client.catalog.list({ types: 'ITEM' });

    const services = response.result.objects
      ?.filter(obj => obj.itemData)
      .map(item => ({
        id: item.id,
        name: item.itemData.name,
        description: item.itemData.description || '',
        price:
          item.itemData.variations?.[0]?.itemVariationData?.priceMoney?.amount /
            100 || 0,
      }));

    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching from Square:', error);
    res.status(500).json({ error: 'Failed to fetch services from Square' });
  }
}
