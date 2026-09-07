import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();
const MAX_SERVICE_COUNT = 10;

function getItemQuantity(item) {
  return Math.max(1, Number.parseInt(item?.quantity, 10) || 1);
}

function limitCartItems(items) {
  if (!Array.isArray(items)) return [];

  let remaining = MAX_SERVICE_COUNT;
  return items.reduce((limitedItems, item) => {
    if (remaining <= 0) return limitedItems;
    const quantity = Math.min(getItemQuantity(item), remaining);
    remaining -= quantity;
    limitedItems.push({ ...item, quantity });
    return limitedItems;
  }, []);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cart');
    if (stored) {
      try {
        setItems(limitCartItems(JSON.parse(stored)));
      } catch {
        setItems([]);
      }
    }
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isClient]);

  const addItem = (item) => {
    setItems((prev) => {
      const currentCount = prev.reduce((sum, currentItem) => sum + getItemQuantity(currentItem), 0);
      if (currentCount >= MAX_SERVICE_COUNT) return prev;

      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + getItemQuantity(item), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalItems, isClient, maxServiceCount: MAX_SERVICE_COUNT }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
