'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import ServiceCard from '../components/ServiceCard';
import { useServices } from '../context/ServicesContext';

const normalizeCategory = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const couplesCategories = new Set(['Side-by-Side Services', 'Couples Services'].map(normalizeCategory));

export default function CouplesServices() {
  const { activeServices: services, loading } = useServices();
  const couplesServices = services.filter((service) =>
    !service.isAddOn && couplesCategories.has(normalizeCategory(service.category))
  );

  return <main>
    <section className="grid min-h-[540px] bg-[#f0ebe4] md:grid-cols-2">
      <div className="flex flex-col justify-center p-8 md:p-14 lg:pl-[max(4rem,calc((100vw-1200px)/2))]">
        <p className="eyebrow">Together, unhurried</p>
        <h1 className="mt-3 max-w-xl font-display text-5xl leading-[0.98] text-[#423846] md:text-6xl">Side-by-side spa services</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-stone-600">Relax alongside a friend, sibling, parent, partner, or any guest you choose. Our side-by-side head spa and massage experiences are for everyone—not only couples.</p>
        <a href="#couples-service-menu" className="button-primary mt-7 w-fit">Explore side-by-side services <ArrowRight size={17}/></a>
      </div>
      <div className="relative min-h-[380px]">
        <Image src="/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 34456.jpg" alt="Two guests enjoying side-by-side spa treatments at Sister Lavender Spa in Chicago" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 50vw"/>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/25 to-transparent"/>
      </div>
    </section>

    <section id="couples-service-menu" className="section scroll-mt-24" aria-labelledby="couples-menu-heading">
      <div className="section-heading">
        <div><p className="eyebrow">For any two guests</p><h2 id="couples-menu-heading">Choose your shared experience.</h2><p className="mt-4 max-w-2xl leading-7 text-stone-600">Come with a friend, family member, partner, or someone special. Add a service, then continue to booking to choose your preferred date and time.</p></div>
        <Link href="/booking" className="button-secondary whitespace-nowrap">Continue to booking <ArrowRight size={16}/></Link>
      </div>

      {loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:3}).map((_,index)=><div key={index} className="h-[520px] animate-pulse rounded-[1.25rem] bg-stone-100"/>)}</div> : couplesServices.length > 0 ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{couplesServices.map((service)=><ServiceCard key={service.id} service={service}/>)}</div> : <div className="rounded-2xl border border-[#e3dad1] bg-white p-8 text-center shadow-sm"><Sparkles className="mx-auto text-[#806b88]"/><h3 className="mt-3 font-display text-2xl text-[#423846]">Side-by-side services are being refreshed.</h3><p className="mx-auto mt-2 max-w-lg text-stone-600">Please call us for current side-by-side availability, or explore our individual services.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><a href="tel:+13129003131" className="button-primary">Call (312) 900-3131</a><Link href="/services" className="button-secondary">Browse services</Link></div></div>}
    </section>

    <section className="bg-[#ede5ee] px-5 py-16">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {[['Made for everyone','Friends, siblings, parents and children, partners, coworkers, and any two guests are welcome.'],['Thoughtfully coordinated','Our team coordinates service timing so you can settle in and enjoy the experience together.'],['Prepared for you','Each guest can share allergies, injuries, pregnancy status, pressure preferences, or areas to avoid during check-in.']].map(([title,text])=><article key={title} className="rounded-2xl bg-white/80 p-6 shadow-sm"><Heart size={20} className="text-[#806b88]"/><h2 className="mt-4 font-display text-2xl text-[#423846]">{title}</h2><p className="mt-3 text-sm leading-6 text-stone-600">{text}</p></article>)}
      </div>
    </section>
  </main>;
}
