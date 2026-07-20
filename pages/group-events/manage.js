import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ManageGroupEvent() {
  const router = useRouter();
  const { id, token } = router.query;
  const [event, setEvent] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [state, setState] = useState({ loading: true, busy: '', error: '', success: '' });

  useEffect(() => {
    if (!router.isReady) return;
    fetch(`/api/group-events/manage?id=${encodeURIComponent(id || '')}&token=${encodeURIComponent(token || '')}`)
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload; })
      .then(({ event: value }) => { setEvent(value); setDate(value.eventDate); setTime(value.preferredTime); setState((s) => ({ ...s, loading: false })); })
      .catch((error) => setState((s) => ({ ...s, loading: false, error: error.message })));
  }, [router.isReady, id, token]);

  const request = async (method) => {
    setState((s) => ({ ...s, busy: method, error: '', success: '' }));
    try {
      const response = await fetch('/api/group-events/manage', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token, eventDate: date, preferredTime: time }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      if (method === 'DELETE') {
        setEvent((value) => ({ ...value, status: 'canceled' }));
        setState((s) => ({ ...s, busy: '', success: 'The event was canceled, removed from Google Calendar, and the customer was emailed.' }));
      } else {
        setEvent((value) => ({ ...value, eventDate: date, preferredTime: time, eventWhen: payload.eventWhen }));
        setState((s) => ({ ...s, busy: '', success: 'The event was updated in Google Calendar and the customer was emailed.' }));
      }
    } catch (error) { setState((s) => ({ ...s, busy: '', error: error.message })); }
  };

  return <main className="checkin-shell px-4"><div className="card mx-auto max-w-2xl p-6 md:p-9">
    <p className="eyebrow">Group event</p><h1 className="mt-2 font-display text-4xl text-[#423846]">Manage event</h1>
    {state.loading ? <p className="mt-6">Loading event…</p> : !event ? <p className="mt-6 text-red-700">{state.error}</p> : <>
      <div className="mt-6 rounded-xl bg-[#f4efe7] p-5 text-sm leading-7"><strong>{event.name}</strong><br />{event.eventWhen}<br />{event.guestCount} guests · {event.occasion}<br />Services: {event.services}<br />Status: {event.status}</div>
      {event.status === 'confirmed' && <>
        <section id="update" className="mt-7 scroll-mt-28 rounded-xl border border-[#ded3e0] bg-[#f8f4f9] p-5"><h2 className="font-display text-2xl text-[#423846]">Update event time</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="event-date">Date</label><input id="event-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><label className="label" htmlFor="event-time">Time</label><input id="event-time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /></div></div><button type="button" disabled={Boolean(state.busy)} onClick={() => request('PUT')} className="button-primary mt-5">{state.busy === 'PUT' ? 'Updating…' : 'Update event'}</button></section>
        <section id="cancel" className="mt-7 scroll-mt-28 border-t border-stone-200 pt-6"><h2 className="font-display text-2xl text-[#423846]">Cancel event</h2><p className="mt-2 text-sm text-stone-600">This removes the event from Google Calendar and immediately emails the customer.</p><button type="button" disabled={Boolean(state.busy)} onClick={() => window.confirm('Cancel this confirmed group event?') && request('DELETE')} className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">{state.busy === 'DELETE' ? 'Canceling…' : 'Cancel group event'}</button></section>
      </>}
      {state.error && <p className="mt-5 text-sm text-red-700" role="alert">{state.error}</p>}{state.success && <p className="mt-5 rounded-xl bg-[#eef3e9] p-4 text-sm text-[#46533f]" role="status">{state.success}</p>}
    </>}
  </div></main>;
}
