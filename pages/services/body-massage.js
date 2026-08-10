'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useServices } from '../../context/ServicesContext';
import { useCart } from '../../context/CartContext';
import ServiceCard from '../../components/ServiceCard';
import { normalizeServiceIds, slugifyServiceValue } from '../../lib/serviceShareLinks';

export default function BodyMassagePage() {
  const { activeServices: services, loading } = useServices();
  const { addItem, clearCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (loading || !router.isReady) return;

    const ids = normalizeServiceIds(router.query.services || router.query.service || '');
    if (ids.length === 0) return;

    clearCart();

    ids.forEach((id) => {
      const match = services.find(
        (service) =>
          service.id === id ||
          slugifyServiceValue(service.name) === id ||
          String(service.name).toLowerCase() === id.toLowerCase()
      );

      if (!match) return;

      const variation = Array.isArray(match.variations) && match.variations.length > 0
        ? match.variations[0]
        : {
            id: match.name,
            name: 'Standard',
            price: Number.parseFloat(String(match.price || '0').replace(/[^\d.]/g, '')) * 100,
            duration: (typeof match.duration === 'string' ? Number.parseInt(match.duration, 10) : Number(match.duration || 0)) * 60000,
            currency: 'USD',
            version: 1,
          };

      addItem({
        id: variation.id,
        serviceId: match.id || match.name,
        name: match.name,
        variationName: variation.name,
        price: Number(variation.price || 0),
        currency: variation.currency || 'USD',
        quantity: 1,
        duration: Number(variation.duration || 0),
        version: variation.version || 1,
        category: match.category || '',
        isAddOn: false,
      });
    });
  }, [addItem, clearCart, loading, router, router.isReady, services]);

  if (loading) return <p className="text-center py-10">Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Body Massage Treatments"
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-10 max-w-3xl">
      <p className="eyebrow">Rest & recovery</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-[#423846] sm:text-5xl">
        Body massage treatments
      </h1>
      <p className="mt-4 leading-7 text-stone-600">
        Release tension and restore vitality with personalized body massages 
        designed to relax muscles, improve circulation, and boost overall wellness.
      </p>
      </header>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No services found in this category.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </main>
  );
}
