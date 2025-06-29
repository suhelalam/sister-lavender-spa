import { SquareClient } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
});

// Helper: Replace BigInt with Number
function replacer(key, value) {
  return typeof value === "bigint" ? Number(value) : value;
}

export default async function handler(req, res) {
  try {
    const response = await client.catalog.list({ types: "ITEM" });
    const formattedItems = (response.data || []).map((item) => {
      // console.log("Raw item: ", item);
      const data = item.itemData || {};
      return {
        id: item.id,
        name: data.name || "Unnamed",
        description: data.description || "",
        category_id: (data.categories && data.categories.length > 0) ? data.categories[0].id : null,
        // duration,
        variations: (data.variations || []).map((v) => {
          const variationData = v.itemVariationData || {};
          return {
            id: v.id,
            name: variationData.name || "",
            price: variationData.priceMoney?.amount || 0,
            currency: variationData.priceMoney?.currency || "USD",
            duration: variationData.serviceDuration || 0,
            version: v.version || null,
          };
        }),
      };
    });

    // ✅ Safely serialize removing BigInt
    const cleanedItems = JSON.parse(JSON.stringify({ success: true, data: formattedItems }, replacer));
    // console.log(formattedItems[0]);

    res.status(200).json(cleanedItems);
    
  } catch (error) {
    console.error("Error listing catalog:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
