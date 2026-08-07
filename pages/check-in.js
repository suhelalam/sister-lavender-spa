import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, LockKeyhole, Phone, RotateCcw, Sparkles } from 'lucide-react';
import { allServices } from '../lib/servicesData';
import { useServices } from '../context/ServicesContext';

const buildServiceOptions = (catalog = []) => catalog
  .filter((service) => !service.isAddOn || service.appliesToCategory)
  .flatMap((service) => (service.variations || []).map((variation) => ({
  id: variation.id, serviceId: service.id, serviceName: service.name,
  variationName: variation.name, name: `${service.name} — ${variation.name}`, price: variation.price,
  durationMinutes: Math.round(variation.duration / 60000),
  category: service.isAddOn ? service.appliesToCategory : service.category,
  isAddOn: Boolean(service.isAddOn),
  description: service.description || '',
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

const bookedServiceMatchesOption = (bookedService, option) => {
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
};

const initialForm = { name:'', phone:'', email:'', notes:'', promotionalOffers:false, joinRewards:false };
const SUCCESS_RESET_SECONDS = 8;
const INACTIVITY_RESET_MS = 2 * 60 * 1000;
const spanish = {
  'Guest check-in':'Registro de clientes','Welcome':'Bienvenido','Ready to check in?':'¿Listo para registrarse?','Let’s get you settled.':'Vamos a prepararle.','It only takes a moment.':'Solo toma un momento.','Your information stays private and is cleared after check-in.':'Su información permanece privada y se borra después del registro.','Back':'Atrás',
  'Have an appointment today?':'¿Tiene una cita hoy?','Enter the last 4 digits of your phone to find it.':'Ingrese los últimos 4 dígitos de su teléfono para encontrarla.','Finding your appointment…':'Buscando su cita…','Find my appointment':'Buscar mi cita','We only use these digits to find today’s appointment.':'Solo usamos estos dígitos para encontrar la cita de hoy.','or':'o','Walk-in / No appointment':'Sin cita / No tengo cita',
  'Find your saved profile':'Buscar su perfil guardado','Enter the last 4 digits of your phone.':'Ingrese los últimos 4 dígitos de su teléfono.','Finding your profile…':'Buscando su perfil…','Find my profile':'Buscar mi perfil','One more step':'Un paso más','More than one guest shares those digits. Enter your full phone number.':'Más de un cliente comparte esos dígitos. Ingrese su número de teléfono completo.','Full phone number':'Número de teléfono completo','Finding your visit…':'Buscando su visita…','Find my visit':'Buscar mi visita',
  'Choose today’s appointment':'Elija la cita de hoy','Is this you?':'¿Es usted?','Tap to continue with your visit.':'Toque para continuar con su visita.','Today’s appointment':'Cita de hoy','Returning walk-in':'Cliente recurrente sin cita','reward points':'puntos de recompensa','I don’t see my name':'No veo mi nombre',
  'Walk-in check-in':'Registro sin cita','Returning guests can find their saved profile. New guests can create one or continue without saving.':'Los clientes recurrentes pueden buscar su perfil guardado. Los clientes nuevos pueden crear uno o continuar sin guardar.','I’m a returning guest':'Soy cliente recurrente','Create a new profile':'Crear un perfil nuevo','Continue without a profile':'Continuar sin perfil',
  'All set':'Todo listo','You’re checked in.':'Su registro está completo.','Please relax. A team member will welcome you shortly.':'Relájese. Un miembro del equipo le atenderá pronto.','Current reward balance:':'Saldo actual de recompensas:','points':'puntos','Check in another guest':'Registrar a otro cliente','Returning to the welcome screen in':'Regresando a la pantalla de bienvenida en','seconds':'segundos',
  'Please select at least one service.':'Seleccione al menos un servicio.','More than one guest shares those digits. Enter your full phone number to protect your privacy.':'Más de un cliente comparte esos dígitos. Ingrese su número completo para proteger su privacidad.','No saved profile was found. Go back to continue as a new guest.':'No encontramos un perfil guardado. Regrese para continuar como cliente nuevo.','No appointment was found for today. If you are visiting without an appointment, tap “Walk-in / No appointment” below.':'No encontramos una cita para hoy. Si viene sin cita, toque “Sin cita / No tengo cita” abajo.',
  'Final step':'Último paso','Today’s visit':'Visita de hoy','Your booked services are selected. Review them, share anything we should know, then check in.':'Sus servicios reservados están seleccionados. Revíselos, comparta lo que debamos saber y complete el registro.','Tell us your name and choose today’s service. This visit will not create a saved profile.':'Díganos su nombre y elija el servicio de hoy. Esta visita no creará un perfil guardado.','Add your contact details and choose today’s service.':'Agregue sus datos de contacto y elija el servicio de hoy.','Full name':'Nombre completo','Full phone':'Teléfono completo','Email (optional)':'Correo electrónico (opcional)',
  'Your visit':'Su visita','Selected services':'Servicios seleccionados','selected':'seleccionados','No service selected yet. Choose a category below.':'Aún no ha seleccionado un servicio. Elija una categoría abajo.','each':'cada uno','Make a change':'Hacer un cambio','Browse service categories':'Explorar categorías de servicios','options':'opciones','Service category':'Categoría de servicio','Search':'Buscar','Add-ons':'Servicios adicionales','Select a main service from this category first':'Seleccione primero un servicio principal de esta categoría','Services':'Servicios','No matching services':'No hay servicios coincidentes','Clear search':'Borrar búsqueda','Done':'Listo','Select a main service first':'Seleccione primero un servicio principal',
  'Notes':'Notas','Please tell us about pressure preferences, focus areas, areas to avoid, allergies, sensitivities, injuries, pregnancy, or anything else your provider should know.':'Cuéntenos sobre preferencias de presión, áreas de enfoque o a evitar, alergias, sensibilidades, lesiones, embarazo o cualquier otra información que su proveedor deba saber.','Type any preferences, sensitivities, or health concerns here…':'Escriba aquí sus preferencias, sensibilidades o inquietudes de salud…','I consent to the selected service and confirm the information above is accurate.':'Acepto el servicio seleccionado y confirmo que la información anterior es correcta.','Read agreement':'Leer el acuerdo','Join Lavender Rewards':'Unirse a Lavender Rewards','Earn 1 point for every eligible service dollar paid. Membership is free.':'Gane 1 punto por cada dólar elegible pagado en servicios. La membresía es gratis.','Send me special offers':'Envíenme ofertas especiales','Receive occasional promotional emails and text messages. You can unsubscribe at any time.':'Reciba ocasionalmente correos y mensajes promocionales. Puede cancelar en cualquier momento.','Checking you in…':'Completando su registro…','Complete check-in':'Completar registro','min':'min',
  'Head Spa Treatments':'Tratamientos de spa para la cabeza','Body Massage Treatments':'Tratamientos de masaje corporal','Body Harmony':'Armonía corporal','Foot Care':'Cuidado de los pies','Manicure Services':'Servicios de manicura','Cupping Therapy':'Terapia con ventosas','Side-by-Side Services':'Servicios para dos','Other Services':'Otros servicios','Standard':'Estándar',
};

export default function CheckIn() {
  const [language,setLanguage]=useState('en');
  const t=useCallback((text)=>language==='es'?(spanish[text]||text):text,[language]);
  const { activeServices } = useServices();
  // Bookings use the live Firestore catalog. The static list is only a fallback
  // while that catalog loads or if it is unavailable.
  const options = useMemo(
    () => buildServiceOptions(activeServices?.length ? activeServices : allServices),
    [activeServices]
  );
  const [step,setStep]=useState('lookup'); const [last4,setLast4]=useState(''); const [matches,setMatches]=useState([]); const [customer,setCustomer]=useState(null); const [form,setForm]=useState(initialForm); const [fullPhone,setFullPhone]=useState(''); const [serviceIds,setServiceIds]=useState([]); const [serviceQuantities,setServiceQuantities]=useState({}); const [consent,setConsent]=useState(false); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false); const [resetCountdown,setResetCountdown]=useState(SUCCESS_RESET_SECONDS); const [skipProfile,setSkipProfile]=useState(false); const [lookupMode,setLookupMode]=useState('appointment');
  const services=useMemo(()=>options.filter(o=>serviceIds.includes(o.id)).map(option=>({...option,quantity:Math.max(1,Number(serviceQuantities[option.id]||1))})),[options,serviceIds,serviceQuantities]);
  const resetKiosk=useCallback(()=>{
    setStep('lookup');setLast4('');setMatches([]);setCustomer(null);setForm(initialForm);setFullPhone('');setServiceIds([]);setServiceQuantities({});setConsent(false);setStatus('');setBusy(false);setResetCountdown(SUCCESS_RESET_SECONDS);setSkipProfile(false);setLookupMode('appointment');
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
  const search=async(value=last4)=>{setBusy(true);setStatus('');try{const digits=String(value).replace(/\D/g,'');const profileQuery=lookupMode==='walkin'?'profilesOnly=1&':'';const r=await fetch(`/api/crm/customers?${profileQuery}${digits.length===4?'last4':'q'}=${encodeURIComponent(value)}`);const d=await r.json();if(!r.ok)throw new Error(d.error);if(d.requiresFullPhone&&(lookupMode==='walkin'||d.hasTodaysAppointment)){setMatches([]);setStep('duplicate');setStatus(t('More than one guest shares those digits. Enter your full phone number to protect your privacy.'));}else if(lookupMode==='walkin'&&d.customers.length){setMatches(d.customers);setStep('confirm');}else if(lookupMode==='appointment'&&d.hasTodaysAppointment&&d.customers.length){setMatches(d.customers);setStep('confirm');}else{setMatches([]);setStatus(t(lookupMode==='walkin'?'No saved profile was found. Go back to continue as a new guest.':'No appointment was found for today. If you are visiting without an appointment, tap “Walk-in / No appointment” below.'));}}catch(e){setStatus(language==='es'?'No pudimos realizar la búsqueda. Solicite ayuda en la recepción.':e.message)}finally{setBusy(false)}};
  const startWalkIn=()=>{setStatus('');setMatches([]);setCustomer(null);setForm(initialForm);setServiceIds([]);setServiceQuantities({});setSkipProfile(false);setLookupMode('walkin');setStep('new')};
  const startReturningWalkIn=()=>{setStatus('');setLast4('');setFullPhone('');setLookupMode('walkin');setStep('walkinLookup')};
  const choose=(c)=>{
    setCustomer(c);
    setForm(f=>({...f,name:c.name||'',phone:c.phone||'',email:c.email||''}));
    if (Array.isArray(c.services) && c.services.length) {
      const matchedOptions = options.filter(option=>c.services.some(bookedService=>bookedServiceMatchesOption(bookedService,option)));
      if (matchedOptions.length) {
        setServiceIds(matchedOptions.map(option=>option.id));
        setServiceQuantities(Object.fromEntries(matchedOptions.map(option=>[
          option.id,
          c.services.filter(bookedService=>bookedServiceMatchesOption(bookedService,option)).reduce((sum,bookedService)=>sum+Math.max(1,Number(bookedService.quantity||1)),0),
        ])));
      }
    }
    setStep('details');
  };
  const submit=async(e)=>{e.preventDefault();setStatus('');if(!services.length)return setStatus(t('Please select at least one service.'));setBusy(true);try{const r=await fetch('/api/crm/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:customer?.id,bookingId:customer?.bookingId,appointmentAt:customer?.appointmentAt,name:form.name,phone:form.phone,email:form.email,skipProfile,marketingConsent:{promotionalOffers:form.promotionalOffers,sms:form.promotionalOffers,email:form.promotionalOffers},rewards:{enrolled:form.joinRewards},notes:form.notes,services,consent})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCustomer(d.customer);setStep('success')}catch(e){setStatus(language==='es'?'No pudimos completar el registro. Solicite ayuda en la recepción.':e.message)}finally{setBusy(false)}};
  const goBack=()=>{setStatus('');if(step==='details')setStep(customer?'confirm':'new');else if(step==='confirm'&&lookupMode==='walkin')setStep('walkinLookup');else if(step==='duplicate'&&lookupMode==='walkin')setStep('walkinLookup');else if(step==='walkinLookup')setStep('new');else setStep('lookup')};
  return <div className="checkin-shell"><div className="mx-auto max-w-3xl">
    <div className="mb-5 flex items-center justify-between gap-4"><header className="checkin-kiosk-header !mb-0 !justify-start"><div className="checkin-kiosk-mark"><Sparkles size={22}/></div><div><b>Sister Lavender Spa</b><span>{t('Guest check-in')}</span></div></header><div className="flex rounded-full border border-purple-200 bg-white p-1 shadow-sm" aria-label="Language"><button type="button" onClick={()=>setLanguage('en')} className={`rounded-full px-4 py-2 text-sm font-bold ${language==='en'?'bg-purple-700 text-white':'text-purple-700'}`}>English</button><button type="button" onClick={()=>setLanguage('es')} className={`rounded-full px-4 py-2 text-sm font-bold ${language==='es'?'bg-purple-700 text-white':'text-purple-700'}`}>Español</button></div></div>
    {step!=='success'&&<div className="mb-7 text-center"><p className="eyebrow">{t('Welcome')}</p><h1 className="font-display text-4xl text-stone-900 sm:text-5xl">{t(step==='lookup'?'Ready to check in?':'Let’s get you settled.')}</h1><p className="mt-3 text-stone-600">{t(step==='lookup'?'It only takes a moment.':'Your information stays private and is cleared after check-in.')}</p></div>}
    <div className="checkin-kiosk-card">
      {step!=='lookup'&&step!=='success'&&<button type="button" onClick={goBack} className="checkin-back"><ChevronLeft size={20}/> {t('Back')}</button>}
      {step==='lookup'&&<div className="mx-auto max-w-md"><form onSubmit={e=>{e.preventDefault();search()}} className="space-y-6"><div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eee7f0] text-[#66516f]"><Phone size={25}/></div><label className="text-lg font-semibold text-stone-800" htmlFor="last4">{t('Have an appointment today?')}</label><p className="mt-1 text-sm text-stone-500">{t('Enter the last 4 digits of your phone to find it.')}</p><input autoFocus id="last4" aria-describedby="phone-privacy" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" className="checkin-pin" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,''))} placeholder="••••" required/></div><button disabled={busy||last4.length!==4} className="checkin-primary">{busy?t('Finding your appointment…'):t('Find my appointment')}</button><p id="phone-privacy" className="flex items-center justify-center gap-2 text-center text-sm text-stone-500"><LockKeyhole size={15}/> {t('We only use these digits to find today’s appointment.')}</p></form><div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-stone-400"><span className="h-px flex-1 bg-stone-200"/><span>{t('or')}</span><span className="h-px flex-1 bg-stone-200"/></div><button type="button" onClick={startWalkIn} className="checkin-secondary">{t('Walk-in / No appointment')}</button></div>}
      {step==='walkinLookup'&&<form onSubmit={e=>{e.preventDefault();search()}} className="mx-auto max-w-md space-y-6"><div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eee7f0] text-[#66516f]"><Phone size={25}/></div><label className="text-lg font-semibold text-stone-800" htmlFor="walkin-last4">{t('Find your saved profile')}</label><p className="mt-1 text-sm text-stone-500">{t('Enter the last 4 digits of your phone.')}</p><input autoFocus id="walkin-last4" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" className="checkin-pin" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,''))} placeholder="••••" required/></div><button disabled={busy||last4.length!==4} className="checkin-primary">{busy?t('Finding your profile…'):t('Find my profile')}</button></form>}
      {step==='duplicate'&&<form onSubmit={e=>{e.preventDefault();search(fullPhone)}} className="mx-auto max-w-md space-y-5"><div><h2 className="text-center font-display text-3xl">{t('One more step')}</h2><p className="mt-2 text-center text-stone-600">{t('More than one guest shares those digits. Enter your full phone number.')}</p></div><label className="label">{t('Full phone number')}</label><input autoFocus className="field checkin-touch-field" inputMode="tel" autoComplete="tel" value={fullPhone} onChange={e=>setFullPhone(e.target.value)} required/><button disabled={busy} className="checkin-primary">{busy?t('Finding your visit…'):t('Find my visit')}</button></form>}
      {step==='confirm'&&<div className="mx-auto max-w-lg space-y-4"><div className="text-center"><h2 className="font-display text-3xl">{t(matches.some(c=>c.bookingId)?'Choose today’s appointment':'Is this you?')}</h2><p className="mt-2 text-stone-500">{t('Tap to continue with your visit.')}</p></div>{matches.map(c=><button key={c.bookingId||c.id} onClick={()=>choose(c)} className="checkin-person"><span className="checkin-person-icon">{String(c.maskedName||'G').charAt(0)}</span><span><b>{c.maskedName}</b><small>{c.bookingId?`${t('Today’s appointment')}${c.services?.length?` · ${c.services.length} ${t('Services').toLowerCase()}`:''}`:`${t('Returning walk-in')}${c.pointsBalance?` · ${c.pointsBalance} ${t('reward points')}`:''}`}</small></span><span className="ml-auto text-2xl text-[#806b88]">›</span></button>)}<button onClick={()=>{setCustomer(null);setStep('new')}} className="checkin-secondary">{t('I don’t see my name')}</button></div>}
      {step==='new'&&<div className="mx-auto max-w-md py-4 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e7ece3] text-[#53604e]"><Sparkles size={28}/></div><h2 className="font-display text-3xl">{t('Walk-in check-in')}</h2><p className="mt-3 text-stone-600">{t('Returning guests can find their saved profile. New guests can create one or continue without saving.')}</p><button onClick={startReturningWalkIn} className="checkin-primary mt-7">{t('I’m a returning guest')}</button><button onClick={()=>{setSkipProfile(false);setStep('details')}} className="checkin-secondary mt-3">{t('Create a new profile')}</button><button onClick={()=>{setSkipProfile(true);setStep('details')}} className="mt-4 text-sm font-bold text-[#66516f] underline underline-offset-4">{t('Continue without a profile')}</button></div>}
      {step==='details'&&<CheckinForm t={t} options={options} form={form} setForm={setForm} customer={customer} skipProfile={skipProfile} serviceIds={serviceIds} setServiceIds={setServiceIds} serviceQuantities={serviceQuantities} setServiceQuantities={setServiceQuantities} consent={consent} setConsent={setConsent} submit={submit} busy={busy}/>}
      {step==='success'&&<div className="py-8 text-center sm:py-14"><div className="checkin-success-icon"><Check size={40}/></div><p className="eyebrow">{t('All set')}</p><h2 className="mt-2 font-display text-4xl">{t('You’re checked in.')}</h2><p className="mt-3 text-lg text-stone-600">{t('Please relax. A team member will welcome you shortly.')}</p>{customer?.pointsBalance!=null&&<p className="mx-auto mt-6 max-w-sm rounded-2xl bg-lavender-50 p-4">{t('Current reward balance:')} <b>{customer.pointsBalance} {t('points')}</b></p>}<button type="button" onClick={resetKiosk} className="checkin-secondary mx-auto mt-8 max-w-sm"><RotateCcw size={18}/> {t('Check in another guest')}</button><p className="mt-4 text-sm text-stone-400">{t('Returning to the welcome screen in')} {resetCountdown} {t('seconds')}</p></div>}
      {status&&<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{status}</p>}
    </div></div></div>;
}

function CheckinForm({t,options,form,setForm,customer,skipProfile,serviceIds,setServiceIds,serviceQuantities,setServiceQuantities,consent,setConsent,submit,busy}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const closeCategory = useCallback(() => { setActiveCategory(null); setServiceSearch(''); }, []);
  const set=(key)=>(e)=>setForm(f=>({...f,[key]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const missingName=!customer||!form.name;
  const missingPhone=!skipProfile&&(!customer||!form.phone);
  const needsContact=missingName||missingPhone;
  const selectedOptions = options.filter(option=>serviceIds.includes(option.id));
  const selectedUnitCount = selectedOptions.reduce((sum,option)=>sum+Math.max(1,Number(serviceQuantities[option.id]||1)),0);
  const categories = Array.from(new Set(options.map(option=>option.category)));
  const setServiceQuantity = (id, quantity) => {
    const nextQuantity=Math.max(0,Number(quantity||0));
    setServiceIds(ids=>nextQuantity===0?ids.filter(item=>item!==id):ids.includes(id)?ids:[...ids,id]);
    setServiceQuantities(quantities=>{const next={...quantities};if(nextQuantity===0)delete next[id];else next[id]=nextQuantity;return next});
  };
  const categoryOptions = options.filter(option=>option.category===activeCategory);
  const searchTerm = serviceSearch.trim().toLowerCase();
  const visibleCategoryOptions = categoryOptions.filter(option=>!searchTerm || `${option.serviceName} ${option.variationName} ${option.description}`.toLowerCase().includes(searchTerm));
  const mainOptions = visibleCategoryOptions.filter(option=>!option.isAddOn);
  const addOnOptions = visibleCategoryOptions.filter(option=>option.isAddOn);
  const hasSelectedMainService = categoryOptions.some(option=>!option.isAddOn&&serviceIds.includes(option.id));

  useEffect(()=>{
    if(!activeCategory)return undefined;
    const previousOverflow=document.body.style.overflow;
    const onKeyDown=(event)=>{if(event.key==='Escape')closeCategory()};
    document.body.style.overflow='hidden';
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
  },[activeCategory,closeCategory]);

  return <form onSubmit={submit} className="space-y-7">
    <div><p className="eyebrow">{t('Final step')}</p><h2 className="mt-1 font-display text-3xl">{t('Today’s visit')}</h2><p className="mt-2 text-sm text-stone-500">{t(customer?.bookingId?'Your booked services are selected. Review them, share anything we should know, then check in.':skipProfile?'Tell us your name and choose today’s service. This visit will not create a saved profile.':'Add your contact details and choose today’s service.')}</p></div>
    {needsContact&&<div className="grid gap-4 sm:grid-cols-2">{missingName&&<Field label={t('Full name')} value={form.name} onChange={set('name')} required/>}{missingPhone&&<Field label={t('Full phone')} value={form.phone} onChange={set('phone')} required/>}<Field label={t('Email (optional)')} type="email" value={form.email} onChange={set('email')}/></div>}

    <section aria-labelledby="selected-services-heading" className="rounded-2xl border border-[#d9cddd] bg-[#f7f3f8] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">{t('Your visit')}</p><h3 id="selected-services-heading" className="mt-1 text-lg font-semibold text-[#493c4d]">{t('Selected services')}</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#66516f]">{selectedUnitCount} {t('selected')}</span></div>
      {selectedOptions.length===0?<p className="mt-4 rounded-xl bg-white p-4 text-sm text-stone-500">{t('No service selected yet. Choose a category below.')}</p>:<div className="mt-4 space-y-2">{selectedOptions.map(option=>{const quantity=Math.max(1,Number(serviceQuantities[option.id]||1));return <div key={option.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm"><div><b className="block text-sm text-stone-800">{option.serviceName}</b><span className="text-xs text-stone-500">{t(option.variationName)} · {option.durationMinutes} {t('min')} · ${(option.price/100).toFixed(0)} {t('each')}</span></div><div className="flex flex-none items-center overflow-hidden rounded-full bg-purple-700 text-white shadow-sm"><button type="button" onClick={()=>setServiceQuantity(option.id,quantity-1)} className="flex h-9 w-10 items-center justify-center border-r border-purple-500 text-lg font-bold">−</button><span className="flex h-9 min-w-[38px] items-center justify-center px-2 text-sm font-bold">{quantity}</span><button type="button" onClick={()=>setServiceQuantity(option.id,quantity+1)} className="flex h-9 w-10 items-center justify-center border-l border-purple-500 text-lg font-bold">+</button></div></div>})}</div>}
    </section>

    <section aria-labelledby="service-categories-heading">
      <div className="mb-3"><p className="eyebrow">{t('Make a change')}</p><h3 id="service-categories-heading" className="mt-1 text-lg font-semibold">{t('Browse service categories')}</h3></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{categories.map(category=>{const meta=categoryMeta[category]||{icon:'✧'};const count=options.filter(option=>option.category===category).length;const selectedCount=selectedOptions.filter(option=>option.category===category).reduce((sum,option)=>sum+Math.max(1,Number(serviceQuantities[option.id]||1)),0);return <button type="button" key={category} onClick={()=>{setServiceSearch('');setActiveCategory(category)}} className="flex min-h-[78px] items-center gap-3 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3 text-left shadow-sm transition active:scale-[0.98]"><span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-lg text-purple-800 shadow-sm">{meta.icon}</span><span className="min-w-0"><b className="block text-xs leading-tight text-purple-950">{t(category)}</b><small className="mt-1 block text-[10px] text-purple-600">{selectedCount?`${selectedCount} ${t('selected')} · `:''}{count} {t('options')}</small></span></button>})}</div>
    </section>

    {activeCategory&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="checkin-service-category-title" onMouseDown={event=>{if(event.target===event.currentTarget)closeCategory()}}>
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl">
        <div className="border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-600">{t('Service category')}</p><h2 id="checkin-service-category-title" className="mt-1 text-2xl font-bold text-purple-950">{t(activeCategory)}</h2></div><button type="button" onClick={closeCategory} className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-stone-100 text-2xl text-stone-700">×</button></div>
          <input type="search" value={serviceSearch} onChange={event=>setServiceSearch(event.target.value)} placeholder={`${t('Search')} ${t(activeCategory)}...`} className="mt-3 min-h-[48px] w-full rounded-lg border border-stone-300 bg-stone-50 px-4 text-base outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"/>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {addOnOptions.length>0&&<section className="mb-5"><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{t('Add-ons')}</span><span className="text-xs text-stone-500">{t('Select a main service from this category first')}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{addOnOptions.map(option=><ServiceOption t={t} key={option.id} option={option} quantity={Number(serviceQuantities[option.id]||0)} disabled={!hasSelectedMainService} onQuantityChange={setServiceQuantity}/>)}</div></section>}
          {mainOptions.length>0&&<section><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">{t('Services')}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mainOptions.map(option=><ServiceOption t={t} key={option.id} option={option} quantity={Number(serviceQuantities[option.id]||0)} onQuantityChange={setServiceQuantity}/>)}</div></section>}
          {!visibleCategoryOptions.length&&<div className="py-16 text-center"><p className="font-semibold text-stone-700">{t('No matching services')}</p><button type="button" onClick={()=>setServiceSearch('')} className="mt-3 text-sm font-semibold text-purple-700">{t('Clear search')}</button></div>}
        </div>
        <div className="border-t border-stone-200 bg-white p-4"><button type="button" onClick={closeCategory} className="min-h-[52px] w-full rounded-lg bg-purple-700 px-5 text-base font-bold text-white active:bg-purple-800">{t('Done')}{selectedUnitCount?` · ${selectedUnitCount} ${t('selected')}`:''}</button></div>
      </div>
    </div>}

    <label className="block"><span className="label">{t('Notes')}</span><span className="mb-2 block text-sm text-stone-500">{t('Please tell us about pressure preferences, focus areas, areas to avoid, allergies, sensitivities, injuries, pregnancy, or anything else your provider should know.')}</span><textarea className="field min-h-[120px] resize-y text-base" value={form.notes} onChange={set('notes')} placeholder={t('Type any preferences, sensitivities, or health concerns here…')}/></label>
    <div className="space-y-4 rounded-xl bg-stone-50 p-4 text-sm"><label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>{t('I consent to the selected service and confirm the information above is accurate.')} <a href="/service-agreement" target="_blank" className="underline">{t('Read agreement')}</a>.</span></label>{!customer&&<><label className="flex gap-3 rounded-xl border border-[#d9cddd] bg-white p-3"><input type="checkbox" checked={form.joinRewards} onChange={set('joinRewards')}/><span><strong className="block text-[#493c4d]">{t('Join Lavender Rewards')}</strong><span className="mt-1 block text-xs text-stone-600">{t('Earn 1 point for every eligible service dollar paid. Membership is free.')}</span></span></label><label className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.promotionalOffers} onChange={set('promotionalOffers')}/><span><strong className="block">{t('Send me special offers')}</strong><span className="mt-1 block text-xs text-stone-600">{t('Receive occasional promotional emails and text messages. You can unsubscribe at any time.')}</span></span></label></>}</div>
    <button disabled={busy} className="checkin-primary">{busy?t('Checking you in…'):t('Complete check-in')}</button>
  </form>
}
function ServiceOption({t,option,quantity=0,disabled=false,onQuantityChange}) {
  const selected=quantity>0;
  return <div role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} onClick={()=>!disabled&&!selected&&onQuantityChange(option.id,1)} onKeyDown={event=>{if(!disabled&&!selected&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onQuantityChange(option.id,1)}}} className={`relative flex min-h-[104px] w-full items-center justify-between gap-3 rounded-xl border p-4 text-left shadow-sm transition active:scale-[0.99] ${disabled?'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60':selected?'border-purple-500 bg-purple-50 ring-2 ring-purple-100':option.isAddOn?'cursor-pointer border-amber-200 bg-amber-50/70':'cursor-pointer border-stone-200 bg-white'}`}><span className="min-w-0 flex-1"><b className="block text-sm leading-snug text-stone-900">{option.serviceName}</b>{option.description&&<span className="mt-1 line-clamp-2 block text-xs leading-snug text-stone-500">{option.description}</span>}<small className="mt-2 block text-xs font-semibold text-purple-800">{t(option.variationName)} · {option.durationMinutes} {t('min')} · ${(option.price/100).toFixed(2)} {t('each')}</small>{disabled&&<span className="mt-1 block text-[10px] font-semibold text-stone-500">{t('Select a main service first')}</span>}</span>{selected?<span className="flex flex-none items-center overflow-hidden rounded-full bg-purple-700 text-white shadow-sm"><button type="button" onClick={event=>{event.stopPropagation();onQuantityChange(option.id,quantity-1)}} className="flex h-8 w-9 items-center justify-center border-r border-purple-500 text-base font-bold">−</button><span className="flex h-8 min-w-[32px] items-center justify-center px-1 text-xs font-bold">{quantity}</span><button type="button" onClick={event=>{event.stopPropagation();onQuantityChange(option.id,quantity+1)}} className="flex h-8 w-9 items-center justify-center border-l border-purple-500 text-base font-bold">+</button></span>:<span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-purple-100 text-base font-bold text-purple-700">{disabled?'🔒':'+'}</span>}</div>
}
function Field({label,...props}) { return <label><span className="label">{label}</span><input className="field" {...props}/></label> }
