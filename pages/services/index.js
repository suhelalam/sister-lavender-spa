import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useServices } from '../../context/ServicesContext';
import { useCart } from '../../context/CartContext';
import ServiceCard from '../../components/ServiceCard';
import AppointmentSummary from '../../components/AppointmentSummary';
import { serviceCategories } from '../../lib/servicesData';

const getCategorySlugByName = (categoryName = '') => {
  const category = serviceCategories.find(
    (cat) => cat.title.includes(categoryName) || categoryName.includes(cat.title)
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

export default function Services() {
  const { services, addOns, loading } = useServices();
  const { items, addItem } = useCart();
  const [expandedCategory, setExpandedCategory] = useState(null);

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
    });
  };

  const toggleCategory = (categorySlug) => {
    setExpandedCategory((current) => (current === categorySlug ? null : categorySlug));
  };

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
