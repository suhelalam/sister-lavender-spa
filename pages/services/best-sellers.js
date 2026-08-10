'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import ServiceCard from '../../components/ServiceCard';
import { useServices } from '../../context/ServicesContext';

const normalize = (value = '') => String(value)
  .toLowerCase()
  .replace(/[\u3400-\u9fff]/g, '')
  .replace(/\b(?:standard|\d{1,3}\s*(?:min|minute)s?)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export default function BestSellersPage() {
  const { activeServices: services, loading: servicesLoading } = useServices();
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    let active=true;
    fetch('/api/admin/analytics').then(async(response)=>{
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Unable to load service rankings.');
      if(active)setRankings(Array.isArray(payload.bestSellers)?payload.bestSellers:[]);
    }).catch((requestError)=>{if(active)setError(requestError.message)}).finally(()=>{if(active)setLoadingRankings(false)});
    return()=>{active=false};
  },[]);

  const rankedServices = useMemo(()=>rankings.map((ranking)=>{
    const rankedName=normalize(ranking.name);
    const service=services.find((item)=>{
      const serviceName=normalize(item.name);
      return serviceName===rankedName || serviceName.includes(rankedName) || rankedName.includes(serviceName);
    });
    return service?{service,count:ranking.count}:null;
  }).filter(Boolean).filter((entry,index,list)=>list.findIndex((candidate)=>candidate.service.id===entry.service.id)===index),[rankings,services]);

  const loading=servicesLoading||loadingRankings;
  return <main className="bg-[#fbfaf7]">
    <section className="bg-[#f0ebe4] px-5 py-14 text-center sm:py-20"><Award className="mx-auto text-[#806b88]" size={34}/><p className="eyebrow mt-4">Chosen most often</p><h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl text-[#423846] sm:text-6xl">Best-selling spa services</h1><p className="mx-auto mt-5 max-w-2xl leading-7 text-stone-600">Discover the treatments guests book and purchase most often, ranked using Sister Lavender Spa’s booking and payment analytics.</p></section>
    <section className="section" aria-labelledby="best-sellers-heading"><div className="section-heading"><div><p className="eyebrow">Guest favorites</p><h2 id="best-sellers-heading">Our most popular treatments.</h2></div></div>
      {loading?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:3}).map((_,index)=><div key={index} className="h-[520px] animate-pulse rounded-[1.25rem] bg-stone-100"/>)}</div>:error?<p className="rounded-2xl bg-amber-50 p-6 text-amber-900">{error}</p>:rankedServices.length?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rankedServices.map((entry,index)=><div key={entry.service.id} className="relative"><span className="absolute -left-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#66516f] font-display text-lg font-bold text-white shadow-lg">{index+1}</span><ServiceCard service={entry.service}/></div>)}</div>:<p className="rounded-2xl border border-[#e3dad1] bg-white p-8 text-center text-stone-600">Best-seller rankings will appear after enough booking and payment activity has been recorded.</p>}
    </section>
  </main>;
}
