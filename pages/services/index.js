import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useServices } from '../../context/ServicesContext';
import { useCart } from '../../context/CartContext';
import {
  getServiceSelectionsFromCountQuery,
  legacySlugifyServiceValue,
  normalizeServiceIds,
  slugifyServiceValue,
} from '../../lib/serviceShareLinks';
import ServiceCard from '../../components/ServiceCard';
import AppointmentSummary from '../../components/AppointmentSummary';
import { serviceCategories } from '../../lib/servicesData';

const normalizeCategoryText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getCategorySlugByName = (categoryName = '') => {
  const normalizedInput = normalizeCategoryText(categoryName);
  const category = serviceCategories.find(
    (cat) => {
      const normalizedTitle = normalizeCategoryText(cat.title);
      return (
        normalizedTitle === normalizedInput ||
        normalizedTitle.includes(normalizedInput) ||
        normalizedInput.includes(normalizedTitle)
      );
    }
  );
  return category?.slug || null;
};

const getPrimaryVariation = (addOn) => {
  if (Array.isArray(addOn.variations) && addOn.variations.length > 0) {
    return addOn.variations[0];
  }

  const fallbackPrice =
    typeof addOn.price === 'string'
      ? Math.round(Number.parseFloat(addOn.price.replace(/[^\d.]/g, '')) * 100) || 0
      : Number(addOn.price || 0);

  return {
    id: `${addOn.id}-standard`,
    price: fallbackPrice,
    duration: Number(addOn.duration || 0),
    version: 1,
    currency: 'USD',
  };
};

const browsingCategories = [
  { title: 'Head Spa Treatments', categories: ['Head Spa Treatments'], kicker: 'Scalp care & relaxation', description: 'Scalp cleansing, steam, massage, and restorative rituals for deep relaxation.', image: '/images/head.jpg', href: '/services/head-spa' },
  { title: 'Body Massage Treatments', categories: ['Body Massage Treatments'], kicker: 'Rest & recovery', description: 'Personalized massage for relaxation, muscle tension, circulation, and recovery.', image: '/images/bodyMassage.jpg', href: '/services/body-massage' },
  { title: 'Foot Care', categories: ['Foot Care'], kicker: 'Care from heel to toe', description: 'Pedicures, exfoliation, hydration, and detailed care for refreshed feet.', image: '/images/footCare.jpg', href: '/services/foot-care' },
  { title: 'Manicure Services', categories: ['Manicure Services'], kicker: 'Polished & precise', description: 'Thoughtful nail shaping, cuticle care, and polish in a calm spa setting.', image: '/images/manicure.jpg', href: '/services/manicure' },
  { title: 'Couples & Side-by-Side', categories: ['Side-by-Side Services', 'Couples Services'], kicker: 'Relax together', description: 'Share head spa or massage treatments together for an unhurried experience for two.', image: '/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 34456.jpg', href: '/couples-services' },
];

