import { useMemo, useState } from 'react';
import { allServices } from '../lib/servicesData';

const options = allServices.flatMap((service) => service.variations.map((variation) => ({
  id: variation.id, serviceId: service.id, serviceName: service.name,
  variationName: variation.name, name: `${service.name} — ${variation.name}`, price: variation.price,
  durationMinutes: Math.round(variation.duration / 60000), category: service.category,
})));

const categoryMeta = {
  'Head Spa Treatments': { icon: '✦', description: 'Scalp rituals, steam, cleansing, and deep relaxation' },
  'Body Massage Treatments': { icon: '◌', description: 'Relaxation, deep tissue, and hot stone massage' },
  'Foot Care': { icon: '◇', description: 'Pedicures and restorative foot treatments' },
  'Manicure Services': { icon: '○', description: 'Manicures, polish, and detailed nail care' },
  'Cupping Therapy': { icon: '◎', description: 'Focused cupping treatments for tension and recovery' },
};

const normalizeServiceText = (value = '') => String(value)
  .toLowerCase()
  .replace(/[\u3400-\u9fff]/g, '')
  .replace(/\b(minutes?|mins?|standard)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const initialForm = { name:'', phone:'', email:'', pressure:'medium', focusAreas:'', areasToAvoid:'', allergies:'', sensitivities:'', injuries:'', pregnancy:'', notes:'', sms:false, marketingEmail:false };

export default function CheckIn() {
  const [step,setStep]=useState('lookup'); const [last4,setLast4]=useState(''); const [matches,setMatches]=useState([]); const [customer,setCustomer]=useState(null); const [form,setForm]=useState(initialForm); const [fullPhone,setFullPhone]=useState(''); const [serviceIds,setServiceIds]=useState([]); const [consent,setConsent]=useState(false); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false);
  const services=useMemo(()=>options.filter(o=>serviceIds.includes(o.id)),[serviceIds]);
  const search=async(value=last4)=>{setBusy(true);setStatus('');try{const r=await fetch(`/api/crm/customers?${String(value).replace(/\D/g,'').length===4?'last4':'q'}=${encodeURIComponent(value)}`);const d=await r.json();if(!r.ok)throw new Error(d.error);if(d.requiresFullPhone){setMatches([]);setStep('duplicate');setStatus('More than one guest shares those digits. Enter your full phone number to protect your privacy.');}else if(d.customers.length===1){setMatches(d.customers);setStep('confirm');}else if(d.customers.length>1){setMatches(d.customers);setStep('confirm');}else{setStep('new');setForm(f=>({...f,phone:String(value).replace(/\D/g,'').length>=10?value:''}));}}catch(e){setStatus(e.message)}finally{setBusy(false)}};
  const choose=(c)=>{
    setCustomer(c);
    setForm(f=>({...f,name:c.name||'',phone:c.phone||'',email:c.email||''}));
    if (Array.isArray(c.services) && c.services.length) {
      const matchedIds = options.filter(option=>c.services.some(bookedService=>{
        const bookedVariationId = String(bookedService.serviceVariationId || bookedService.variationId || bookedService.id || '');
        if (bookedVariationId && [option.id, option.serviceId].includes(bookedVariationId)) return true;
        const bookedName = normalizeServiceText(bookedService.serviceName || bookedService.name || bookedService.label);
        const optionServiceName = normalizeServiceText(option.serviceName);
        if (!bookedName) return false;
        const serviceMatches = optionServiceName === bookedName || optionServiceName.includes(bookedName) || bookedName.includes(optionServiceName);
        if (!serviceMatches) return false;
        const durationFromName = Number(String(bookedService.serviceName || bookedService.name || '').match(/\b(\d{2,3})\s*(?:min|minute)/i)?.[1] || 0);
        const rawDuration = Number(bookedService.durationMinutes || bookedService.duration || 0);
        const bookedDuration = rawDuration > 1000 ? Math.round(rawDuration / 60000) : rawDuration || durationFromName;
        return !bookedDuration || bookedDuration === option.durationMinutes;
      })).map(option=>option.id);
      if (matchedIds.length) setServiceIds(matchedIds);
    }
    setStep('details');
  };
  const submit=async(e)=>{e.preventDefault();setStatus('');if(!services.length)return setStatus('Please select at least one service.');setBusy(true);try{const safetyNotes={allergies:form.allergies,sensitivities:form.sensitivities,injuries:form.injuries,pregnancy:form.pregnancy,areasToAvoid:form.areasToAvoid};const r=await fetch('/api/crm/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:customer?.id,bookingId:customer?.bookingId,appointmentAt:customer?.appointmentAt,name:form.name,phone:form.phone,email:form.email,preferences:{pressure:form.pressure,focusAreas:form.focusAreas},safetyNotes,marketingConsent:{sms:form.sms,email:form.marketingEmail},notes:form.notes,services,consent})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCustomer(d.customer);setStep('success')}catch(e){setStatus(e.message)}finally{setBusy(false)}};
  return <div className="checkin-shell"><div className="mx-auto max-w-2xl"><div className="mb-8 text-center"><p className="eyebrow">Welcome to Sister Lavender</p><h1 className="font-display text-4xl text-stone-900">A peaceful arrival starts here.</h1><p className="mt-3 text-stone-600">Check in privately in just a few moments.</p></div>
    <div className="card p-6 sm:p-8">
      {step==='lookup'&&<form onSubmit={e=>{e.preventDefault();search()}} className="space-y-5"><div><label className="label" htmlFor="last4">Last four digits of your phone number</label><input id="last4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" className="field text-center text-3xl tracking-[.5em]" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,''))} placeholder="0000" required/></div><button disabled={busy||last4.length!==4} className="button-primary w-full">{busy?'Looking for your visit…':'Continue'}</button><p className="text-center text-xs text-stone-500">Your full phone number is never shown during this search.</p></form>}
      {step==='duplicate'&&<form onSubmit={e=>{e.preventDefault();search(fullPhone)}} className="space-y-4"><label className="label">Full phone number</label><input className="field" inputMode="tel" value={fullPhone} onChange={e=>setFullPhone(e.target.value)} required/><button className="button-primary w-full">Find my profile</button></form>}
      {step==='confirm'&&<div className="space-y-4"><h2 className="text-xl font-semibold">Is this you?</h2>{matches.map(c=><button key={c.id||c.bookingId} onClick={()=>choose(c)} className="w-full rounded-xl border border-lavender-200 p-4 text-left hover:bg-lavender-50"><b>{c.maskedName}</b><span className="block text-sm text-stone-500">Returning guest · {c.pointsBalance||0} reward points</span></button>)}<button onClick={()=>setStep('new')} className="text-sm underline">None of these — create a profile</button></div>}
      {step==='new'&&<div className="mb-6"><h2 className="text-2xl font-semibold">Welcome, new guest</h2><p className="text-sm text-stone-500">Tell us how to care for you today.</p><button onClick={()=>setStep('details')} className="button-primary mt-4">Continue</button></div>}
      {step==='details'&&<CheckinForm form={form} setForm={setForm} customer={customer} serviceIds={serviceIds} setServiceIds={setServiceIds} consent={consent} setConsent={setConsent} submit={submit} busy={busy}/>} 
      {step==='success'&&<div className="py-8 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-3xl">✓</div><h2 className="font-display text-3xl">You’re checked in.</h2><p className="mt-2 text-stone-600">Please relax. A team member will welcome you shortly.</p>{customer?.pointsBalance!=null&&<p className="mt-5 rounded-xl bg-lavender-50 p-3">Current reward balance: <b>{customer.pointsBalance} points</b></p>}</div>}
      {status&&<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{status}</p>}
    </div></div></div>;
}

