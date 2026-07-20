import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ConfirmGroupEvent() {
  const router = useRouter();
  const { id, token } = router.query;
  const [state, setState] = useState({ loading: true, busy: false, error: '', data: null, confirmed: false });

  useEffect(() => {
    if (!router.isReady) return;
    fetch(`/api/group-events/confirm?id=${encodeURIComponent(id || '')}&token=${encodeURIComponent(token || '')}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setState((current) => ({ ...current, loading: false, data: payload.inquiry, confirmed: payload.status === 'confirmed' }));
      })
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, [router.isReady, id, token]);

  const confirm = async () => {
    setState((current) => ({ ...current, busy: true, error: '' }));
    try {
      const response = await fetch('/api/group-events/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setState((current) => ({ ...current, busy: false, confirmed: true }));
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: error.message }));
    }
  };

  return <main className="checkin-shell"><div className="card mx-auto max-w-xl p-7 md:p-10">
    <p className="eyebrow">Group event review</p>
    {state.loading ? <p className="mt-5">Loading inquiry…</p> : state.error && !state.data ? <p className="mt-5 text-red-700" role="alert">{state.error}</p> : state.confirmed ? <div role="status"><h1 className="mt-3 font-display text-4xl text-[#423846]">Event confirmed</h1><p className="mt-4 text-stone-600">The customer has been emailed their confirmation. This link cannot be used again.</p></div> : <>
      <h1 className="mt-3 font-display text-4xl text-[#423846]">Confirm availability?</h1>
      <div className="mt-6 rounded-xl bg-[#f4efe7] p-5 text-sm leading-7">
        <strong>{state.data?.name}</strong><br />{state.data?.eventWhen}<br />{state.data?.guestCount} guests · {state.data?.occasion}<br />Services: {state.data?.services}
      </div>
      <p className="mt-5 text-sm text-stone-600">Only click confirm after checking that the requested date and time are available. This immediately emails the customer.</p>
      {state.error && <p className="mt-4 text-sm text-red-700" role="alert">{state.error}</p>}
      <button type="button" disabled={state.busy} onClick={confirm} className="button-primary mt-6">{state.busy ? 'Confirming…' : 'Confirm event and email customer'}</button>
    </>}
  </div></main>;
}
