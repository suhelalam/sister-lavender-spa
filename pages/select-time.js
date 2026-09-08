'use client';

import { useEffect, useRef, useState } from 'react';
import AppointmentSummary from '../components/AppointmentSummary';
import { useCart } from '../context/CartContext';

const BUSINESS_TIME_ZONE = 'America/Chicago';

function getBusinessDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return { year, month, day };
}

function getBusinessDateKey(date = new Date()) {
  const { year, month, day } = getBusinessDateParts(date);
  return `${year}-${month}-${day}`;
}

function localDateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getAppointmentDurationMinutes(items) {
  const longestServiceDurationMs = items.reduce(
    (longest, item) => Math.max(longest, Number(item?.duration) || 0),
    0
  );

  return Math.ceil(longestServiceDurationMs / 60000);
}

export default function SelectTimePage() {
  const { items: cartItems, isClient } = useCart();
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => localDateFromKey(getBusinessDateKey()));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const appointmentSummaryRef = useRef(null);

  const todayKey = getBusinessDateKey();
  const today = localDateFromKey(todayKey);
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatAccessibleDate = (date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const getStartOfWeek = (date) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() - copy.getDay());
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const getWeekDates = (offset) => {
    const base = getStartOfWeek(today);
    base.setDate(base.getDate() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (!isClient) return;

    const stored = sessionStorage.getItem('services');
    if (stored) {
      try {
        const storedServices = JSON.parse(stored);
        if (Array.isArray(storedServices) && storedServices.length > 0) {
          setError(null);
          setServices(storedServices);
          return;
        }
      } catch (parseError) {
        console.error('Failed to read selected services:', parseError);
      }
    }

    // Recover when arriving from an older cart flow that did not create the
    // session snapshot, while still waiting for localStorage cart hydration.
    if (cartItems.length > 0) {
      sessionStorage.setItem('services', JSON.stringify(cartItems));
      setError(null);
      setServices(cartItems);
    } else {
      setError('No services selected.');
    }
  }, [cartItems, isClient]);

  useEffect(() => {
    if (!services.length) return;

    const selectedServices = isClient && cartItems.length > 0 ? cartItems : services;
    const durationMinutes = getAppointmentDurationMinutes(selectedServices);
    if (durationMinutes <= 0) return;

    const controller = new AbortController();

    // Never leave another day's slots visible while this request is pending.
    setAvailability([]);
    setSelectedSlot(null);
    sessionStorage.removeItem('selectedSlot');

    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/get-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            serviceVariationId: services[0].id,
            startDate: formatDate(selectedDate),
            durationMinutes,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch availability.');
        }

        if (!controller.signal.aborted) {
          const nextAvailability = Array.isArray(data.availabilities) ? data.availabilities : [];
          setAvailability(nextAvailability);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to fetch availability.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAvailability();
    return () => controller.abort();
  }, [cartItems, isClient, selectedDate, services]);

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    sessionStorage.setItem('selectedSlot', JSON.stringify(slot));
    requestAnimationFrame(() => {
      appointmentSummaryRef.current?.focus();
      appointmentSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const goToPreviousWeek = () => {
    if (weekOffset > 0) {
      const nextOffset = weekOffset - 1;
      setWeekOffset(nextOffset);
      setSelectedDate(nextOffset === 0 ? today : getWeekDates(nextOffset)[0]);
    }
  };

  const goToNextWeek = () => {
    const nextOffset = weekOffset + 1;
    setWeekOffset(nextOffset);
    setSelectedDate(getWeekDates(nextOffset)[0]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-purple-700">Select a Time Slot</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Time Slot Section */}
        <div className="flex-1">
          {/* Month Heading & Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goToPreviousWeek}
              disabled={weekOffset === 0}
              className={`text-sm px-2 py-1 rounded ${
                weekOffset === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-purple-600 hover:bg-purple-100'
              }`}
            >
              &larr; Prev
            </button>
            <div className="text-lg font-medium text-gray-700">
              {weekDates[0].toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <button
              onClick={goToNextWeek}
              className="text-sm px-2 py-1 rounded text-purple-600 hover:bg-purple-100"
            >
              Next &rarr;
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center mb-2 gap-1 text-sm font-medium text-gray-600">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index}>{day}</div>
            ))}
          </div>

          {/* Day Buttons */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDates.map((date) => {
              const dateKey = formatDate(date);
              const isPast = dateKey < todayKey;
              const isSelected = dateKey === formatDate(selectedDate);

              return (
                <button
                  type="button"
                  key={dateKey}
                  disabled={isPast}
                  onClick={() => setSelectedDate(date)}
                  aria-pressed={isSelected}
                  aria-label={`${formatAccessibleDate(date)}${isSelected ? ', selected' : ''}`}
                  title={formatAccessibleDate(date)}
                  className={`rounded-full h-10 w-10 mx-auto flex items-center justify-center transition
                    ${isSelected ? 'bg-purple-600 text-white' : ''}
                    ${isPast ? 'text-gray-300 line-through cursor-not-allowed' : 'hover:bg-purple-100'}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time Slots */}
          {loading ? (
            <p>Loading availability...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : availability.length === 0 ? (
            <p>No slots available for this day.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {availability.map((slot, idx) => {
                const start = new Date(slot.startAt);
                const isSelected = selectedSlot?.startAt === slot.startAt;
                return (
                  <button
                    type="button"
                    key={slot.startAt || idx}
                    onClick={() => handleSlotSelect(slot)}
                    aria-pressed={isSelected}
                    className={`h-12 w-full rounded border text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-100 text-purple-900'
                        : 'border-gray-300 bg-white text-gray-800 hover:bg-purple-50'
                    }`}
                  >
                    {start.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: BUSINESS_TIME_ZONE,
                    })}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Appointment Summary */}
        <div
          ref={appointmentSummaryRef}
          tabIndex={-1}
          className="w-full lg:w-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
        >
          <AppointmentSummary selectedSlot={selectedSlot} />
        </div>
      </div>
    </div>
  );

}
