import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext(null);
const KEY = "fashionx_wishlist";

function load() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

// The wishlist is saved in this browser, so it works without an account
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const has = (id) => ids.includes(id);

  return <WishlistContext.Provider value={{ ids, count: ids.length, has, toggle }}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
