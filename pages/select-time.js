'use client';

import { useEffect, useState } from 'react';
import AppointmentSummary from '../components/AppointmentSummary';

export default function SelectTimePage() {
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date) => date.toISOString().split('T')[0];

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
    const stored = sessionStorage.getItem('services');
    if (!stored) {
      setError('No services selected.');
      return;
    }
    setServices(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!services.length) return;

    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/get-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceVariationId: services[0].id,
            startDate: formatDate(selectedDate),
          }),
        });

        const data = await res.json();
        if (data.success) {
          const closingHour = 20; // remove this line
          const durationMinutes = services[0].duration || 60;

          const filtered = data.availabilities.filter((slot) => {
            const start = new Date(slot.startAt);
            const end = new Date(start.getTime() + durationMinutes * 60000);

            const day = start.getDay(); // Sunday = 0
            const closingHour = day === 0 ? 18 : 20; // Sunday: 6PM, others: 8PM

            return (
              end.getHours() < closingHour ||
              (end.getHours() === closingHour && end.getMinutes() === 0)
            );
          });

          setAvailability(filtered);
        }

      } catch (err) {
        setError('Failed to fetch availability.');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, services]);

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    sessionStorage.setItem('selectedSlot', JSON.stringify(slot));
  };

  const goToPreviousWeek = () => {
    if (weekOffset > 0) setWeekOffset(weekOffset - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset(weekOffset + 1);
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
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          {/* Day Buttons */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDates.map((date, i) => {
              const isPast = date < today;
              const isSelected = date.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={() => setSelectedDate(date)}
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
            <ul className="space-y-3">
              {availability.map((slot, idx) => {
                const start = new Date(slot.startAt);
                const isSelected = selectedSlot?.startAt === slot.startAt;
                return (
                  <li
                    key={idx}
                    onClick={() => handleSlotSelect(slot)}
                    className={`p-3 border rounded shadow-sm cursor-pointer hover:bg-purple-50 ${
                      isSelected ? 'bg-purple-100 border-purple-400' : 'bg-white'
                    }`}
                  >
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* RIGHT: Appointment Summary */}
        <div className="w-full lg:w-96">
          <AppointmentSummary selectedSlot={selectedSlot} />
        </div>
      </div>
    </div>
  );

}
