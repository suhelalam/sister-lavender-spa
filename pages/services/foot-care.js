'use client';

import { useServices } from '../../context/ServicesContext';
import ServiceCard from '../../components/ServiceCard';

export default function FootCarePage() {
  const { activeServices: services, loading } = useServices();

  if (loading) return <p className="text-center py-10">Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Foot Care" // Note: matches the data structure
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10 max-w-3xl">
      <p className="eyebrow">Care from heel to toe</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-[#423846] sm:text-5xl">
        Pedicure & foot care
      </h1>
      <p className="mt-4 leading-7 text-stone-600">
        Pamper your feet with expert care—callus removal, exfoliation, 
        and deep hydration for comfort, softness, and refreshed soles.
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
    </div>
  );
}
