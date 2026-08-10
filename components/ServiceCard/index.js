'use client';

import { useCart } from '../../context/CartContext';
import { useState } from 'react';
import Image from 'next/image';
import { Check, Clock, Plus } from 'lucide-react';

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
  const categoryImage = {
    'Head Spa Treatments': '/images/head.jpg',
    'Body Massage Treatments': '/images/bodyMassage.jpg',
    'Foot Care': '/images/footCare.jpg',
    'Manicure Services': '/images/manicure.jpg',
    'Side-by-Side Services': '/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 34456.jpg',
  }[service?.category];
  const cardImage = image || service?.image || categoryImage;

  const handleAddToCart = () => {
    if (!selectedVariation) return;

    addItem({
      id: selectedVariation.id,
      serviceId: service.id || service.name,
      name: service.name,
      variationName: selectedVariation.name,
      price: selectedVariation.price,
      currency: selectedVariation.currency || 'USD',
      quantity: 1,
      duration: selectedVariation.duration,
      version: selectedVariation.version || 1,
      category: service.category || '',
      isAddOn: false,
    });

  };

  if (variant === 'slim') {
    return (
      <article className="rounded-xl border border-[#e3d9e5] bg-white p-4 shadow-sm transition hover:border-[#bdaac3] hover:shadow-md">
        <h3 className="font-display text-lg leading-snug text-[#423846]">{service?.name}</h3>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-stone-600">
          <p className="flex items-center gap-1.5"><Clock size={13}/>
            {selectedVariation?.duration > 0
              ? `Duration: ${formatDuration(selectedVariation.duration / 60000)}`
              : ''}
          </p>
          <p className="whitespace-nowrap rounded-full bg-[#f1eaf3] px-3 py-1 font-bold text-[#66516f]">
            ${(selectedVariation.price / 100).toFixed(2)}
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
                      ? 'border-[#66516f] bg-[#66516f] text-white'
                      : 'border-[#d9cddd] bg-[#faf7fb] text-[#66516f] hover:bg-[#eee7f0]'
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
          className="mt-3 text-xs font-bold text-[#66516f] underline decoration-[#cdbed1] underline-offset-4"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>

        {showDetails ? (
          <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600">
            {service?.desc || service?.description || 'No description available'}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-[#66516f] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#4d3b55]"
        >
          <Plus size={15}/> Add to appointment
        </button>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#e3dad1] bg-white shadow-[0_10px_32px_rgba(65,49,43,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(65,49,43,0.14)]">
      {cardImage ? (
        <div className="relative h-52 w-full overflow-hidden">
          <Image
            src={cardImage}
            alt={`${service?.name || 'Spa service'} at Sister Lavender Spa`}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
      {service?.category&&<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b7493]">{service.category}</p>}
      <h3 className="mt-2 font-display text-2xl leading-tight text-[#423846]">{service?.name}</h3>

      {selectedVariation?.duration > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-stone-600">
          <Clock size={16} className="text-[#806b88]"/> {formatDuration(selectedVariation.duration / 60000)}
        </p>
      )}

      <p className="mt-4 flex-grow whitespace-pre-line text-sm leading-6 text-stone-600">
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
                    ? 'border-[#66516f] bg-[#66516f] text-white shadow-sm'
                    : 'border-[#d9cddd] bg-[#faf7fb] text-[#66516f] hover:bg-[#eee7f0]'
                }`}
              >
                {variation.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 w-fit rounded-full bg-[#f1eaf3] px-4 py-2 font-bold text-[#594660]">
          ${(selectedVariation.price / 100).toFixed(2)}
        </p>
      )}

      {hasVariations && service.variations.length > 1 ? (
        <p className="mt-3 w-fit rounded-full bg-[#f1eaf3] px-4 py-2 font-bold text-[#594660]">
          ${(selectedVariation.price / 100).toFixed(2)}
        </p>
      ) : null}

      <div className="mt-5">
        <button
          onClick={handleAddToCart}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#66516f] px-5 font-bold text-white shadow-[0_8px_20px_rgba(77,59,85,0.2)] transition hover:bg-[#4d3b55]"
        >
          <Check size={17}/> Add to appointment
        </button>
      </div>
      </div>
    </article>
  );
}
