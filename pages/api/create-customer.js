// pages/api/create-customer.js
import { SquareClient } from 'square';

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { givenName, familyName, emailAddress, phoneNumber } = req.body;

  try {
    const response = await client.customers.create({
      givenName,
      familyName,
      emailAddress,
      phoneNumber,
    });

    res.status(200).json({ success: true, customer: response.result.customer });
  } catch (error) {
    console.error('Customer Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
