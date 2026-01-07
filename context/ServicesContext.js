'use client';

import { createContext, useContext, useState, useEffect } from "react";
import { allServices } from "../lib/servicesData";

const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load from localStorage if available, otherwise use default data
    const savedServices = localStorage.getItem('spaServices');
    if (savedServices) {
      setServices(JSON.parse(savedServices));
    } else {
      setServices(allServices);
      localStorage.setItem('spaServices', JSON.stringify(allServices));
    }
    setLoading(false);
  }, []);

  // Save to localStorage whenever services change
  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem('spaServices', JSON.stringify(services));
    }
  }, [services]);

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
  };

  const updateService = (id, updatedData) => {
    setServices(prev => 
      prev.map(service => 
        service.id === id ? { ...service, ...updatedData } : service
      )
    );
  };

  const deleteService = (id) => {
    setServices(prev => prev.filter(service => service.id !== id));
  };

  const addVariation = (serviceId, variation) => {
    setServices(prev => 
      prev.map(service => {
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
      })
    );
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