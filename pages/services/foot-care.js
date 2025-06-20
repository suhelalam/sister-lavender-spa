'use client';

import { ServicesProvider, useServices } from '../../context/ServicesContext';
import ServiceCard from '../../components/ServiceCard';
import { CATEGORY_IDS } from '../../constants/categories';
import { getInitialServices } from '../../lib/fetchServices';

export async function getServerSideProps() {
  const initialServices = await getInitialServices();
  return { props: { initialServices } };
}


function FootCarePage() {
  const { services } = useServices();
  const filtered = services.filter(service => service.category_id === CATEGORY_IDS.FOOT_CARE_CATEGORY_ID);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-purple-700">
        Foot Care
      </h1>
      {filtered.length === 0 ? (
        <p className="text-gray-600">No services found in this category.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FootCare({ initialServices }) {
  return (
    <ServicesProvider initialServices={initialServices}>
      <FootCarePage/>
    </ServicesProvider>
  );
}
