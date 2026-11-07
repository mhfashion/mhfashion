"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/types";

export type CartItem = Product & { quantity: number };

type CartContextValue = {
  itemCount: number;
  items: CartItem[];
  addItem: (product: Product) => void;
};

const CartContext = createContext<CartContextValue>({
  itemCount: 0,
  items: [],
  addItem: () => {},
});

const STORAGE_KEY = "mh-fashion-cart-items";
const LEGACY_COUNT_KEY = "mh-fashion-cart-count";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      } else {
        const legacyCount = Number(window.localStorage.getItem(LEGACY_COUNT_KEY) || 0);
        if (legacyCount > 0) {
          setItems([]);
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.localStorage.setItem(LEGACY_COUNT_KEY, String(items.reduce((total, item) => total + item.quantity, 0)));
  }, [items]);

  const addItem = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return <CartContext.Provider value={{ itemCount, items, addItem }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
