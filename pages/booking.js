import AppointmentSummary from '../components/AppointmentSummary';
import { useServices } from '../context/ServicesContext';
import { useCart } from '../context/CartContext';
import { getInitialServices } from '../lib/fetchServices';
import { useEffect } from 'react';

export async function getServerSideProps() {
  const initialServices = await getInitialServices();
  return { props: { initialServices } };
}

export default function BookingPage({ initialServices }) {
  const { services, setServices } = useServices();
  const { addItem } = useCart();

  useEffect(() => {
    if (services.length === 0 && initialServices?.length > 0) {
      setServices(initialServices);
    }
  }, [services, initialServices, setServices]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-purple-700">Choose Services</h1>

      {/* Layout: Summary on top (mobile), right (desktop) */}
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        {/* LEFT: Service List */}
        <div className="flex-1 space-y-4">
          {services.length > 0 ? (
            services.map(service => {
              const variation = service.variations?.[0];
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    if (!variation) return;
                    addItem({
                      id: variation.id,
                      name: service.name,
                      variationName: variation.name,
                      price: variation.price,
                      currency: variation.currency,
                      quantity: 1,
                      duration: variation.duration,
                      version: variation.version,
                    });
                  }}
                  className="cursor-pointer border rounded p-4 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="font-semibold text-lg text-gray-800">{service.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Duration: {variation.duration / 60000} min
                  </div>
                  <div className="text-sm text-purple-800 font-semibold mt-1">
                    ${variation.price / 100}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No services available.</p>
          )}
        </div>

        {/* RIGHT: Appointment Summary */}
        <div className="w-full lg:w-96">
          <AppointmentSummary selectedSlot={null} />
        </div>
      </div>
    </div>
  );
}
