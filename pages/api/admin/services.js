import Stripe from "stripe";
import { db } from "../../../lib/firebase";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const SERVICES_COLLECTION = "services";

function parseDisplayPriceToCents(price) {
  if (typeof price === "number") {
    return Number.isFinite(price) ? Math.round(price * 100) : 0;
  }
  if (typeof price === "string") {
    const numeric = Number.parseFloat(price.replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
  }
  return 0;
}

function normalizeVariation(serviceId, variation, fallbackIndex) {
  const name = String(variation?.name || `Option ${fallbackIndex + 1}`).trim();
  const id =
    variation?.id ||
    `${serviceId}-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")}`;

  const rawPrice = variation?.price;
  const cents = Number.isFinite(Number(rawPrice))
    ? Math.round(Number(rawPrice))
    : parseDisplayPriceToCents(rawPrice);

  return {
    id,
    name,
    price: Math.max(0, cents),
    currency: String(variation?.currency || "USD").toUpperCase(),
    duration: Number(variation?.duration || 0),
    version: Number(variation?.version || 1),
    stripePriceId: variation?.stripePriceId || null,
  };
}

function normalizeServiceInput(rawService) {
  if (!rawService || typeof rawService !== "object") {
    throw new Error("Missing service payload");
  }

  const id = String(rawService.id || "").trim();
  const name = String(rawService.name || "").trim();

  if (!id) throw new Error("Missing service id");
  if (!name) throw new Error("Missing service name");

  const normalized = {
    id,
    name,
    category: String(rawService.category || "").trim(),
    description: String(rawService.description || "").trim(),
    duration: Number(rawService.duration || 0),
    price: typeof rawService.price === "string" ? rawService.price : `$${Number(rawService.price || 0).toFixed(2)}`,
    image: String(rawService.image || "").trim(),
    stripeProductId: rawService.stripeProductId || null,
    variations: [],
  };

  const incomingVariations = Array.isArray(rawService.variations) ? rawService.variations : [];

  if (incomingVariations.length > 0) {
    normalized.variations = incomingVariations.map((v, index) =>
      normalizeVariation(id, v, index)
    );
  } else {
    normalized.variations = [
      normalizeVariation(id, {
        id: `${id}-standard`,
        name: "Standard",
        price: parseDisplayPriceToCents(normalized.price),
        currency: "USD",
        duration: normalized.duration * 60000,
        version: 1,
      }, 0),
    ];
  }

  return normalized;
}

async function ensureStripeProduct(service, existingService) {
  const existingProductId = existingService?.stripeProductId || service.stripeProductId;

  if (existingProductId) {
    try {
      return await stripe.products.update(existingProductId, {
        name: service.name,
        description: service.description || undefined,
        active: true,
        metadata: {
          service_id: service.id,
          category: service.category || "",
        },
      });
    } catch (error) {
      console.warn("Stripe product update failed, creating a new product:", error.message);
    }
  }

  return stripe.products.create({
    name: service.name,
    description: service.description || undefined,
    metadata: {
      service_id: service.id,
      category: service.category || "",
    },
  });
}

async function syncStripePrices(service, existingService, productId) {
  const previousById = new Map(
    Array.isArray(existingService?.variations)
      ? existingService.variations.map((variation) => [variation.id, variation])
      : []
  );
  const currentVariationIds = new Set(service.variations.map((variation) => variation.id));

  const syncedVariations = [];

  for (const variation of service.variations) {
    const previous = previousById.get(variation.id);
    const sameAmount =
      previous &&
      Number(previous.price) === Number(variation.price) &&
      String(previous.currency || "").toUpperCase() === String(variation.currency || "").toUpperCase();

    if (sameAmount && previous?.stripePriceId) {
      syncedVariations.push({ ...variation, stripePriceId: previous.stripePriceId });
      continue;
    }

    const stripePrice = await stripe.prices.create({
      product: productId,
      unit_amount: Math.max(0, Number(variation.price) || 0),
      currency: String(variation.currency || "USD").toLowerCase(),
      nickname: variation.name,
      metadata: {
        service_id: service.id,
        variation_id: variation.id,
        duration_ms: String(variation.duration || 0),
      },
    });

    if (previous?.stripePriceId && previous.stripePriceId !== stripePrice.id) {
      try {
        await stripe.prices.update(previous.stripePriceId, { active: false });
      } catch (error) {
        console.warn("Failed to archive old Stripe price:", error.message);
      }
    }

    syncedVariations.push({ ...variation, stripePriceId: stripePrice.id });
  }

  if (Array.isArray(existingService?.variations)) {
    for (const previousVariation of existingService.variations) {
      if (!currentVariationIds.has(previousVariation.id) && previousVariation.stripePriceId) {
        try {
          await stripe.prices.update(previousVariation.stripePriceId, { active: false });
        } catch (error) {
          console.warn("Failed to archive removed Stripe price:", error.message);
        }
      }
    }
  }

  return syncedVariations;
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST" || req.method === "PUT") {
      const serviceInput = normalizeServiceInput(req.body?.service);
      const serviceRef = doc(db, SERVICES_COLLECTION, serviceInput.id);
      const existingSnap = await getDoc(serviceRef);
      const existingService = existingSnap.exists() ? existingSnap.data() : null;

      const product = await ensureStripeProduct(serviceInput, existingService);
      const syncedVariations = await syncStripePrices(serviceInput, existingService, product.id);

      const persistedService = {
        ...serviceInput,
        stripeProductId: product.id,
        variations: syncedVariations,
        updatedAt: serverTimestamp(),
      };

      if (!existingSnap.exists()) {
        persistedService.createdAt = serverTimestamp();
      }

      await setDoc(serviceRef, persistedService, { merge: true });

      return res.status(200).json({
        success: true,
        service: {
          ...serviceInput,
          stripeProductId: product.id,
          variations: syncedVariations,
        },
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.body?.id || "").trim();
      if (!id) return res.status(400).json({ success: false, error: "Missing service id" });

      const serviceRef = doc(db, SERVICES_COLLECTION, id);
      const existingSnap = await getDoc(serviceRef);

      if (existingSnap.exists()) {
        const existingService = existingSnap.data();

        if (Array.isArray(existingService?.variations)) {
          for (const variation of existingService.variations) {
            if (variation?.stripePriceId) {
              try {
                await stripe.prices.update(variation.stripePriceId, { active: false });
              } catch (error) {
                console.warn("Failed to archive Stripe price on delete:", error.message);
              }
            }
          }
        }

        if (existingService?.stripeProductId) {
          try {
            await stripe.products.update(existingService.stripeProductId, { active: false });
          } catch (error) {
            console.warn("Failed to archive Stripe product on delete:", error.message);
          }
        }
      }

      await deleteDoc(serviceRef);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Service sync error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
}
