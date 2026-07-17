'use client';

import { useCart } from '../context/CartContext';
import { slugifyServiceValue } from '../lib/serviceShareLinks';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';

const BUSINESS_TIME_ZONE = 'America/Chicago';

export default function AppointmentSummary({ selectedSlot }) {
  const { items, addItem, removeItem, isClient } = useCart();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Wait for the persisted cart to hydrate. Otherwise the initial empty
    // server state can incorrectly erase a valid shared-service URL.
    if (!isClient || typeof window === 'undefined') return;

    // Only the main services page supports service share links.
    if (window.location.pathname !== '/services') return;

    const serviceCounts = items
      .filter((item) => !item.isAddOn)
      .reduce((counts, item) => {
        // The display name is the stable share value. Some older records have
        // shortened emoji-prefixed IDs that do not match their full names.
        const shareValue = item.name || item.serviceId || item.id;
        if (!shareValue) return counts;

        const serviceSlug = slugifyServiceValue(shareValue);
        const variationSlug = slugifyServiceValue(item.variationName || item.id || 'standard');
        const selectionKey = `${serviceSlug}--${variationSlug}`;
        const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
        counts.set(selectionKey, (counts.get(selectionKey) || 0) + quantity);
        return counts;
      }, new Map());

    const params = new URLSearchParams(window.location.search);
    params.delete('service');
    params.delete('services');
    Array.from(params.keys())
      .filter((key) => key.endsWith('-count'))
      .forEach((key) => params.delete(key));

    serviceCounts.forEach((count, slug) => {
      params.set(`${slug}-count`, String(count));
    });

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [items, isClient]);

  if (!isClient) return <div className="p-4">Loading...</div>;

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalFormatted = `$${(total / 100).toFixed(2)}`;
  const totalDurationMs = items.reduce(
    (sum, item) => sum + ((item.duration || 0) * item.quantity),
    0
  );

  const totalDurationMin = Math.floor(totalDurationMs / 60000);
  // console.log('Total duration (min):', totalDurationMin);

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h && m) return `${h}h ${m}min`;
    if (h) return `${h}h`;
    return `${m}min`;
  }


  const handleNext = () => {
  sessionStorage.setItem('services', JSON.stringify(items));
  if (selectedSlot) {
    sessionStorage.setItem('selectedSlot', JSON.stringify(selectedSlot));
    window.location.href = '/ConfirmBookingPage';
  } else {
    window.location.href = '/select-time';
  }
};

  return (
    <div className="w-full max-w-md border rounded shadow bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-purple-50 text-purple-700 font-semibold border-b rounded-t"
      >
        <span>Appointment Summary</span>
        <span className="flex items-center gap-2">
          {!isOpen && <span>{totalFormatted}</span>}
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-2">
          {items.length === 0 ? (
            <p className="text-gray-500">No services selected yet.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={index} className="border-b pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">{item.name}</div>
                        {item.variationName && (
                          <div className="text-sm text-gray-600">{item.variationName}</div>
                        )}
                        <div className="text-sm text-purple-700 font-semibold">
                          ${(item.price / 100).toFixed(2)} x {item.quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          aria-label="Decrease"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="text-sm">{item.quantity}</span>
                        <button
                          onClick={() => addItem(item)}
                          className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          aria-label="Increase"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Show selected appointment time */}
              {selectedSlot && (
                <div className="mt-4 font-semibold text-purple-700">
                  Selected Time:{' '}
                  <span className="text-gray-800">
                    {new Date(selectedSlot.startAt).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: BUSINESS_TIME_ZONE,
                    })}
                  </span>
                </div>
              )}

              <div className="mt-4 pt-2 border-t text-right font-semibold text-purple-800 text-lg">
                Total: {totalFormatted}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Total Duration: {formatDuration(totalDurationMin)}
              </div>

              {/* NEXT BUTTON */}
              <button
                onClick={handleNext}
                className="w-full mt-6 bg-purple-600 text-white font-semibold py-2 px-4 rounded hover:bg-purple-700 transition"
              >
                Next
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
