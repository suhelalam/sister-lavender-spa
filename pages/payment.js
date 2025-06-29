'use client';
import { useBooking } from '../context/BookingContext';
import { useEffect, useState } from 'react';

export default function Payment() {
  const { bookingData } = useBooking();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function createBookingAndRedirect() {
      const res = await fetch('/api/create-booking-and-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to create booking or checkout session.');
        setLoading(false);
      }
    }
    createBookingAndRedirect();
  }, [bookingData]);

  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      {loading && <p className="text-xl">Redirecting to payment...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}