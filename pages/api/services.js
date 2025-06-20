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
    // 🔍 Fetch CATEGORY types too
    // const categoryResponse = await client.catalog.list({ types: "CATEGORY" });
    // const categories = categoryResponse.data || [];

    // console.log("🟣 Square Service Categories:");
    // categories.forEach((cat) => {
    //   console.log(`${cat.categoryData?.name || 'Unnamed'}: ${cat.id}`);
    // });
    const formattedItems = (response.data || []).map((item) => {
      // console.log("Raw item: ", item);
      const data = item.itemData || {};
      // console.log(item.itemData.variations?.[0]?.itemVariationData);

       // Extract duration from the first variation (assuming all variations have similar duration)
      // let duration = null;
      // if (data.variations && data.variations.length > 0) {
      //   // service_duration is in milliseconds, convert to minutes
      //   console.log("Inside if");
      //   const ms = data.variations[0].item_variation_data?.service_duration;
      //   if (ms) {
      //     duration = Math.round(ms / 60000); // convert ms to minutes
      //   }
      // }
      // console.log("Got the duration: ", duration);
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
          };
        }),
      };
    });

    // ✅ Safely serialize removing BigInt
    const cleanedItems = JSON.parse(JSON.stringify({ success: true, data: formattedItems }, replacer));
    // console.log(cleanedItems);

    res.status(200).json(cleanedItems);
    
  } catch (error) {
    console.error("Error listing catalog:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
