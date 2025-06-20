'use client';

import { useCart } from '../../context/CartContext';

export default function ServiceCard({ service }) {
  const { addItem } = useCart(); // ✅ Correct context function

  const firstVariation = service?.variations?.[0];

  const handleAddToCart = () => {
    if (firstVariation) {
      addItem({
        id: firstVariation.id,
        name: service.name,
        price: firstVariation.price,
        currency: firstVariation.currency,
        quantity: 1,
      });
    }
  };

  return (
    <div className="border p-4 rounded shadow-sm">
      <h2 className="text-xl font-semibold">{service?.name}</h2>
      <p className="text-gray-600 whitespace-pre-line">{service?.description}</p>
      <p className="mt-2 font-semibold">
        {firstVariation
          ? `$${(firstVariation.price / 100).toFixed(2)} ${firstVariation.currency}`
          : 'Price N/A'}
      </p>

      <button
        onClick={handleAddToCart}
        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        Add to Cart
      </button>
    </div>
  );
}
