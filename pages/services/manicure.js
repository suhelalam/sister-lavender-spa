'use client';

import { useServices } from '../../context/ServicesContext';
import ServiceCard from '../../components/ServiceCard';

export default function ManicurePage() {
  const { activeServices: services, loading } = useServices();

  if (loading) return <p className="text-center py-10">Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Manicure Services" // Fixed: changed from "Manicure Care"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10 max-w-3xl">
      <p className="eyebrow">Polished & precise</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-[#423846] sm:text-5xl">
        Manicure services
      </h1>
      <p className="mt-4 leading-7 text-stone-600">
        Achieve elegant, healthy hands with precision nail shaping, 
        cuticle care, and long-lasting polish in a relaxing, hygienic setting.
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
