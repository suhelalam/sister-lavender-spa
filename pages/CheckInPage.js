import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { allServices } from '../lib/servicesData';

const TIME_ZONE = 'America/Chicago';

function getDefaultStartAt() {
  const now = new Date();
  const minutes = now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  now.setMinutes(rounded);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now.toISOString().slice(0, 16);
}

function formatLocalDateTime(value) {
  if (!value) return '';
  return value.length === 16 ? `${value}:00` : value;
}

function formatServicePrice(price) {
  if (!Number.isFinite(price)) return '';
  return `$${(price / 100).toFixed(2)}`;
}

function buildWalkinOptions() {
  return allServices.flatMap((service) =>
    service.variations.map((variation) => ({
      id: variation.id,
      serviceId: service.id,
      label: `${service.name} — ${variation.name}`,
      name: service.name,
      description: service.description,
      category: service.category,
      durationMinutes: variation.duration / 60000,
      price: variation.price,
      priceLabel: formatServicePrice(variation.price),
    }))
  );
}

const walkInOptions = buildWalkinOptions();
const walkInOptionsByCategory = walkInOptions.reduce((groups, service) => {
  const category = service.category || 'Other';
  if (!groups[category]) groups[category] = [];
  groups[category].push(service);
  return groups;
}, {});

