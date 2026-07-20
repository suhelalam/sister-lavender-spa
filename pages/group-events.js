import { useState } from 'react';
import EditorialPage from '../components/EditorialPage';

const initialForm = {
  name: '', email: '', phone: '', eventDate: '', preferredTime: '',
  guestCount: '', occasion: '', services: '', notes: '',
};

export default function Events() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const update = (event) => setForm((current) => ({
    ...current,
    [event.target.name]: event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const response = await fetch('/api/group-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to send your request.');
      setStatus('sent');
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <EditorialPage eyebrow="Gather beautifully" title="Group spa events" intro="Thoughtful spa time for birthdays, bridal groups, team appreciation, and private celebrations." image="/images/massage.jpg" cta="Plan your event" ctaHref="#group-event-form">
      <h2>A celebration everyone can feel.</h2>
      <p>We coordinate mixed service menus across head spa, massage, nails, and foot care so your group can relax without managing every detail. Availability and minimums vary by group size and date.</p>

      <div id="group-event-form" className="card not-prose mt-10 scroll-mt-28 p-6 md:p-8">
        <p className="eyebrow">Request availability</p>
        <h2 className="mt-2 text-3xl">Tell us about your event</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">This is an inquiry, not a booking. We will review your preferred date and email you when your event is confirmed.</p>

        {status === 'sent' ? (
          <div className="mt-7 rounded-xl bg-[#eef3e9] p-6" role="status">
            <h3 className="text-xl font-semibold text-[#46533f]">Request received</h3>
            <p className="mt-2 text-sm text-stone-700">We emailed you a copy of your request. We’ll send another email after we review and confirm availability.</p>
            <button type="button" className="button-secondary mt-5" onClick={() => setStatus('idle')}>Submit another request</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 grid gap-5 md:grid-cols-2">
            <div><label className="label" htmlFor="name">Full name</label><input className="field" id="name" name="name" value={form.name} onChange={update} autoComplete="name" required /></div>
            <div><label className="label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></div>
            <div><label className="label" htmlFor="phone">Phone</label><input className="field" id="phone" name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" required /></div>
            <div><label className="label" htmlFor="guestCount">Number of guests</label><input className="field" id="guestCount" name="guestCount" type="number" min="2" max="100" value={form.guestCount} onChange={update} required /></div>
            <div><label className="label" htmlFor="eventDate">Preferred date</label><input className="field" id="eventDate" name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} value={form.eventDate} onChange={update} required /></div>
            <div><label className="label" htmlFor="preferredTime">Preferred time</label><input className="field" id="preferredTime" name="preferredTime" type="time" value={form.preferredTime} onChange={update} required /></div>
            <div><label className="label" htmlFor="occasion">Occasion</label><input className="field" id="occasion" name="occasion" value={form.occasion} onChange={update} placeholder="Birthday, bridal event, team outing…" required /></div>
            <div><label className="label" htmlFor="services">Services of interest</label><input className="field" id="services" name="services" value={form.services} onChange={update} placeholder="Head spa, massage, nails…" required /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="notes">Anything else we should know? <span className="font-normal">(optional)</span></label><textarea className="field min-h-28" id="notes" name="notes" value={form.notes} onChange={update} maxLength="2000" /></div>
            {status === 'error' && <p className="md:col-span-2 text-sm text-red-700" role="alert">{message}</p>}
            <div className="md:col-span-2"><button disabled={status === 'sending'} className="button-primary">{status === 'sending' ? 'Sending request…' : 'Request group event'}</button></div>
          </form>
        )}
      </div>
      <p className="mt-8">Prefer to talk first? Call <a href="tel:+13129003131">(312) 900-3131</a> or email <a href="mailto:selena@sisterlavenderspa.com">selena@sisterlavenderspa.com</a>.</p>
    </EditorialPage>
  );
}
