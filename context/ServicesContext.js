'use client';

import { createContext, useContext, useState, useEffect } from "react";
import { allServices } from "../lib/servicesData";

const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ALWAYS load fresh from the source file
    console.log('Loading fresh services from servicesData.js');
    setServices(allServices);
    setLoading(false);
    
    // Optional: Save to localStorage for cart/booking persistence ONLY
    // But don't use it for displaying services
    localStorage.setItem('spaServicesBackup', JSON.stringify(allServices));
  }, []);

  // CRUD functions for admin (will only affect current session)
  const addService = (newService) => {
    if (!newService.id) {
      const baseId = newService.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      let id = baseId;
      let counter = 1;
      
      while (services.find(s => s.id === id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      newService.id = id;
    }

    setServices(prev => [...prev, newService]);
    
    // Save admin changes to localStorage (temporary)
    const updatedServices = [...services, newService];
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  const updateService = (id, updatedData) => {
    setServices(prev => 
      prev.map(service => 
        service.id === id ? { ...service, ...updatedData } : service
      )
    );
    
    // Save to localStorage
    const updatedServices = services.map(service => 
      service.id === id ? { ...service, ...updatedData } : service
    );
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  const deleteService = (id) => {
    setServices(prev => prev.filter(service => service.id !== id));
    
    // Save to localStorage
    const updatedServices = services.filter(service => service.id !== id);
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  // Variation functions
  const addVariation = (serviceId, variation) => {
    setServices(prev => 
      prev.map(service => {
        if (service.id === serviceId) {
          const newVariation = {
            ...variation,
            id: variation.id || `${serviceId}-${variation.name.toLowerCase().replace(/\s+/g, '-')}`,
            version: variation.version || 1
          };
          const updatedService = {
            ...service,
            variations: [...(service.variations || []), newVariation]
          };
          return updatedService;
        }
        return service;
      })
    );
    
    // Save to localStorage
    const updatedServices = services.map(service => {
      if (service.id === serviceId) {
        const newVariation = {
          ...variation,
          id: variation.id || `${serviceId}-${variation.name.toLowerCase().replace(/\s+/g, '-')}`,
          version: variation.version || 1
        };
        return {
          ...service,
          variations: [...(service.variations || []), newVariation]
        };
      }
      return service;
    });
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  const updateVariation = (serviceId, variationId, updatedData) => {
    setServices(prev => 
      prev.map(service => {
        if (service.id === serviceId && service.variations) {
          return {
            ...service,
            variations: service.variations.map(variation => 
              variation.id === variationId 
                ? { ...variation, ...updatedData }
                : variation
            )
          };
        }
        return service;
      })
    );
    
    // Save to localStorage
    const updatedServices = services.map(service => {
      if (service.id === serviceId && service.variations) {
        return {
          ...service,
          variations: service.variations.map(variation => 
            variation.id === variationId 
              ? { ...variation, ...updatedData }
              : variation
          )
        };
      }
      return service;
    });
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  const deleteVariation = (serviceId, variationId) => {
    setServices(prev => 
      prev.map(service => {
        if (service.id === serviceId && service.variations) {
          const filteredVariations = service.variations.filter(v => v.id !== variationId);
          return {
            ...service,
            variations: filteredVariations.length > 0 ? filteredVariations : undefined
          };
        }
        return service;
      })
    );
    
    // Save to localStorage
    const updatedServices = services.map(service => {
      if (service.id === serviceId && service.variations) {
        const filteredVariations = service.variations.filter(v => v.id !== variationId);
        return {
          ...service,
          variations: filteredVariations.length > 0 ? filteredVariations : undefined
        };
      }
      return service;
    });
    localStorage.setItem('spaServicesBackup', JSON.stringify(updatedServices));
  };

  return (
    <ServicesContext.Provider value={{ 
      services, 
      loading, 
      addService, 
      updateService, 
      deleteService,
      addVariation,
      updateVariation,
      deleteVariation
    }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);