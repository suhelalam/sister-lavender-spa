'use client';

import { useCart } from '../../context/CartContext';
import { useState } from 'react';
import Image from 'next/image';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function parsePrice(price) {
  if (typeof price === 'number') {
    return price;
  }
  if (typeof price === 'string') {
    const numericValue = parseFloat(price.replace(/[^\d.]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  }
  return 0;
}

export default function ServiceCard({ service, image = '', variant = 'default' }) {
  const { addItem } = useCart();

  // Check if service has variations or needs to use basic fields
  const hasVariations = service?.variations && service.variations.length > 0;
  
  // If no variations, create a single variation from basic fields
  const defaultVariation = hasVariations 
    ? service.variations[0]
    : {
        id: service.name,
        name: 'Standard',
        price: parsePrice(service.price) * 100,
        duration: (typeof service.duration === 'string' 
          ? parseInt(service.duration) 
          : service.duration) * 60000,
        currency: 'USD'
      };

  const [selectedVariation, setSelectedVariation] = useState(defaultVariation);
  const [showDetails, setShowDetails] = useState(false);

  const handleAddToCart = () => {
    if (!selectedVariation) return;

    addItem({
      id: selectedVariation.id,
      name: service.name,
      variationName: selectedVariation.name,
      price: selectedVariation.price,
      currency: selectedVariation.currency || 'USD',
      quantity: 1,
      duration: selectedVariation.duration,
      version: selectedVariation.version || 1,
    });
  };

  if (variant === 'slim') {
    return (
      <div className="border rounded-md px-3 py-2 bg-white">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">{service?.name}</h2>

        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-700">
          <p>
            {selectedVariation?.duration > 0
              ? `Duration: ${formatDuration(selectedVariation.duration / 60000)}`
              : ''}
          </p>
          <p className="font-semibold text-purple-800 whitespace-nowrap text-right">
            ${(selectedVariation.price / 100).toFixed(2)} {selectedVariation.currency || 'USD'}
          </p>
        </div>

        {hasVariations && service.variations.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {service.variations.map((variation) => {
              const isSelected = selectedVariation?.id === variation.id;
              return (
                <button
                  key={variation.id}
                  type="button"
                  onClick={() => setSelectedVariation(variation)}
                  aria-pressed={isSelected}
                  className={`rounded border px-2 py-1 text-xs transition ${
                    isSelected
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-purple-200 bg-white text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  {variation.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-1 text-xs font-medium text-purple-700 hover:text-purple-900"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>

        {showDetails ? (
          <p className="text-xs text-gray-600 whitespace-pre-line mt-1">
            {service?.desc || service?.description || 'No description available'}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-2 w-full bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition"
        >
          Add to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="border p-4 rounded shadow-sm flex flex-col h-full">
      {image ? (
        <div className="relative w-full h-44 mb-4 rounded overflow-hidden">
          <Image
            src={image}
            alt={service?.name || 'Service image'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <h2 className="text-xl font-semibold">{service?.name}</h2>

      {selectedVariation?.duration > 0 && (
        <p className="text-sm font-medium text-gray-700 mt-1">
          Duration: {formatDuration(selectedVariation.duration / 60000)}
        </p>
      )}

      <p className="text-gray-600 whitespace-pre-line flex-grow mt-2">
        {service?.desc || service?.description || 'No description available'}
      </p>

      {hasVariations && service.variations.length > 1 ? (
        <div className="mt-3 mb-2 flex flex-wrap gap-2">
          {service.variations.map((variation) => {
            const isSelected = selectedVariation?.id === variation.id;
            return (
              <button
                key={variation.id}
                type="button"
                onClick={() => setSelectedVariation(variation)}
                aria-pressed={isSelected}
                className={`rounded border px-3 py-1 text-sm transition ${
                  isSelected
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-purple-200 bg-white text-purple-700 hover:bg-purple-100'
                }`}
              >
                {variation.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 mb-1 font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded inline-block">
          ${(selectedVariation.price / 100).toFixed(2)} {selectedVariation.currency || 'USD'}
        </p>
      )}

      {hasVariations && service.variations.length > 1 ? (
        <p className="mb-1 font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded inline-block">
          ${(selectedVariation.price / 100).toFixed(2)} {selectedVariation.currency || 'USD'}
        </p>
      ) : null}

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
