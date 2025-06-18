import { useState } from 'react';

export default function BookingPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    time: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const startAtISO = new Date(`${form.date}T${form.time}`).toISOString();

    const bookingData = {
      customer: {
        givenName: form.name,
        emailAddress: form.email,
        phoneNumber: form.phone,
      },
      serviceVariationId: form.service,  // map your services to Square serviceVariationId
      startAt: startAtISO,
      locationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    };

    try {
      const res = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Booking confirmed! Thank you.');
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('Failed to book appointment.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <input name="name" placeholder="Name" required onChange={handleChange} />
      <input name="email" type="email" placeholder="Email" required onChange={handleChange} />
      <input name="phone" placeholder="Phone" onChange={handleChange} />
      <select name="service" required onChange={handleChange}>
        <option value="">Select Service</option>
        <option value="SERVICE_VARIATION_ID_1">Scalp Treatment</option>
        <option value="SERVICE_VARIATION_ID_2">Head Massage</option>
        {/* Add your actual Square service variation IDs */}
      </select>
      <input name="date" type="date" required onChange={handleChange} />
      <input name="time" type="time" required onChange={handleChange} />
      <button type="submit" disabled={loading}>
        {loading ? 'Booking...' : 'Book Appointment'}
      </button>
      {message && <p className="mt-2">{message}</p>}
    </form>
  );
}
