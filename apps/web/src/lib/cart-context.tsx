"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import {
  addCartItem, normalizeCartItems, removeCartItem, updateCartQuantity,
  type CartItem, type CartVariant,
} from "@/lib/cart-items";

export type { CartItem, CartVariant } from "@/lib/cart-items";

type CartContextValue = {
  itemCount: number;
  items: CartItem[];
  addItem: (product: Product, variant?: Partial<CartVariant> | null, quantity?: number, unitPriceKs?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue>({
  itemCount: 0,
  items: [],
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
});

const STORAGE_KEY = "mh-fashion-cart-items";
const LEGACY_COUNT_KEY = "mh-fashion-cart-count";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(normalizeCartItems(JSON.parse(stored)));
      } else {
        const legacyCount = Number(window.localStorage.getItem(LEGACY_COUNT_KEY) || 0);
        if (legacyCount > 0) setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.localStorage.setItem(LEGACY_COUNT_KEY, String(items.reduce((total, item) => total + item.quantity, 0)));
  }, [items]);

  // A different size, colour, material, GSM, fit or sleeve is a separate line, never merged.
  const addItem = (product: Product, variant?: Partial<CartVariant> | null, quantity = 1, unitPriceKs?: number) => {
    setItems((current) => addCartItem(current, product, variant, quantity, unitPriceKs));
  };

  const updateQuantity = (key: string, quantity: number) => {
    setItems((current) => updateCartQuantity(current, key, quantity));
  };

  const removeItem = (key: string) => setItems((current) => removeCartItem(current, key));
  const clearCart = () => setItems([]);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return <CartContext.Provider value={{ itemCount, items, addItem, updateQuantity, removeItem, clearCart }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
