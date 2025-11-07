'use client';

import AppointmentSummary from '../components/AppointmentSummary';
import { useServices } from '../context/ServicesContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function BookingPage() {
  const { services, loading } = useServices();
  const { addItem } = useCart();
  const [selectedService, setSelectedService] = useState(null);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4 text-purple-700">Choose Services</h1>
        <p className="text-gray-500">Loading services...</p>
      </div>
    );
  }

  const handleServiceClick = (service) => {
    setSelectedService(service);
    
    // For services with variations, we'll let the user select from dropdown in a modal or detailed view
    // For now, just add the first variation or create one from basic fields
    if (service.variations && service.variations.length > 0) {
      const variation = service.variations[0];
      addItem({
        id: variation.id,
        name: service.name,
        variationName: variation.name,
        price: variation.price,
        currency: variation.currency || 'USD',
        quantity: 1,
        duration: variation.duration,
        version: variation.version || 1,
      });
    } else {
      // Create a variation from basic fields
      const variation = {
        id: service.name,
        name: 'Standard',
        price: parseFloat(service.price.replace(/[^\d.]/g, '')) * 100,
        currency: 'USD',
        duration: (typeof service.duration === 'string' 
          ? parseInt(service.duration) 
          : service.duration) * 60000,
        version: 1
      };
      addItem({
        id: variation.id,
        name: service.name,
        variationName: variation.name,
        price: variation.price,
        currency: variation.currency,
        quantity: 1,
        duration: variation.duration,
        version: variation.version,
      });
    }
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}min`;
    if (h) return `${h}h`;
    return `${m}min`;
  };

  const parsePrice = (price) => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const numericValue = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    }
    return 0;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-purple-700">Choose Services</h1>

      {/* Layout: Summary on top (mobile), right (desktop) */}
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        {/* LEFT: Service List */}
        <div className="flex-1 space-y-4">
          {services.length > 0 ? (
            services.map((service, index) => {
              // Get the first variation or create from basic fields
              const variation = service.variations && service.variations.length > 0
                ? service.variations[0]
                : {
                    duration: (typeof service.duration === 'string' 
                      ? parseInt(service.duration) 
                      : service.duration) * 60000,
                    price: parsePrice(service.price) * 100
                  };

              return (
                <div
                  key={index}
                  onClick={() => handleServiceClick(service)}
                  className="cursor-pointer border rounded p-4 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="font-semibold text-lg text-gray-800">{service.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Duration: {formatDuration(variation.duration / 60000)}
                  </div>
                  <div className="text-sm text-purple-800 font-semibold mt-1">
                    ${(variation.price / 100).toFixed(2)}
                  </div>
                  {service.variations && service.variations.length > 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Multiple options available
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No services available.</p>
          )}
        </div>

        {/* RIGHT: Appointment Summary */}
        <div className="w-full lg:w-96">
          <AppointmentSummary selectedSlot={null} />
        </div>
      </div>
    </div>
  );
}