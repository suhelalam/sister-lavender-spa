'use client';

import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function Checkout() {
  const { items } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    if (!items.length) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.price ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-white">
      <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Checkout</h1>

      {items.length === 0 ? (
        <p className="text-gray-600">Your cart is empty.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {items.map((item, index) => (
            <div key={index} className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {item.name}
              </h2>
              <p className="text-sm text-gray-700">
                Price: ${(item.price / 100).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="text-right font-semibold text-lg text-purple-800">
            Total: ${(total / 100).toFixed(2)}
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={loading || !items.length}
        className={`w-full px-6 py-3 rounded text-white font-medium transition ${
          loading || !items.length
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {loading ? 'Redirecting...' : 'Pay Now'}
      </button>
    </div>
  );
}
