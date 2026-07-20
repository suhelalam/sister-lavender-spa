import { useEffect, useState } from 'react';
import Link from 'next/link';

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (query = '') => {
    setLoading(true); setError('');
    try { const r = await fetch(`/api/admin/crm?q=${encodeURIComponent(query)}${query ? '' : '&sync=1'}`); const d = await r.json(); if (!r.ok) throw new Error(d.error); setCustomers(d.customers || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const open = async (id) => { const r = await fetch(`/api/admin/crm?customerId=${id}`); const d = await r.json(); if (r.ok) setSelected(d); else setError(d.error); };
  const adjustPoints = async () => { const points = prompt('Points to add (use a negative number to redeem/remove):'); if (!points) return; const reason = prompt('Reason for adjustment:') || 'Owner adjustment'; await fetch('/api/admin/crm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action:'points', customerId:selected.customer.id, points:Number(points), reason }) }); open(selected.customer.id); };
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Customer care</p><h1 className="text-3xl font-semibold text-stone-900">Customer profiles</h1></div><Link href="/admin" className="button-secondary">Dashboard</Link></div>
    <form onSubmit={(e)=>{e.preventDefault();load(q)}} className="flex gap-2"><input className="field flex-1" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search name, full phone, last four, or email"/><button className="button-primary">Search</button></form>
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="card divide-y overflow-hidden p-0">{loading ? <p className="p-5">Loading…</p> : customers.map((c)=><button key={c.id} onClick={()=>open(c.id)} className="block w-full p-4 text-left hover:bg-lavender-50"><span className="font-semibold">{c.name || 'Unnamed customer'}</span><span className="mt-1 block text-sm text-stone-500">{c.phone || 'No phone'} · {c.email || 'No email'}</span></button>)}</section>
      <section className="card">{!selected ? <p className="text-stone-500">Select a customer to see visits, payments, safety preferences, and points.</p> : <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-semibold">{selected.customer.name}</h2><p className="text-stone-500">{selected.customer.phone} · {selected.customer.email}</p><p className={`mt-2 text-xs font-bold uppercase tracking-wide ${selected.customer.rewards?.enrolled ? 'text-green-700' : 'text-stone-500'}`}>{selected.customer.rewards?.enrolled ? 'Lavender Rewards member' : 'Not enrolled in rewards'}</p></div><button onClick={adjustPoints} className="button-secondary">Adjust points</button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Visits" value={selected.customer.totalVisits||0}/><Stat label="Spent" value={money(selected.customer.totalSpentCents)}/><Stat label="Average" value={money(selected.customer.totalVisits ? selected.customer.totalSpentCents/selected.customer.totalVisits : 0)}/><Stat label="Points" value={selected.customer.pointsBalance||0}/></div>
        <div><h3 className="font-semibold">Safety & preferences</h3><p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm">{Object.entries(selected.customer.safetyNotes||{}).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'No safety notes recorded.'}</p></div>
        <div><h3 className="font-semibold">Visit history</h3><div className="mt-2 space-y-2">{selected.visits.map(v=><div key={v.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><b>{(v.serviceNames||[]).join(', ') || 'Spa visit'}</b><span>{String(v.checkedInAt||'').slice(0,10)}</span></div><p className="text-stone-500">{v.status} · {v.staffName||'Unassigned'} · {v.room||'No station'} · {money(v.amountPaidCents)}</p></div>)}</div></div>
        <div><h3 className="font-semibold">Points history</h3><div className="mt-2 space-y-1 text-sm">{selected.points.map(p=><p key={p.id}>{String(p.createdAt||'').slice(0,10)} · {p.points>0?'+':''}{p.points} · {p.reason}</p>)}</div></div>
      </div>}</section>
    </div>
  </div>;
}
function Stat({label,value}) { return <div className="rounded-xl bg-lavender-50 p-3"><span className="block text-xs uppercase tracking-wide text-stone-500">{label}</span><b className="text-xl">{value}</b></div> }
