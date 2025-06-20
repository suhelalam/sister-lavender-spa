// context/ServicesContext.js
import React, { createContext, useState, useContext } from 'react';

const ServicesContext = createContext();

export function ServicesProvider({ children, initialServices = [] }) {
  const [services, setServices] = useState(initialServices);

  return (
    <ServicesContext.Provider value={{ services, setServices }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  return useContext(ServicesContext);
}
