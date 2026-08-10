'use client';

import { useServices } from '../../context/ServicesContext';
import ServiceCard from '../../components/ServiceCard';

export default function HeadSpaPage() {
  const { activeServices: services, loading } = useServices();

  if (loading) return <p className="text-center py-10">Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Head Spa Treatments"
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-10 max-w-3xl">
      <p className="eyebrow">Scalp care & relaxation</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-[#423846] sm:text-5xl">
        Head spa treatments
      </h1>
      <p className="mt-4 leading-7 text-stone-600">
        Experience deep scalp relaxation with a rejuvenating head spa that promotes 
        hair health, relieves tension, and enhances overall well-being.
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
