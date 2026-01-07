'use client';

import { useServices } from '../context/ServicesContext';
import ServiceCard from '../components/ServiceCard';
import { serviceCategories } from '../lib/servicesData';

export default function AllServices() {
  const { services, loading } = useServices();

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-600" />
      </div>
    );
  }

  // Create a map of services by category slug
  const servicesByCategorySlug = {};
  
  // Initialize with all categories
  serviceCategories.forEach(cat => {
    servicesByCategorySlug[cat.slug] = [];
  });

  // Group services by their category (matching by title)
  services.forEach(service => {
    // Find which category this service belongs to
    const category = serviceCategories.find(cat => 
      cat.title.includes(service.category) || service.category.includes(cat.title)
    );
    
    if (category) {
      servicesByCategorySlug[category.slug].push(service);
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-center">All Services</h1>
      
      <div className="space-y-12">
        {serviceCategories.map((category) => {
          const categoryServices = servicesByCategorySlug[category.slug] || [];
          
          if (categoryServices.length === 0) return null;
          
          return (
            <section key={category.slug} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-bold text-purple-700">
                  {category.title}
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <p className="text-gray-600 mb-4">{category.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}