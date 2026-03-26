'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

function formatDateInputValue(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function getBookingDurationMinutes(services) {
  if (!Array.isArray(services) || services.length === 0) return 60;
  const total = services.reduce((sum, service) => {
    const minutes = Math.max(0, Number(service?.durationMinutes || 0));
    const qty = Math.max(1, Number(service?.quantity || 1));
    return sum + minutes * qty;
  }, 0);
  return total > 0 ? total : 60;
}

export default function CancelBookingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState({ type: '', message: '' });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [canReschedule, setCanReschedule] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const bookingId = useMemo(
    () => (typeof router.query.booking === 'string' ? router.query.booking : ''),
    [router.query.booking]
  );
  const token = useMemo(
    () => (typeof router.query.token === 'string' ? router.query.token : ''),
    [router.query.token]
  );

  const hasRequiredParams = Boolean(bookingId && token);

  useEffect(() => {
    if (!router.isReady || !hasRequiredParams) return;

    let mounted = true;

    const loadBookingDetails = async () => {
      setLoadingDetails(true);
      setResult({ type: '', message: '' });

      try {
        const qs = new URLSearchParams({
          bookingId,
          token,
        });
        const res = await fetch(`/api/cancel-booking?${qs.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Could not load booking details.');
        }

        if (!mounted) return;
        setBookingDetails(data?.booking || null);
        setCanCancel(Boolean(data?.canCancel));
        setCanReschedule(Boolean(data?.canReschedule));
        setSelectedDate(formatDateInputValue(data?.booking?.startAt));
        setSelectedSlot(null);
        setAvailability([]);

        if (data?.message && data?.canCancel === false) {
          setResult({ type: 'error', message: data.message });
        }
      } catch (error) {
        if (!mounted) return;
        setResult({
          type: 'error',
          message: error?.message || 'Could not load booking details.',
        });
        setCanCancel(false);
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };

    loadBookingDetails();
    return () => {
      mounted = false;
    };
  }, [router.isReady, hasRequiredParams, bookingId, token]);

  const cancelBooking = async () => {
    if (!hasRequiredParams) {
      setResult({ type: 'error', message: 'Invalid cancellation link.' });
      return;
    }

    setSubmitting(true);
    setResult({ type: '', message: '' });

    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Could not cancel this booking.');
      }

      setResult({
        type: 'success',
        message: data?.message || 'Booking canceled successfully.',
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: error?.message || 'Could not cancel this booking.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!canReschedule || !selectedDate) return;

    let mounted = true;
    const durationMinutes = getBookingDurationMinutes(bookingDetails?.services);

    const loadAvailability = async () => {
      setLoadingAvailability(true);
      setSelectedSlot(null);
      try {
        const res = await fetch('/api/get-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: selectedDate }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Could not fetch availability');
        }

        const filtered = (Array.isArray(data.availabilities) ? data.availabilities : []).filter(
          (slot) => {
            const start = new Date(slot.startAt);
            const end = new Date(start.getTime() + durationMinutes * 60000);
            const day = start.getDay();
            const closingHour = day === 0 ? 18 : 20;
            return (
              end.getHours() < closingHour ||
              (end.getHours() === closingHour && end.getMinutes() === 0)
            );
          }
        );

        if (!mounted) return;
        setAvailability(filtered);
      } catch {
        if (!mounted) return;
        setAvailability([]);
      } finally {
        if (mounted) setLoadingAvailability(false);
      }
    };

    loadAvailability();
    return () => {
      mounted = false;
    };
  }, [canReschedule, selectedDate, bookingDetails?.services]);

  const updateBooking = async () => {
    if (!hasRequiredParams || !selectedSlot?.startAt) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          token,
          newStartAt: selectedSlot.startAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not update booking.');
      }

      setResult({ type: 'success', message: data?.message || 'Booking updated.' });
      setBookingDetails((prev) =>
        prev
          ? {
              ...prev,
              startAt: data?.booking?.startAt || prev.startAt,
              startAtLabel: data?.booking?.startAtLabel || prev.startAtLabel,
            }
          : prev
      );
    } catch (error) {
      setResult({ type: 'error', message: error?.message || 'Could not update booking.' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Cancel booking</h1>
        <p className="mt-2 text-sm text-gray-600">
          This link is unique to your appointment. Confirm below to cancel it.
        </p>

        {loadingDetails ? (
          <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Loading booking details...
          </div>
        ) : null}

        {bookingDetails ? (
          <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
            <h2 className="font-semibold text-gray-900">Booking details</h2>
            <div className="mt-2 space-y-1">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {bookingDetails?.customer?.fullName || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {bookingDetails?.customer?.email || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Date & time:</span>{' '}
                {bookingDetails?.startAtLabel || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Party size:</span>{' '}
                {bookingDetails?.partySize ?? 1}
              </p>
              <p>
                <span className="font-medium">Total:</span>{' '}
                {bookingDetails?.totalFormatted || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                {bookingDetails?.status || 'active'}
              </p>
              <p>
                <span className="font-medium">Services:</span>{' '}
                {Array.isArray(bookingDetails?.services) && bookingDetails.services.length > 0
                  ? bookingDetails.services.map((s) => s?.serviceName || 'Service').join(', ')
                  : 'N/A'}
              </p>
              {bookingDetails?.note ? (
                <p>
                  <span className="font-medium">Note:</span> {bookingDetails.note}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {bookingDetails && canReschedule ? (
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-gray-800">
            <h2 className="font-semibold text-gray-900">Change booking time</h2>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700">Select date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="mt-3">
              <div className="text-xs font-medium text-gray-700">Available times</div>
              {loadingAvailability ? (
                <div className="mt-2 text-xs text-gray-600">Loading slots...</div>
              ) : availability.length === 0 ? (
                <div className="mt-2 text-xs text-gray-600">No available slots for this date.</div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availability.map((slot, idx) => {
                    const isSelected = selectedSlot?.startAt === slot.startAt;
                    return (
                      <button
                        key={`${slot.startAt}-${idx}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded border px-2 py-1 text-xs ${
                          isSelected
                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {new Date(slot.startAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={updateBooking}
              disabled={updating || loadingAvailability || !selectedSlot?.startAt}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? 'Updating...' : 'Update booking'}
            </button>
          </div>
        ) : null}

        {!hasRequiredParams ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Invalid cancellation link. Please use the cancellation link from your booking email.
          </div>
        ) : null}

        {result.message ? (
          <div
            className={`mt-6 rounded-md p-3 text-sm ${
              result.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.message}
          </div>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={cancelBooking}
            disabled={
              submitting ||
              loadingDetails ||
              !hasRequiredParams ||
              !canCancel ||
              result.type === 'success'
            }
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Canceling...' : 'Cancel appointment'}
          </button>
          <Link href="/" className="text-sm text-purple-700 underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
