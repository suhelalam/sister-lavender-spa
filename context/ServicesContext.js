import { createContext, useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "services"));
        const allServices = [];

        snapshot.forEach((doc) => {
          const categoryName = doc.id;
          const data = doc.data();
          
          console.log("Document ID:", doc.id, "Data:", data);
          
          // Check if the document has an 'items' field
          if (data.items && Array.isArray(data.items)) {
            // Process items array
            data.items.forEach((item) => {
              // If the item is a string, try to parse it as JSON
              if (typeof item === 'string') {
                try {
                  const service = JSON.parse(item);
                  allServices.push({
                    ...service,
                    category: categoryName,
                  });
                } catch (e) {
                  console.error("Error parsing JSON:", e, "Item:", item);
                }
              } else if (typeof item === 'object') {
                // If it's already an object, use it directly
                allServices.push({
                  ...item,
                  category: categoryName,
                });
              }
            });
          } else {
            // Check if the document contains service objects directly
            Object.entries(data).forEach(([key, value]) => {
              // Skip Firestore metadata fields
              if (key.startsWith('_')) return;
              
              // If the value is a string that looks like JSON, try to parse it
              if (typeof value === 'string' && (value.includes('{') || value.includes('['))) {
                try {
                  const service = JSON.parse(value);
                  allServices.push({
                    ...service,
                    id: key,
                    category: categoryName,
                  });
                } catch (e) {
                  console.error("Error parsing JSON:", e, "Value:", value);
                }
              } else if (typeof value === 'object' && value !== null) {
                // If it's already an object, use it directly
                allServices.push({
                  ...value,
                  id: key,
                  category: categoryName,
                });
              }
            });
          }
        });

        console.log("All services fetched from Firebase:", allServices);
        setServices(allServices);
      } catch (err) {
        console.error("Error fetching services:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <ServicesContext.Provider value={{ services, loading }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);