function ServicesLanding({ services, loading }) {
  const availableCategories = browsingCategories.filter((category) => category.categories.some((categoryName) =>
    services.some((service) => !service.isAddOn && normalizeCategoryText(service.category) === normalizeCategoryText(categoryName))
  ));
  return <main>
    <section className="bg-[#f0ebe4] px-4 py-14 text-center sm:py-20">
      <p className="eyebrow">Sister Lavender Spa · Chicago</p>
      <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight text-[#423846] sm:text-6xl">Spa services & pricing</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600">Explore our current head spa, massage, nail, foot care, and couples experiences. Each category includes treatment details, durations, and prices.</p>
      <Link href="/booking" className="button-primary mt-7 inline-flex">Book an appointment <ArrowRight size={17}/></Link>
    </section>
    <section className="section" aria-labelledby="service-categories-heading">
      <div className="section-heading"><div><p className="eyebrow">Explore treatments</p><h2 id="service-categories-heading">Choose a service category.</h2></div></div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({length:3}).map((_,index)=><div key={index} className="h-[470px] animate-pulse rounded-[1.4rem] bg-stone-100"/>) : availableCategories.map((category)=><article key={category.href} className="group overflow-hidden rounded-[1.4rem] border border-[#e3dad1] bg-white shadow-[0_14px_40px_rgba(65,49,43,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(65,49,43,0.16)]">
          <Link href={category.href} className="block h-full" aria-label={`View ${category.title} services and pricing`}>
            <div className="relative h-64 overflow-hidden sm:h-72">
              <Image src={category.image} alt={`${category.title} at Sister Lavender Spa in Chicago`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105"/>
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-transparent"/>
              <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#594660] backdrop-blur-sm">{category.kicker}</span>
            </div>
            <div className="flex min-h-[205px] flex-col p-6"><h3 className="font-display text-2xl leading-tight text-[#423846]">{category.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{category.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#66516f]">View services & pricing <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></span></div>
          </Link>
        </article>)}
      </div>
    </section>
    <section className="final-cta"><p className="eyebrow">Ready when you are</p><h2>Choose your treatment and appointment time.</h2><div className="mt-6 flex justify-center"><Link href="/booking" className="button-light">Book now</Link></div></section>
  </main>;
}

export default function Services() {
  const { activeServices: services, activeAddOns: addOns, loading } = useServices();
  const { items, addItem, clearCart } = useCart();
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);

  const servicesByCategorySlug = useMemo(() => {
    const grouped = {};
    serviceCategories.forEach((category) => {
      grouped[category.slug] = [];
    });

    services
      .filter((service) => !service.isAddOn)
      .forEach((service) => {
      const categorySlug = getCategorySlugByName(service.category);
      if (categorySlug) grouped[categorySlug].push(service);
    });

    return grouped;
  }, [services]);

  const addOnsByCategorySlug = useMemo(() => {
    const grouped = {};
    serviceCategories.forEach((category) => {
      grouped[category.slug] = [];
    });

    addOns.forEach((addOn) => {
      const categorySlug = getCategorySlugByName(addOn.appliesToCategory || addOn.category);
      if (categorySlug) grouped[categorySlug].push(addOn);
    });

    return grouped;
  }, [addOns]);

  const categoryByCartItemId = useMemo(() => {
    const map = new Map();

    services.forEach((service) => {
      const categorySlug = getCategorySlugByName(service.category);
      if (!categorySlug) return;

      map.set(service.id, categorySlug);
      map.set(service.name, categorySlug);

      if (Array.isArray(service.variations)) {
        service.variations.forEach((variation) => {
          if (variation?.id) map.set(variation.id, categorySlug);
        });
      }
    });

    return map;
  }, [services]);

  const selectedCategorySlugs = useMemo(() => {
    const selected = new Set();
    items.forEach((item) => {
      const categorySlug = categoryByCartItemId.get(item.id);
      if (categorySlug) selected.add(categorySlug);
    });
    return selected;
  }, [items, categoryByCartItemId]);

  const handleAddOn = (addOn) => {
    const variation = getPrimaryVariation(addOn);

    addItem({
      id: variation.id,
      name: addOn.name,
      variationName: 'Add-on',
      price: Number(variation.price || 0),
      currency: variation.currency || 'USD',
      duration: Number(variation.duration || 0),
      version: variation.version || 1,
      isAddOn: true,
      category: addOn.category || '',
      appliesToCategory: addOn.appliesToCategory || addOn.category || '',
    });
  };

  useEffect(() => {
    if (loading || !router.isReady || restoredFromUrl) return;

    const countSelections = getServiceSelectionsFromCountQuery(router.query);
    const legacyIds = normalizeServiceIds(
          router.query.services || router.query.service || router.query.slug || ''
        );
    const selections = countSelections.length > 0
      ? countSelections
      : legacyIds.map((selectionKey) => ({ selectionKey, count: 1 }));

    if (selections.length === 0) {
      setRestoredFromUrl(true);
      return;
    }

    clearCart();

    selections.forEach(({ selectionKey, count }) => {
      let selectedVariation = null;
      const match = services.find((service) => {
        const matchesService =
          service.id === selectionKey ||
          slugifyServiceValue(service.id) === selectionKey ||
          slugifyServiceValue(service.name) === selectionKey ||
          legacySlugifyServiceValue(service.id) === selectionKey ||
          legacySlugifyServiceValue(service.name) === selectionKey ||
          String(service.name).toLowerCase() === selectionKey.toLowerCase();

        if (matchesService) return true;

        const serviceSlug = slugifyServiceValue(service.name || service.id);
        selectedVariation = (service.variations || []).find((variation) => {
          const variationSlug = slugifyServiceValue(variation.name || variation.id || 'standard');
          return `${serviceSlug}--${variationSlug}` === selectionKey;
        }) || null;

        return Boolean(selectedVariation);
      });

      if (!match) return;

      const variation = selectedVariation || (Array.isArray(match.variations) && match.variations.length > 0
        ? match.variations[0]
        : {
            id: match.name,
            name: 'Standard',
            price: Number.parseFloat(String(match.price || '0').replace(/[^\d.]/g, '')) * 100,
            duration: (typeof match.duration === 'string' ? Number.parseInt(match.duration, 10) : Number(match.duration || 0)) * 60000,
            currency: 'USD',
            version: 1,
          });

      for (let index = 0; index < count; index += 1) {
        addItem({
          id: variation.id,
          serviceId: match.id || match.name,
          name: match.name,
          variationName: variation.name,
          price: Number(variation.price || 0),
          currency: variation.currency || 'USD',
          quantity: 1,
          duration: Number(variation.duration || 0),
          version: variation.version || 1,
          category: match.category || '',
          isAddOn: false,
        });
      }
    });

    setRestoredFromUrl(true);
  }, [addItem, clearCart, loading, restoredFromUrl, router, router.isReady, services]);

  const toggleCategory = (categorySlug) => {
    setExpandedCategory((current) => (current === categorySlug ? null : categorySlug));
  };

  if (router.pathname === '/services') return <ServicesLanding services={services} loading={loading} />;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-3 text-center">Our Services</h1>
        <p className="text-center text-sm text-gray-500">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-3 text-center">Our Services</h1>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="flex-1 space-y-2">
          {serviceCategories.map((category) => {
            const categoryServices = servicesByCategorySlug[category.slug] || [];
            const categoryAddOns = addOnsByCategorySlug[category.slug] || [];
            const canAddCategoryAddOns = selectedCategorySlugs.has(category.slug);
            const isExpanded = expandedCategory === category.slug;

            return (
              <section key={category.slug} className="border rounded-lg bg-white shadow-sm">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                  onClick={() => toggleCategory(category.slug)}
                  aria-expanded={isExpanded}
                  aria-controls={`category-${category.slug}`}
                >
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold">{category.title}</h2>
                    <p className="text-xs text-gray-500">
                      {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded ? (
                  <div id={`category-${category.slug}`} className="px-4 pb-3">
                    {categoryAddOns.length > 0 ? (
                      <div className="mb-3 rounded border border-purple-100 bg-purple-50/60 p-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 mb-2">
                          Add-ons
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categoryAddOns.map((addOn) => (
                            <button
                              key={addOn.id}
                              type="button"
                              onClick={() => handleAddOn(addOn)}
                              disabled={!canAddCategoryAddOns}
                              className={`rounded border px-2 py-1 text-xs transition ${
                                canAddCategoryAddOns
                                  ? 'border-purple-300 text-purple-800 bg-white hover:bg-purple-100'
                                  : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                              }`}
                            >
                              {addOn.name} (+${(Number(getPrimaryVariation(addOn).price || 0) / 100).toFixed(2)}/person)
                            </button>
                          ))}
                        </div>
                        {!canAddCategoryAddOns ? (
                          <p className="mt-2 text-[11px] text-gray-500">
                            Add a service from this category first to unlock these add-ons.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {categoryServices.length > 0 ? (
                      <div className="space-y-2">
                        {categoryServices.map((service) => (
                          <ServiceCard key={service.id} service={service} variant="slim" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No services available in this category yet.</p>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <aside className="w-full lg:w-80 lg:sticky lg:top-24 self-start">
          <AppointmentSummary selectedSlot={null} />
        </aside>
      </div>
    </div>
  );
}
