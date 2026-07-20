'use client';

import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Modal from '../components/Modal';
import OurPolicy from './our-policy';
import ServiceAgreement from './service-agreement';
import { Check, LoaderCircle } from 'lucide-react';

const BUSINESS_TIME_ZONE = 'America/Chicago';

export default function ConfirmBookingPage() {
  const { items, isClient, clearCart } = useCart();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showServiceAgreement, setShowServiceAgreement] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [rewardsOptIn, setRewardsOptIn] = useState(false);
  const [rewardsLocked, setRewardsLocked] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lookupState, setLookupState] = useState({ loading: false, message: '', type: '' });
  const [note, setNote] = useState('');
  const [partySize, setPartySize] = useState(1);

  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedSlot = sessionStorage.getItem('selectedSlot');
    if (storedSlot) setSelectedSlot(JSON.parse(storedSlot));
  }, []);

  useEffect(() => {
    if (!loading && !booked) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [loading, booked]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalFormatted = `$${(total / 100).toFixed(2)}`;

  if (!isClient) return <div className="p-6">Loading...</div>;

  const getDurationMinutes = (rawDuration) => {
    const parsed = Number(rawDuration);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed >= 1000 ? Math.round(parsed / 60000) : Math.round(parsed);
  };

  const normalizeCategory = (value = '') =>
    String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

  const servicesOnly = items.filter((item) => !item?.isAddOn);
  const addOnsOnly = items.filter((item) => item?.isAddOn);
  const matchedAddOnIndexes = new Set();

  const serviceGroups = servicesOnly.map((serviceItem) => {
    const serviceCategoryKey = normalizeCategory(serviceItem.category);
    const matchedAddOns = [];

    addOnsOnly.forEach((addOnItem, addOnIndex) => {
      if (matchedAddOnIndexes.has(addOnIndex)) return;
      const addOnCategoryKey = normalizeCategory(
        addOnItem.appliesToCategory || addOnItem.category
      );
      if (!serviceCategoryKey || !addOnCategoryKey) return;
      if (serviceCategoryKey !== addOnCategoryKey) return;

      matchedAddOns.push(addOnItem);
      matchedAddOnIndexes.add(addOnIndex);
    });

    return { serviceItem, matchedAddOns };
  });

  const unassignedAddOns = addOnsOnly.filter((_, index) => !matchedAddOnIndexes.has(index));

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

  const lookupCustomer = async () => {
    setLookupState({ loading: true, message: '', type: '' });
    try {
      const response = await fetch('/api/crm/booking-customer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const customer = data.customer;
      setCustomerId(customer.id);
      if (customer.firstName) setFirstName(customer.firstName);
      if (customer.lastName) setLastName(customer.lastName);
      if (customer.phone) setPhone(customer.phone);
      if (customer.email) setEmail(customer.email);
      setRewardsOptIn(customer.rewardsEnrolled);
      setRewardsLocked(customer.rewardsEnrolled);
      setLookupState({
        loading: false, type: 'success',
        message: customer.rewardsEnrolled
          ? `Welcome back! You currently have ${customer.pointsBalance} reward points.`
          : 'Welcome back! We found your profile. You can join rewards below if you would like.',
      });
    } catch (lookupError) {
      setCustomerId('');
      setRewardsLocked(false);
      setLookupState({ loading: false, type: 'error', message: lookupError.message });
    }
  };

  const changeCustomerIdentity = (setter) => (event) => {
    setter(event.target.value);
    if (customerId) {
      setCustomerId('');
      setRewardsLocked(false);
      setRewardsOptIn(false);
      setLookupState({ loading: false, message: 'Contact information changed. Find the profile again to reconnect rewards.', type: 'error' });
    }
  };


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

        const bookingRes = await fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer: {
            givenName: firstName,
            familyName: lastName,
            emailAddress: email,
            phoneNumber: formatPhoneToE164(phone),
            },
            services: items.map((item) => ({
              serviceVariationId: item.id,
              serviceName: item.name,
              serviceVariationVersion: item.version,
              durationMinutes: getDurationMinutes(item.duration),
              quantity: Math.max(1, Number(item.quantity || 1)),
              isAddOn: Boolean(item.isAddOn),
              category: item.category || '',
              appliesToCategory: item.appliesToCategory || '',
            })),
            startAt: selectedSlot.startAt,
            locationId,
            totalFormatted,
            partySize,
            note,
            customerId,
            rewardsOptIn,
            marketingOptIn,
          }),
        });

        const bookingData = await bookingRes.json();

        if (!bookingRes.ok) {
        throw new Error(bookingData.error || 'Failed to book appointment');
        }

        setBooked(true);
        clearCart();
        sessionStorage.removeItem('selectedSlot');
        sessionStorage.removeItem('services');
        window.setTimeout(() => {
          window.location.href = '/';
        }, 1800);

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
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium whitespace-nowrap rounded border border-gray-300 bg-gray-50 px-3 py-2">
              US +1
            </span>
            <input
              type="tel"
              placeholder="(000) 000-0000"
              className="border rounded px-3 py-2 w-full"
              value={phone}
              onChange={changeCustomerIdentity(setPhone)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Number of People</label>
            <input
              type="number"
              min="1"
              max="10"
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
              className="border rounded px-3 py-2 w-full"
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
            onChange={changeCustomerIdentity(setEmail)}
            required
          />

          <div className="rounded-xl border border-[#ded3e0] bg-[#f8f4f9] p-4">
            <h3 className="font-semibold text-[#423846]">Returning guest?</h3>
            <p className="mt-1 text-xs leading-5 text-stone-600">Use the phone number or email above to find your profile and keep your visits and rewards together.</p>
            <button type="button" onClick={lookupCustomer} disabled={lookupState.loading || (!phone.trim() && !email.trim())} className="button-secondary mt-3">
              {lookupState.loading ? 'Finding profile…' : 'Find my profile'}
            </button>
            {lookupState.message && <p className={`mt-3 text-sm ${lookupState.type === 'success' ? 'text-green-700' : 'text-amber-700'}`} role="status">{lookupState.message}</p>}
          </div>

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

          <label className="flex items-start gap-3 rounded-xl border border-[#d8dfd2] bg-[#f1f5ed] p-4 text-sm">
            <input type="checkbox" className="mt-1" checked={rewardsOptIn} disabled={rewardsLocked} onChange={(event) => setRewardsOptIn(event.target.checked)} />
            <span><strong className="block text-[#46533f]">{rewardsLocked ? 'Lavender Rewards member' : 'Join Lavender Rewards'}</strong><span className="mt-1 block text-stone-600">{rewardsLocked ? 'Your membership is already active and will remain connected to this booking.' : 'Earn 1 point for every eligible service dollar paid. Joining is free, and your points stay connected to this phone number and email.'}</span></span>
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
            aria-haspopup="dialog"
            aria-expanded={showPolicy}
            className="text-purple-600 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:rounded-sm"
          >
            See full policy
          </button>
        </section>

        <section className="text-sm text-gray-600">
          By booking an appointment, you acknowledge and agree to our{' '}
          <button
            type="button"
            onClick={() => setShowServiceAgreement(true)}
            aria-haspopup="dialog"
            aria-expanded={showServiceAgreement}
            className="text-purple-600 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:rounded-sm"
          >
            service-agreement
          </button>
          .
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
                  timeZone: BUSINESS_TIME_ZONE,
                })}
              </div>
              <div className="text-purple-700 font-medium">
                {new Date(selectedSlot.startAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: BUSINESS_TIME_ZONE,
                })}{' '}
                {/* – {new Date(selectedSlot.endAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} CDT */}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {serviceGroups.map(({ serviceItem, matchedAddOns }, idx) => (
              <div key={`${serviceItem.id}-${idx}`} className="rounded border border-gray-100 p-2">
                <div className="flex justify-between text-sm font-medium text-gray-900">
                  <span>
                    {serviceItem.name}
                    {serviceItem.quantity > 1 ? ` x${serviceItem.quantity}` : ''}
                  </span>
                  <span>${((serviceItem.price * serviceItem.quantity) / 100).toFixed(2)}</span>
                </div>

                {matchedAddOns.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {matchedAddOns.map((addOn, addOnIdx) => (
                      <div
                        key={`${addOn.id}-${addOnIdx}`}
                        className="flex justify-between text-xs text-gray-600 pl-3"
                      >
                        <span>
                          + {addOn.name}
                          {addOn.quantity > 1 ? ` x${addOn.quantity}` : ''}
                        </span>
                        <span>${((addOn.price * addOn.quantity) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {servicesOnly.length === 0 && addOnsOnly.length > 0 ? (
              <div className="text-sm text-gray-700">
                {addOnsOnly.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {unassignedAddOns.length > 0 ? (
              <div className="rounded border border-amber-100 bg-amber-50 p-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Unassigned add-ons
                </div>
                <div className="mt-1 space-y-1">
                  {unassignedAddOns.map((item, idx) => (
                    <div key={`${item.id}-unassigned-${idx}`} className="flex justify-between text-xs text-amber-900">
                      <span>+ {item.name}</span>
                      <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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

      <Modal isOpen={showServiceAgreement} onClose={() => setShowServiceAgreement(false)}>
        <ServiceAgreement />
      </Modal>

      {(loading || booked) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
          aria-labelledby="booking-progress-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#fbfaf7] px-7 py-10 text-center shadow-2xl md:px-10">
            {booked ? (
              <>
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-900/20">
                  <Check size={58} strokeWidth={3} aria-hidden="true" />
                </div>
                <h2 id="booking-progress-title" className="mt-6 font-display text-4xl text-[#34442f]">Booked!</h2>
                <p className="mt-3 leading-6 text-stone-600">Your appointment is confirmed. We sent the details to your email.</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-green-700">Taking you home…</p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eee8f0] text-[#66516f]">
                  <LoaderCircle className="animate-spin" size={46} aria-hidden="true" />
                </div>
                <h2 id="booking-progress-title" className="mt-6 font-display text-3xl text-[#423846]">Booking your appointment…</h2>
                <p className="mt-3 leading-6 text-stone-600">Please stay on this page while we reserve your time and send your confirmation.</p>
                <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-[#e4dce6]">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#66516f]" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
