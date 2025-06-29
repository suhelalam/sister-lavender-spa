'use client';

import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Modal from '../components/Modal';
import OurPolicy from './our-policy';

export default function ConfirmBookingPage() {
  const { items, isClient, clearCart } = useCart();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedSlot = sessionStorage.getItem('selectedSlot');
    if (storedSlot) setSelectedSlot(JSON.parse(storedSlot));
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalFormatted = `$${(total / 100).toFixed(2)}`;

  if (!isClient) return <div className="p-6">Loading...</div>;

  function formatPhoneToE164(phone) {
    // Remove everything except digits
    const digits = phone.replace(/\D/g, '');
    // Assume US if 10 digits
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    // If already includes country code (11+ digits), prefix with "+"
    if (digits.length >= 11) {
      return `+${digits}`;
    }
    throw new Error('Invalid phone number format');
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        // Prepare serviceVariationId and locationId from your app context or data
        // For example:
        const serviceVariationId = items.length > 0 ? items[0].id : null; 
        const serviceVariationVersion = items.length > 0 ? items[0].version : null;
        // console.log('Printing item: ', items);
        // You need to make sure each item has this or adapt accordingly

        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID; // or pass it down

        if (!serviceVariationId || !locationId) {
          throw new Error('Missing service variation or location information.');
        }

        const bookingRes = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer: {
            givenName: firstName,
            familyName: lastName,
            emailAddress: email,
            phoneNumber: formatPhoneToE164(phone),
            },
            serviceVariationId,
            serviceVariationVersion: serviceVariationVersion,
            startAt: selectedSlot.startAt,
            locationId,
          }),
        });

        const bookingData = await bookingRes.json();

        if (!bookingRes.ok) {
        throw new Error(bookingData.error || 'Failed to book appointment');
        }

        alert('Booking successful! Your appointment is confirmed.');
        // Redirect or clear form if needed
        clearCart();
        window.location.href = '/';

    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
    };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-purple-700">Confirm Your Booking</h1>

      <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-700 border border-yellow-200">
        Appointment held for 10 minutes
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Contact Info</h2>
          {/* <div className="text-sm text-purple-700 cursor-pointer hover:underline">Sign in</div> */}

          <div className="flex gap-2 items-center">
            <span className="text-lg">US +1</span>
            <input
              type="tel"
              placeholder="(000) 000-0000"
              className="border rounded px-3 py-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-gray-500">
            By providing your phone number you acknowledge you will receive occasional informational messages, including automated messages, on your mobile device from this merchant. Text STOP to opt out at any time, and text HELP to get HELP. Message and data rates may apply.
          </p>

          <input
            type="text"
            placeholder="First name"
            className="border rounded px-3 py-2 w-full"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last name"
            className="border rounded px-3 py-2 w-full"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="border rounded px-3 py-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={marketingOptIn}
              onChange={() => setMarketingOptIn(!marketingOptIn)}
            />
            <span>
              Text me marketing and loyalty offers from Sister Lavender Spa. You consent to receive marketing texts, including Loyalty messages, coupons, and discounts, via the phone number you provided from this business. Text STOP to unsubscribe from texts from this business at any time, or HELP for more information. MSG and data rates may apply. Joining this program is not a condition of purchase. You certify that you are at least 18 years of age.
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium">Appointment note</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows={3}
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </section>

        {/* Cancellation Policy with Modal Trigger */}
        <section className="text-sm text-gray-600">
          <h2 className="font-semibold text-gray-800">Cancellation Policy</h2>
          Please cancel or reschedule before your appointment begins.{' '}
          <button
            type="button"
            onClick={() => setShowPolicy(true)}
            className="text-purple-600 underline"
          >
            See full policy
          </button>
        </section>

        <section className="text-sm text-gray-500">
          Upon booking, Square will automatically create an account for you with Square Appointments. You can sign back in using your mobile number at any time. You may also receive promotional emails from Square.
        </section>

        <section className="border rounded p-4 shadow bg-white">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">Appointment Summary</h2>

          {selectedSlot && (
            <div className="mb-4">
              <div>
                {new Date(selectedSlot.startAt).toLocaleString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-purple-700 font-medium">
                {new Date(selectedSlot.startAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                {/* – {new Date(selectedSlot.endAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} CDT */}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>${(item.price / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{totalFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{totalFormatted}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Due today</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Due at appointment</span>
              <span>{totalFormatted}</span>
            </div>
          </div>
        </section>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white font-semibold py-2 px-4 rounded hover:bg-purple-700 transition"
        >
          {loading ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>

      {/* Modal for Policy */}
      <Modal isOpen={showPolicy} onClose={() => setShowPolicy(false)}>
        <OurPolicy />
      </Modal>
    </div>
  );
}