function CheckinForm({form,setForm,customer,serviceIds,setServiceIds,consent,setConsent,submit,busy}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const set=(key)=>(e)=>setForm(f=>({...f,[key]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const missingName=!customer||!form.name;
  const missingPhone=!customer||!form.phone;
  const missingEmail=!customer||!form.email;
  const needsContact=missingName||missingPhone||missingEmail;
  const selectedOptions = options.filter(option=>serviceIds.includes(option.id));
  const categories = Array.from(new Set(options.map(option=>option.category)));
  const toggleService = (id) => setServiceIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);

  return <form onSubmit={submit} className="space-y-7">
    <div><h2 className="text-2xl font-semibold">Today’s visit</h2><p className="text-sm text-stone-500">{customer?'Welcome back. Your booked services are already selected below. Only add or remove something if your plans changed.':'Create your private guest profile.'}</p></div>
    {needsContact&&<div className="grid gap-4 sm:grid-cols-2">{missingName&&<Field label="Full name" value={form.name} onChange={set('name')} required/>}{missingPhone&&<Field label="Full phone" value={form.phone} onChange={set('phone')} required/>}{missingEmail&&<Field label="Email" type="email" value={form.email} onChange={set('email')} required/>}</div>}

    <section aria-labelledby="selected-services-heading" className="rounded-2xl border border-[#d9cddd] bg-[#f7f3f8] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Your visit</p><h3 id="selected-services-heading" className="mt-1 text-lg font-semibold text-[#493c4d]">Selected services</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#66516f]">{selectedOptions.length} selected</span></div>
      {selectedOptions.length===0?<p className="mt-4 rounded-xl bg-white p-4 text-sm text-stone-500">No service selected yet. Choose a category below.</p>:<div className="mt-4 space-y-2">{selectedOptions.map(option=><div key={option.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm"><div><b className="block text-sm text-stone-800">{option.serviceName}</b><span className="text-xs text-stone-500">{option.variationName} · {option.durationMinutes} min · ${(option.price/100).toFixed(0)}</span></div><button type="button" onClick={()=>toggleService(option.id)} className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-stone-200 text-lg text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${option.name}`}>×</button></div>)}</div>}
    </section>

    <section aria-labelledby="service-categories-heading">
      <div className="mb-3"><p className="eyebrow">Make a change</p><h3 id="service-categories-heading" className="mt-1 text-lg font-semibold">Browse service categories</h3></div>
      <div className="grid gap-3 sm:grid-cols-2">{categories.map(category=>{const meta=categoryMeta[category]||{icon:'✧',description:'Browse available spa services'};const count=options.filter(option=>option.category===category).length;const selectedCount=selectedOptions.filter(option=>option.category===category).length;const open=activeCategory===category;return <button type="button" key={category} onClick={()=>setActiveCategory(open?null:category)} aria-expanded={open} className={`service-category-button ${open?'service-category-button-active':''}`}><span className="service-category-icon">{meta.icon}</span><span className="min-w-0 flex-1 text-left"><b>{category}</b><small>{meta.description}</small>{selectedCount>0&&<em>{selectedCount} selected</em>}</span><span className="text-xl text-[#806b88]">{open?'−':'+'}</span></button>})}</div>
      {activeCategory&&<div className="service-category-panel"><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-[#493c4d]">{activeCategory}</h4><button type="button" onClick={()=>setActiveCategory(null)} className="text-xs font-semibold text-stone-500 underline">Close</button></div><div className="space-y-2">{options.filter(option=>option.category===activeCategory).map(option=>{const selected=serviceIds.includes(option.id);return <button type="button" key={option.id} onClick={()=>toggleService(option.id)} className={`service-choice ${selected?'service-choice-selected':''}`}><span className="min-w-0 text-left"><b>{option.serviceName}</b><small>{option.variationName} · {option.durationMinutes} min · ${(option.price/100).toFixed(0)}</small></span><span className="service-choice-mark">{selected?'✓':'+'}</span></button>})}</div></div>}
    </section>

    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Pressure preference</span><select className="field" value={form.pressure} onChange={set('pressure')}><option>light</option><option>medium</option><option>firm</option></select></label><Field label="Focus areas" value={form.focusAreas} onChange={set('focusAreas')}/><Field label="Areas to avoid" value={form.areasToAvoid} onChange={set('areasToAvoid')}/><Field label="Allergies" value={form.allergies} onChange={set('allergies')}/><Field label="Skin/scalp sensitivities" value={form.sensitivities} onChange={set('sensitivities')}/><Field label="Injuries or health concerns" value={form.injuries} onChange={set('injuries')}/><label><span className="label">Pregnancy status</span><select className="field" value={form.pregnancy} onChange={set('pregnancy')}><option value="">Not applicable / prefer not to say</option><option>No</option><option>Yes</option></select></label><Field label="Other service preferences" value={form.notes} onChange={set('notes')}/></div>
    <div className="space-y-3 rounded-xl bg-stone-50 p-4 text-sm"><label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>I consent to the selected service and confirm the information above is accurate. <a href="/service-agreement" target="_blank" className="underline">Read agreement</a>.</span></label>{!customer&&<><label className="flex gap-3"><input type="checkbox" checked={form.sms} onChange={set('sms')}/><span>Optional: send me SMS offers.</span></label><label className="flex gap-3"><input type="checkbox" checked={form.marketingEmail} onChange={set('marketingEmail')}/><span>Optional: send me email offers.</span></label></>}</div>
    <button disabled={busy} className="button-primary w-full">{busy?'Checking you in…':'Complete check-in'}</button>
  </form>
}
function Field({label,...props}) { return <label><span className="label">{label}</span><input className="field" {...props}/></label> }
