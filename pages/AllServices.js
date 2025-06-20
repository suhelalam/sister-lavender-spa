'use client';
import { useEffect, useState } from 'react';
import ServiceCard from '../components/ServiceCard';

export default function AllServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  async function fetchServices() {
    try {
      const res = await fetch('/api/services');
      const rawText = await res.text(); // Get raw response text
      console.log("Raw API response:", rawText);

      let data;
      try {
        data = JSON.parse(rawText); // Manually parse JSON
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Invalid JSON response");
      }

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

  // Log before rendering
  // console.log('Rendering services:', services);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>

  );
}
