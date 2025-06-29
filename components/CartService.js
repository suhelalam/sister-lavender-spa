'use client';

import { useCart } from '../context/CartContext';
import { useState } from 'react';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export default function ServiceCard({ service }) {
  const { addItem } = useCart();
  const [selectedVariation, setSelectedVariation] = useState(service?.variations?.[0] || null);

  const handleClick = () => {
    if (!selectedVariation) return;

    addItem({
      id: selectedVariation.id,
      name: service.name,
      variationName: selectedVariation.name,
      price: selectedVariation.price,
      currency: selectedVariation.currency,
      version: selectedVariation.version,
      quantity: 1,
    });
  };

  return (
    <div
      onClick={handleClick}
      className="border p-3 rounded shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-all bg-white hover:bg-purple-50"
    >
      <div className="flex flex-col">
        <h2 className="text-md font-semibold text-gray-800">{service?.name}</h2>

        {selectedVariation?.duration > 0 && (
          <span className="text-sm text-gray-600">
            {formatDuration(selectedVariation.duration / 60000)}
          </span>
        )}

        {service?.variations?.length > 1 && (
          <select
            className="mt-1 text-sm p-1 border rounded bg-purple-100 text-purple-800 max-w-xs"
            value={selectedVariation?.id}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const variation = service.variations.find(v => v.id === e.target.value);
              setSelectedVariation(variation);
            }}
          >
            {service.variations.map((variation) => (
              <option key={variation.id} value={variation.id}>
                {variation.name} - ${(variation.price / 100).toFixed(2)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="text-right">
        <p className="text-purple-700 font-bold text-md">
          ${selectedVariation ? (selectedVariation.price / 100).toFixed(2) : '—'}
        </p>
      </div>
    </div>
  );
}
