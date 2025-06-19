'use client';
import { useEffect, useState } from 'react';

export default function AllServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  async function fetchServices() {
    try {
      const res = await fetch('/api/test-client');
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
  console.log('Rendering services:', services);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Our Services</h1>
      <ul className="space-y-4">
        {services.map(({ id, name, description, variations }) => (
          <li key={id} className="border p-4 rounded shadow-sm">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-gray-600 whitespace-pre-line">{description}</p>
            <p className="mt-2 font-semibold">
              {variations?.[0]
                ? `$${(variations[0].price / 100).toFixed(2)} ${variations[0].currency}`
                : 'Price N/A'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
