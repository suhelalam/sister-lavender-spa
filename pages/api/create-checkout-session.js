import { SquareClient } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items } = req.body;
    items.forEach(item => {
    // console.log('Price:', item.price, 'Price * 100:', item.price * 100);
    });
    const totalAmount = items.reduce((total, item) => {
  // Assume item.price is already in cents, just multiply by quantity
        return total + BigInt(item.price) * BigInt(item.quantity);
    }, BigInt(0));

    if (!process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID) {
      throw new Error("Missing SQUARE_LOCATION_ID in environment variables");
    }

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      quickPay: {
        name: "Sister Lavender Spa Order",
        priceMoney: {
          amount: totalAmount,
          currency: "USD",
        },
        locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      },
    });

    // console.log("🔍 Full Square API Response:", {
    //     keys: Object.keys(response),
    //     result: response.result,
    // });

    // ✅ Safely access the paymentLink
    const link = response?.paymentLink?.url;
    // console.log(link)

    if (!link) {
      throw new Error("No payment link returned from Square");
    }

    res.status(200).json({ url: link });
  } catch (error) {
    console.error("Square checkout session error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
