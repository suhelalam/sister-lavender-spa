import { ServicesProvider, useServices } from "../../context/ServicesContext";
import ServiceCard from "../../components/ServiceCard/index";

function HeadSpaPage() {
  const { services, loading } = useServices();

  if (loading) return <p>Loading services...</p>;

  const filtered = services.filter(
    (service) => service.category === "Head Spa Treatments"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">
        Head Spa Treatments
      </h1>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No services found in this category.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service, idx) => (
            <ServiceCard key={idx} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HeadSpa() {
  return (
    <ServicesProvider>
      <HeadSpaPage />
    </ServicesProvider>
  );
}