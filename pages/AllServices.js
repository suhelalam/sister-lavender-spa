'use client';

import { useEffect, useState } from 'react';
import ServiceCard from '../components/ServiceCard';
import { CATEGORY_NAMES } from '../constants/categories';

export default function AllServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services');
        const rawText = await res.text();
        const data = JSON.parse(rawText);

        if (data.success) {
          setServices(data.data);
        } else {
          throw new Error(data.error || "API request failed");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-600" />
      </div>
    );

  if (error) return <p className="text-red-500">Error: {error}</p>;

  // Group by category_id
  const servicesByCategory = services.reduce((acc, service) => {
    const catId = service.category_id || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(service);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {Object.entries(servicesByCategory).map(([categoryId, services]) => (
        <div key={categoryId}>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">
            {CATEGORY_NAMES[categoryId] || 'Uncategorized'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
