'use client';
import { useBooking } from '../context/BookingContext';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Customer() {
  const { bookingData, setBookingData } = useBooking();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const res = await fetch('/api/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else {
      setBookingData({
        ...bookingData,
        customer: { ...form, id: data.customer.id },
      });
      router.push('/payment');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Your Information</h1>
      <input
        type="text"
        name="name"
        placeholder="Name"
        onChange={handleChange}
        className="w-full mb-4 p-2 border"
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
        className="w-full mb-4 p-2 border"
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone"
        onChange={handleChange}
        className="w-full mb-4 p-2 border"
      />
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button
        onClick={handleSubmit}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
      >
        Continue to Payment
      </button>
    </div>
  );
}