export default function CheckInPage() {
  const sigCanvas = useRef(null);
  const [lookupValue, setLookupValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState(
    walkInOptions[0] ? [walkInOptions[0].id] : []
  );
  const [serviceSearch, setServiceSearch] = useState('');
  const [startAt, setStartAt] = useState(getDefaultStartAt());
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchError, setSearchError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [bookingLink, setBookingLink] = useState('');

  const selectedServices = walkInOptions.filter((service) =>
    selectedServiceIds.includes(service.id)
  );

  const normalizedQuery = serviceSearch.trim().toLowerCase();
  const filteredWalkInOptionsByCategory = Object.entries(walkInOptionsByCategory).reduce((groups, [category, services]) => {
    const filteredServices = services.filter((service) => {
      if (!normalizedQuery) return true;
      return [service.label, service.name, service.description, service.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    if (filteredServices.length > 0) {
      groups[category] = filteredServices;
    }
    return groups;
  }, {});

  const bookingService = selectedBooking?.services?.[0] || null;
  const bookingStartAt = selectedBooking?.startAt || '';

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearchError('');
    setStatusMessage('');
    setSearchResults([]);
    setSelectedBooking(null);
    setShowWalkIn(false);

    const trimmedValue = String(lookupValue || '').trim();
    if (!trimmedValue) {
      setSearchError('Please enter a name, phone, or email to search.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/checkin/search?value=${encodeURIComponent(trimmedValue)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (!Array.isArray(data.bookings) || data.bookings.length === 0) {
        setStatusMessage('No matching online appointment was found. You can continue as a walk-in.');
        return;
      }

      setSearchResults(data.bookings);
    } catch (error) {
      setSearchError(error.message || 'Unable to search for bookings right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
    setShowWalkIn(false);
    setSearchResults([]);
    setLookupValue('');
    setCustomerName(booking.customer?.fullName || booking.customer?.name || '');
    setEmail(booking.customer?.email || '');
    setPhone(booking.customer?.phone || '');
    setNotes('');
    setStartAt(booking.startAt ? booking.startAt.slice(0, 16) : getDefaultStartAt());
    setAgreed(false);
    setErrors({});
    setStatusMessage('Review your appointment details and confirm your check-in.');
  };

  const handleStartWalkIn = () => {
    setSelectedBooking(null);
    setShowWalkIn(true);
    setSearchResults([]);
    setLookupValue('');
    setCustomerName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setServiceSearch('');
    setSelectedServiceIds(walkInOptions[0] ? [walkInOptions[0].id] : []);
    setStartAt(getDefaultStartAt());
    setAgreed(false);
    setErrors({});
    setStatusMessage('Choose one or more services and confirm your walk-in check-in.');
  };

  const validate = () => {
    const validationErrors = {};
    if (!customerName.trim()) validationErrors.customerName = 'Name is required.';
    if (!email.trim() && !phone.trim()) validationErrors.contact = 'Email or phone is required.';
    if (showWalkIn && selectedServices.length === 0) validationErrors.service = 'Please choose one or more services.';
    if (showWalkIn && !startAt) validationErrors.startAt = 'Please choose a time for your walk-in.';
    if (!agreed) validationErrors.agreed = 'Please agree to proceed.';
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) validationErrors.signature = 'Signature is required.';
    return validationErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setBookingLink('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!agreed) {
      setErrors({ agreed: 'You must agree to the service agreement before completing check-in.' });
      return;
    }

    const signature = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (!signature) {
      setErrors({ signature: 'Signature is required.' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        agreed,
        signature,
      };

      let response;
      let data;

      if (selectedBooking) {
        response = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            bookingId: selectedBooking.id,
            serviceDate: bookingStartAt ? bookingStartAt.split('T')[0] : new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
          }),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete check-in.');
        }
        setSuccessMessage('✅ Check-in confirmed for your appointment. Thank you!');
      } else {
        response = await fetch('/api/checkin/walkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            startAt: formatLocalDateTime(startAt),
            services: selectedServices,
          }),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete walk-in booking.');
        }
        setSuccessMessage('✅ Walk-in confirmed and added to the calendar. Thank you!');
        if (data.eventLink) setBookingLink(data.eventLink);
      }

      setCustomerName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setAgreed(false);
      clearSignature();
      setShowWalkIn(false);
      setSelectedBooking(null);
      setStartAt(getDefaultStartAt());
    } catch (error) {
      setStatusMessage(error.message || 'We could not complete your check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Spa Check-In</h1>
        <p className="mt-2 text-sm text-gray-600">
          Start by searching your appointment with name, phone, or email. If you don’t have an online booking, use the walk-in option.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
          <p className="font-semibold">{successMessage}</p>
          {bookingLink ? (
            <p className="mt-2 text-sm">
              Calendar event: <a className="text-purple-700 underline" href={bookingLink} target="_blank" rel="noreferrer">View booking</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="lookupValue">
              Search by name, phone, or email
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="lookupValue"
                type="text"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                disabled={isSearching}
                className="flex-1 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                placeholder="Jane Doe or jane@example.com or 312-900-3131"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSearching ? 'Searching…' : 'Find appointment'}
              </button>
            </div>
            {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}
            {statusMessage ? <p className="text-sm text-gray-600">{statusMessage}</p> : null}
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleStartWalkIn}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              I’m a walk-in
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Matching Online Appointment</h2>
              {searchResults.map((booking) => (
                <div key={booking.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{booking.customer?.fullName || 'Guest'}</p>
                      <p className="text-sm text-gray-600">{booking.customer?.email || booking.customer?.phone || 'No contact info'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectBooking(booking)}
                      className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      Select for check-in
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p><strong>Appointment:</strong> {booking.startAt ? new Date(booking.startAt).toLocaleString('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown'}</p>
                    <p><strong>Service:</strong> {booking.services?.map((service) => service.serviceName).join(', ') || 'Unavailable'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Need help?</h2>
          <p className="mt-3 text-sm text-gray-600">
            If you can’t find your appointment or your booking is still pending, please ask the front desk for assistance. Walk-ins can choose a service and be added to the calendar instantly.
          </p>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p><strong>Phone:</strong> (312) 900-3131</p>
            <p><strong>Location:</strong> 2706 W Chicago Ave, Chicago, IL 60622</p>
          </div>
        </aside>
      </div>

      {(selectedBooking || showWalkIn) && !successMessage ? (
        <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customer details</h2>
              <p className="mt-2 text-sm text-gray-600">Confirm your information before check-in.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isSubmitting}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.customerName ? <p className="mt-1 text-sm text-red-600">{errors.customerName}</p> : null}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </div>
                {errors.contact ? <p className="text-sm text-red-600">{errors.contact}</p> : null}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Appointment summary</h2>
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {selectedBooking ? (
                  <>
                    <p><strong>Appointment:</strong></p>
                    <p>{bookingStartAt ? new Date(bookingStartAt).toLocaleString('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown'}</p>
                    <p className="mt-3"><strong>Service:</strong></p>
                    <p>{bookingService?.serviceName || bookingService?.name || 'Unavailable'}</p>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="block text-sm font-medium text-gray-700">Search services</p>
                      <input
                        type="search"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Search by service name, category, or description"
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                      <div className="mt-3 space-y-3 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-3">
                        {Object.entries(filteredWalkInOptionsByCategory).length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                            No services match your search. Clear the search or try a different keyword.
                          </div>
                        ) : (
                          Object.entries(filteredWalkInOptionsByCategory).map(([category, services]) => (
                            <div key={category} className="space-y-2">
                            <p className="text-sm font-semibold text-gray-900">{category}</p>
                            <div className="space-y-2">
                              {services.map((service) => (
                                <label key={service.id} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedServiceIds.includes(service.id)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedServiceIds((current) => {
                                        if (checked) {
                                          return [...current, service.id];
                                        }
                                        return current.filter((id) => id !== service.id);
                                      });
                                    }}
                                    disabled={isSubmitting}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <div className="flex-1 text-sm">
                                    <div className="font-medium text-gray-900">{service.label}</div>
                                    <div className="text-gray-600">{service.description}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                      {service.durationMinutes} min · {service.priceLabel}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {errors.service ? <p className="mt-1 text-sm text-red-600">{errors.service}</p> : null}
                    </div>

                    {selectedServices.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                        <p className="font-semibold text-gray-900">Selected services</p>
                        <ul className="mt-3 space-y-2 text-sm text-gray-700">
                          {selectedServices.map((service) => (
                            <li key={service.id}>
                              <span className="font-medium">{service.label}</span>{' '}
                              <span className="text-gray-600">({service.durationMinutes} min · {service.priceLabel})</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Total duration:</strong>{' '}
                          {selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0)} min
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Total price:</strong>{' '}
                          {selectedServices.reduce((sum, service) => sum + (service.price || 0), 0) > 0
                            ? formatServicePrice(selectedServices.reduce((sum, service) => sum + (service.price || 0), 0))
                            : 'TBD'}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <label htmlFor="startAt" className="block text-sm font-medium text-gray-700">Preferred start time</label>
                      <input
                        id="startAt"
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        disabled={isSubmitting}
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 ${errors.startAt ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.startAt ? <p className="mt-1 text-sm text-red-600">{errors.startAt}</p> : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700" htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Tell us about allergies, pain points, or preferences."
            />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              By signing below, you confirm the information is correct and agree to proceed with your service.
            </p>
            <div className="mt-4">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  width: 400,
                  height: 140,
                  className: `border rounded ${errors.signature ? 'border-red-500' : 'border-gray-300'} w-full`,
                }}
                clearOnResize={false}
                disabled={isSubmitting}
              />
              {errors.signature ? <p className="mt-1 text-sm text-red-600">{errors.signature}</p> : null}
              <button
                type="button"
                onClick={clearSignature}
                disabled={isSubmitting}
                className="mt-3 text-sm text-purple-700 underline"
              >
                Clear signature
              </button>
            </div>

            <label className="mt-6 flex items-start gap-3 text-sm text-gray-700" htmlFor="agreed">
              <input
                id="agreed"
                name="agreed"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.agreed)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                required
              />
              <span>I agree to the spa service agreement and confirm this information is correct.</span>
            </label>
            {errors.agreed ? <p className="mt-1 text-sm text-red-600">{errors.agreed}</p> : null}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting || !agreed}
              className="w-full rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting…' : selectedBooking ? 'Confirm check-in' : 'Confirm walk-in'}
            </button>
            {statusMessage ? <p className="mt-3 text-sm text-gray-600">{statusMessage}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
