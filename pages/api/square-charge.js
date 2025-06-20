import { Client, Environment } from 'square';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Sandbox,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, items } = req.body;

  const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const response = await client.paymentsApi.createPayment({
      sourceId: token,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: amount, // in cents
        currency: 'USD',
      },
    });

    res.status(200).json({ success: true, result: response.result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
