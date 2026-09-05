"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext<{ itemCount: number }>({ itemCount: 0 });

const STORAGE_KEY = "mh-fashion-cart-count";

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Real cart state (Supabase-backed) comes later with the Cart page;
  // for now this just reflects whatever's in localStorage so the badge
  // isn't a hardcoded fake number.
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setItemCount(Number(stored) || 0);
  }, []);

  return (
    <CartContext.Provider value={{ itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
