import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, LockKeyhole, Phone, RotateCcw, Sparkles } from 'lucide-react';
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

const initialForm = { name:'', phone:'', email:'', pressure:'medium', focusAreas:'', areasToAvoid:'', allergies:'', sensitivities:'', injuries:'', pregnancy:'', notes:'', promotionalOffers:false, joinRewards:false };
const SUCCESS_RESET_SECONDS = 8;
const INACTIVITY_RESET_MS = 2 * 60 * 1000;

export default function CheckIn() {
  const [step,setStep]=useState('lookup'); const [last4,setLast4]=useState(''); const [matches,setMatches]=useState([]); const [customer,setCustomer]=useState(null); const [form,setForm]=useState(initialForm); const [fullPhone,setFullPhone]=useState(''); const [serviceIds,setServiceIds]=useState([]); const [consent,setConsent]=useState(false); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false); const [resetCountdown,setResetCountdown]=useState(SUCCESS_RESET_SECONDS);
  const services=useMemo(()=>options.filter(o=>serviceIds.includes(o.id)),[serviceIds]);
  const resetKiosk=useCallback(()=>{
    setStep('lookup');setLast4('');setMatches([]);setCustomer(null);setForm(initialForm);setFullPhone('');setServiceIds([]);setConsent(false);setStatus('');setBusy(false);setResetCountdown(SUCCESS_RESET_SECONDS);
    if (typeof window !== 'undefined') window.scrollTo({top:0,behavior:'smooth'});
  },[]);
  useEffect(()=>{
    if(step!=='success')return undefined;
    setResetCountdown(SUCCESS_RESET_SECONDS);
    const interval=window.setInterval(()=>setResetCountdown(value=>Math.max(0,value-1)),1000);
    const timeout=window.setTimeout(resetKiosk,SUCCESS_RESET_SECONDS*1000);
    return()=>{window.clearInterval(interval);window.clearTimeout(timeout)};
  },[step,resetKiosk]);
  useEffect(()=>{
    if(step==='lookup'||step==='success')return undefined;
    let timeout;
    const restart=()=>{window.clearTimeout(timeout);timeout=window.setTimeout(resetKiosk,INACTIVITY_RESET_MS)};
    const events=['pointerdown','keydown','input','scroll'];
    events.forEach(event=>window.addEventListener(event,restart,{passive:true}));
    restart();
    return()=>{window.clearTimeout(timeout);events.forEach(event=>window.removeEventListener(event,restart))};
  },[step,resetKiosk]);
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
  const submit=async(e)=>{e.preventDefault();setStatus('');if(!services.length)return setStatus('Please select at least one service.');setBusy(true);try{const safetyNotes={allergies:form.allergies,sensitivities:form.sensitivities,injuries:form.injuries,pregnancy:form.pregnancy,areasToAvoid:form.areasToAvoid};const r=await fetch('/api/crm/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:customer?.id,bookingId:customer?.bookingId,appointmentAt:customer?.appointmentAt,name:form.name,phone:form.phone,email:form.email,preferences:{pressure:form.pressure,focusAreas:form.focusAreas},safetyNotes,marketingConsent:{promotionalOffers:form.promotionalOffers,sms:form.promotionalOffers,email:form.promotionalOffers},rewards:{enrolled:form.joinRewards},notes:form.notes,services,consent})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCustomer(d.customer);setStep('success')}catch(e){setStatus(e.message)}finally{setBusy(false)}};
  const goBack=()=>{setStatus('');if(step==='details')setStep(customer?'confirm':'new');else setStep('lookup')};
  return <div className="checkin-shell"><div className="mx-auto max-w-3xl">
    <header className="checkin-kiosk-header"><div className="checkin-kiosk-mark"><Sparkles size={22}/></div><div><b>Sister Lavender</b><span>Guest check-in</span></div></header>
    {step!=='success'&&<div className="mb-7 text-center"><p className="eyebrow">Welcome</p><h1 className="font-display text-4xl text-stone-900 sm:text-5xl">{step==='lookup'?'Ready to check in?':'Let’s get you settled.'}</h1><p className="mt-3 text-stone-600">{step==='lookup'?'It only takes a moment.':'Your information stays private and is cleared after check-in.'}</p></div>}
    <div className="checkin-kiosk-card">
      {step!=='lookup'&&step!=='success'&&<button type="button" onClick={goBack} className="checkin-back"><ChevronLeft size={20}/> Back</button>}
      {step==='lookup'&&<form onSubmit={e=>{e.preventDefault();search()}} className="mx-auto max-w-md space-y-6"><div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eee7f0] text-[#66516f]"><Phone size={25}/></div><label className="text-lg font-semibold text-stone-800" htmlFor="last4">Enter the last 4 digits of your phone</label><input autoFocus id="last4" aria-describedby="phone-privacy" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" className="checkin-pin" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,''))} placeholder="••••" required/></div><button disabled={busy||last4.length!==4} className="checkin-primary">{busy?'Finding your visit…':'Start check-in'}</button><p id="phone-privacy" className="flex items-center justify-center gap-2 text-center text-sm text-stone-500"><LockKeyhole size={15}/> We only use these digits to find your visit.</p></form>}
      {step==='duplicate'&&<form onSubmit={e=>{e.preventDefault();search(fullPhone)}} className="mx-auto max-w-md space-y-5"><div><h2 className="text-center font-display text-3xl">One more step</h2><p className="mt-2 text-center text-stone-600">More than one guest shares those digits. Enter your full phone number.</p></div><label className="label">Full phone number</label><input autoFocus className="field checkin-touch-field" inputMode="tel" autoComplete="tel" value={fullPhone} onChange={e=>setFullPhone(e.target.value)} required/><button disabled={busy} className="checkin-primary">{busy?'Finding your visit…':'Find my visit'}</button></form>}
      {step==='confirm'&&<div className="mx-auto max-w-lg space-y-4"><div className="text-center"><h2 className="font-display text-3xl">Is this you?</h2><p className="mt-2 text-stone-500">Tap your name to continue.</p></div>{matches.map(c=><button key={c.id||c.bookingId} onClick={()=>choose(c)} className="checkin-person"><span className="checkin-person-icon">{String(c.maskedName||'G').charAt(0)}</span><span><b>{c.maskedName}</b><small>Returning guest{c.pointsBalance?` · ${c.pointsBalance} reward points`:''}</small></span><span className="ml-auto text-2xl text-[#806b88]">›</span></button>)}<button onClick={()=>{setCustomer(null);setStep('new')}} className="checkin-secondary">I don’t see my name</button></div>}
      {step==='new'&&<div className="mx-auto max-w-md py-4 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e7ece3] text-[#53604e]"><Sparkles size={28}/></div><h2 className="font-display text-3xl">Welcome, new guest</h2><p className="mt-3 text-stone-600">We’ll create your profile and learn what will make today’s visit comfortable.</p><button onClick={()=>setStep('details')} className="checkin-primary mt-7">Continue</button></div>}
      {step==='details'&&<CheckinForm form={form} setForm={setForm} customer={customer} serviceIds={serviceIds} setServiceIds={setServiceIds} consent={consent} setConsent={setConsent} submit={submit} busy={busy}/>} 
      {step==='success'&&<div className="py-8 text-center sm:py-14"><div className="checkin-success-icon"><Check size={40}/></div><p className="eyebrow">All set</p><h2 className="mt-2 font-display text-4xl">You’re checked in.</h2><p className="mt-3 text-lg text-stone-600">Please relax. A team member will welcome you shortly.</p>{customer?.pointsBalance!=null&&<p className="mx-auto mt-6 max-w-sm rounded-2xl bg-lavender-50 p-4">Current reward balance: <b>{customer.pointsBalance} points</b></p>}<button type="button" onClick={resetKiosk} className="checkin-secondary mx-auto mt-8 max-w-sm"><RotateCcw size={18}/> Check in another guest</button><p className="mt-4 text-sm text-stone-400">Returning to the welcome screen in {resetCountdown} seconds</p></div>}
      {status&&<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{status}</p>}
    </div></div></div>;
}

function CheckinForm({form,setForm,customer,serviceIds,setServiceIds,consent,setConsent,submit,busy}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const set=(key)=>(e)=>setForm(f=>({...f,[key]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const missingName=!customer||!form.name;
  const missingPhone=!customer||!form.phone;
  const needsContact=missingName||missingPhone;
  const selectedOptions = options.filter(option=>serviceIds.includes(option.id));
  const categories = Array.from(new Set(options.map(option=>option.category)));
  const toggleService = (id) => setServiceIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);

  return <form onSubmit={submit} className="space-y-7">
    <div><p className="eyebrow">Final step</p><h2 className="mt-1 font-display text-3xl">Today’s visit</h2><p className="mt-2 text-sm text-stone-500">{customer?'Your booked services are selected. Review them, share anything we should know, then check in.':'Add your contact details and choose today’s service.'}</p></div>
    {needsContact&&<div className="grid gap-4 sm:grid-cols-2">{missingName&&<Field label="Full name" value={form.name} onChange={set('name')} required/>}{missingPhone&&<Field label="Full phone" value={form.phone} onChange={set('phone')} required/>}<Field label="Email (optional)" type="email" value={form.email} onChange={set('email')}/></div>}

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
    <div className="space-y-4 rounded-xl bg-stone-50 p-4 text-sm"><label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>I consent to the selected service and confirm the information above is accurate. <a href="/service-agreement" target="_blank" className="underline">Read agreement</a>.</span></label>{!customer&&<><label className="flex gap-3 rounded-xl border border-[#d9cddd] bg-white p-3"><input type="checkbox" checked={form.joinRewards} onChange={set('joinRewards')}/><span><strong className="block text-[#493c4d]">Join Lavender Rewards</strong><span className="mt-1 block text-xs text-stone-600">Earn 1 point for every eligible service dollar paid. Membership is free.</span></span></label><label className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.promotionalOffers} onChange={set('promotionalOffers')}/><span><strong className="block">Send me special offers</strong><span className="mt-1 block text-xs text-stone-600">Receive occasional promotional emails and text messages. You can unsubscribe at any time.</span></span></label></>}</div>
    <button disabled={busy} className="checkin-primary">{busy?'Checking you in…':'Complete check-in'}</button>
  </form>
}
function Field({label,...props}) { return <label><span className="label">{label}</span><input className="field" {...props}/></label> }
