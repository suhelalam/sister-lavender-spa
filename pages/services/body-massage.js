'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useServices } from '../../context/ServicesContext';
import { useCart } from '../../context/CartContext';
import ServiceCard from '../../components/ServiceCard';

export default function BodyMassagePage() {
  const { activeServices: services, loading } = useServices();
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (loading || !router.isReady) return;

    const raw = router.query.services || router.query.service;
    if (!raw) return;

    const ids = (Array.isArray(raw) ? raw : [raw])
      .flatMap((value) => String(value).split(',').map((part) => part.trim()))
      .filter(Boolean);

    const slugify = (value = '') =>
      String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    ids.forEach((id) => {
      const match = services.find(
        (service) =>
          service.id === id ||
          slugify(service.name) === id ||
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
  }, [addItem, loading, router, router.isReady, services]);

  if (loading) return <p className="text-center py-10">Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Body Massage Treatments"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">
        Body Massage Treatments
      </h1>
      <p className="text-gray-600 mb-8">
        Release tension and restore vitality with personalized body massages 
        designed to relax muscles, improve circulation, and boost overall wellness.
      </p>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No services found in this category.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}