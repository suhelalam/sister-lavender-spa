'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useServices } from '../context/ServicesContext';

const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const items = [
  { label: 'Best Sellers', href: '/services/best-sellers', always: true },
  { label: 'Head Spa', href: '/services/head-spa', categories: ['Head Spa Treatments'] },
  { label: 'Massage', href: '/services/body-massage', categories: ['Body Massage Treatments'] },
  { label: 'Manicure', href: '/services/manicure', categories: ['Manicure Services'] },
  { label: 'Pedicure', href: '/services/foot-care', categories: ['Foot Care'] },
  { label: 'Side-by-Side', href: '/couples-services', categories: ['Side-by-Side Services', 'Couples Services'] },
  { label: 'Group Events', href: '/group-events', always: true },
];

export default function ServiceCategoryNav() {
  const pathname = usePathname();
  const { activeServices: services, loading } = useServices();
  const visibleItems = items.filter((item) => item.always || loading || item.categories.some((category) =>
    services.some((service) => !service.isAddOn && normalize(service.category) === normalize(category))
  ));

  return <nav className="sticky top-[68px] z-40 border-y border-[#ded4e1] bg-[#fbfaf7]/95 shadow-sm backdrop-blur-xl" aria-label="Service categories">
    <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visibleItems.map((item)=>{
        const active = pathname === item.href;
        return <Link key={item.label} href={item.href} aria-current={active?'page':undefined} className={`flex-none rounded-full border px-4 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#806b88] ${active?'border-[#66516f] bg-[#66516f] text-white shadow-sm':'border-[#d8cddd] bg-white text-[#594660] hover:border-[#806b88] hover:bg-[#eee7f0]'}`}>{item.label}</Link>;
      })}
    </div>
  </nav>;
}
