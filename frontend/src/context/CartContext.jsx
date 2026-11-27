import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const KEY = "fashionx_cart";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, size = "", color = "", variant = null) => {
    setItems((prev) => {
      const key = `${product.id}-${size}-${color}`;
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        { key, id: product.id, name: product.name, price: Number(variant?.price ?? product.price), image: variant?.image_url || product.image_url, size, color, qty: 1 },
      ];
    });
  };

  const updateQty = (key, qty) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i)));
  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clearCart = () => setItems([]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
  // Must match FREE_SHIPPING_ABOVE and SHIPPING_FEE in backend/store/serializers.py
  const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  return (
    <CartContext.Provider value={{ items, count, subtotal, shipping, total, addItem, updateQty, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
