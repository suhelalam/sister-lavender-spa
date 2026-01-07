'use client';

import { useServices } from '../../context/ServicesContext';
import ServiceCard from '../../components/ServiceCard';

export default function BodyMassagePage() {
  const { services, loading } = useServices();

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