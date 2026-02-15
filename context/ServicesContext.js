'use client';

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { allServices } from "../lib/servicesData";

const ServicesContext = createContext();
const SERVICES_COLLECTION = "services";

const normalizePrice = (price) => {
  if (typeof price === "string") return price;
  const parsed = Number(price || 0);
  return `$${parsed.toFixed(2)}`;
};

const normalizeService = (service) => ({
  id: service.id,
  name: service.name || "",
  category: service.category || "",
  description: service.description || "",
  duration: Number(service.duration || 0),
  price: normalizePrice(service.price),
  image: service.image || "",
  variations: Array.isArray(service.variations) ? service.variations : [],
  isAddOn: Boolean(service.isAddOn),
  appliesToCategory: service.appliesToCategory || "",
});

const sortServices = (items) =>
  [...items].sort((a, b) => {
    if (Boolean(a.isAddOn) !== Boolean(b.isAddOn)) {
      return a.isAddOn ? 1 : -1;
    }

    const categoryCompare = (a.category || "").localeCompare(b.category || "");
    if (categoryCompare !== 0) return categoryCompare;
    return (a.name || "").localeCompare(b.name || "");
  });

const saveBackup = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("spaServicesBackup", JSON.stringify(items));
};

const getBackupServices = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("spaServicesBackup");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseApiError = async (response, fallbackMessage) => {
  try {
    const json = await response.json();
    if (json?.error) return json.error;
  } catch {
    // ignore non-JSON error bodies
  }
  return fallbackMessage;
};

const upsertServiceViaApi = async (service, method = "POST") => {
  const response = await fetch("/api/admin/services", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service }),
  });

  if (!response.ok) {
    const message = await parseApiError(response, "Failed to save service");
    throw new Error(message);
  }

  const result = await response.json();
  return result.service;
};

const deleteServiceViaApi = async (id) => {
  const response = await fetch("/api/admin/services", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const message = await parseApiError(response, "Failed to delete service");
    throw new Error(message);
  }
};

const buildUniqueServiceId = (name, existingServices) => {
  const baseId = (name || "service")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

  const fallbackBase = baseId || "service";
  let id = baseId || `service-${Date.now()}`;
  let counter = 1;
  const existingIds = new Set(existingServices.map((s) => s.id));
  while (existingIds.has(id)) {
    id = `${fallbackBase}-${counter}`;
    counter++;
  }

  return id;
};

const toDisplayPrice = (cents) => `$${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;

const buildAddOnServicePayload = (addOnInput, existingService) => {
  const durationMs = Number(addOnInput.duration || 0);
  const priceCents = Math.max(0, Number(addOnInput.price) || 0);
  const variationId = existingService?.variations?.[0]?.id || `${addOnInput.id}-standard`;
  const variationVersion = existingService?.variations?.[0]?.version || 1;

  return {
    id: addOnInput.id,
    name: addOnInput.name || "",
    category: "Add-ons",
    appliesToCategory: addOnInput.category || existingService?.appliesToCategory || "",
    description: addOnInput.description || "",
    duration: Math.round(durationMs / 60000),
    price: toDisplayPrice(priceCents),
    image: "",
    isAddOn: true,
    variations: [
      {
        id: variationId,
        name: "Standard",
        price: priceCents,
        currency: "USD",
        duration: durationMs,
        version: variationVersion,
      },
    ],
  };
};

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));
        const firestoreServices = snapshot.docs.map((serviceDoc) =>
          normalizeService({ id: serviceDoc.id, ...serviceDoc.data() })
        );
        const sortedServices = sortServices(firestoreServices);

        if (!isMounted) return;
        setServices(sortedServices);
        saveBackup(sortedServices);
      } catch (error) {
        console.error("Failed to load services from Firestore:", error);
        if (!isMounted) return;
        const backup = getBackupServices();
        if (backup.length > 0) {
          setServices(sortServices(backup.map(normalizeService)));
        } else {
          setServices(sortServices((allServices || []).map(normalizeService)));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  const addService = async (newService) => {
    const id = newService.id || buildUniqueServiceId(newService.name, services);
    const serviceToSave = normalizeService({ ...newService, id });
    const savedService = normalizeService(await upsertServiceViaApi(serviceToSave, "POST"));

    setServices((prev) => {
      const updated = sortServices([...prev, savedService]);
      saveBackup(updated);
      return updated;
    });
  };

  const updateService = async (id, updatedData) => {
    const serviceToSave = normalizeService({ ...updatedData, id });
    const savedService = normalizeService(await upsertServiceViaApi(serviceToSave, "PUT"));

    setServices((prev) => {
      const updated = sortServices(
        prev.map((service) => (service.id === id ? savedService : service))
      );
      saveBackup(updated);
      return updated;
    });
  };

  const deleteService = async (id) => {
    await deleteServiceViaApi(id);

    setServices((prev) => {
      const updated = prev.filter((service) => service.id !== id);
      saveBackup(updated);
      return updated;
    });
  };

  const addAddOn = async (newAddOn) => {
    const id = newAddOn.id || buildUniqueServiceId(newAddOn.name, services);
    await addService(buildAddOnServicePayload({ ...newAddOn, id }));
  };

  const updateAddOn = async (id, updatedData) => {
    const existingService = services.find((service) => service.id === id && service.isAddOn);
    await updateService(id, buildAddOnServicePayload({ ...updatedData, id }, existingService));
  };

  const deleteAddOn = async (id) => {
    await deleteService(id);
  };

  const addVariation = async (serviceId, variation) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const newVariation = {
      ...variation,
      id: variation.id || `${serviceId}-${variation.name.toLowerCase().replace(/\s+/g, "-")}`,
      version: variation.version || 1,
    };

    const updatedService = {
      ...service,
      variations: [...(service.variations || []), newVariation],
    };

    await updateService(serviceId, updatedService);
  };

  const updateVariation = async (serviceId, variationId, updatedData) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !service.variations) return;

    const updatedService = {
      ...service,
      variations: service.variations.map((variation) =>
        variation.id === variationId ? { ...variation, ...updatedData } : variation
      ),
    };

    await updateService(serviceId, updatedService);
  };

  const deleteVariation = async (serviceId, variationId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !service.variations) return;

    const filteredVariations = service.variations.filter((variation) => variation.id !== variationId);
    const updatedService = {
      ...service,
      variations: filteredVariations,
    };

    await updateService(serviceId, updatedService);
  };

  const addOns = useMemo(
    () => services.filter((service) => service.isAddOn),
    [services]
  );

  return (
    <ServicesContext.Provider
      value={{
        services,
        addOns,
        loading,
        addService,
        updateService,
        deleteService,
        addAddOn,
        updateAddOn,
        deleteAddOn,
        addVariation,
        updateVariation,
        deleteVariation,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);
