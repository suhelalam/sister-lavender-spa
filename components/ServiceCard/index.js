'use client';

import { useCart } from '../../context/CartContext';
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

  const handleAddToCart = () => {
    if (!selectedVariation) return;

    addItem({
      id: selectedVariation.id,
      name: service.name,
      variationName: selectedVariation.name, // optional: for display in cart
      price: selectedVariation.price,
      currency: selectedVariation.currency,
      quantity: 1,
      duration: selectedVariation.duration, // keep in ms
    });
  };

  return (
    <div className="border p-4 rounded shadow-sm flex flex-col h-full">
      <h2 className="text-xl font-semibold">{service?.name}</h2>

      {selectedVariation?.duration > 0 && (
        <p className="text-sm font-medium text-gray-700 mt-1">
          Duration: {formatDuration(selectedVariation.duration / 60000)}
        </p>
      )}

      <p className="text-gray-600 whitespace-pre-line flex-grow mt-2">{service?.description}</p>

      {service?.variations?.length > 1 ? (
        <select
          className="mt-2 mb-1 p-1 border rounded bg-purple-100 text-purple-800"
          value={selectedVariation?.id}
          onChange={(e) => {
            const variation = service.variations.find(v => v.id === e.target.value);
            setSelectedVariation(variation);
          }}
        >
          {service.variations.map((variation) => (
            <option key={variation.id} value={variation.id}>
              {variation.name} - ${ (variation.price / 100).toFixed(2) }
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-4 mb-1 font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded inline-block">
          {selectedVariation
            ? `$${(selectedVariation.price / 100).toFixed(2)} ${selectedVariation.currency}`
            : 'Price N/A'}
        </p>
      )}

      <div className="mt-auto">
        <button
          onClick={handleAddToCart}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
