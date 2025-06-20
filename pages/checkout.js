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
            window.location.href = data.url; // Redirect to Square hosted checkout
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

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={loading || !items.length}
        className={`px-6 py-2 rounded text-white ${
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
