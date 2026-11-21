"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { isWishlisted, normalizeWishlist, removeWishlistItem, toggleWishlistItem } from "@/lib/wishlist";

type WishlistContextValue = {
  items: Product[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue>({
  items: [],
  count: 0,
  has: () => false,
  toggle: () => {},
  remove: () => {},
  clear: () => {},
});

const STORAGE_KEY = "mh-fashion-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setItems(stored ? normalizeWishlist(JSON.parse(stored)) : []);
    } catch {
      setItems([]);
    }
    setLoaded(true);
  }, []);

  // Writing before the first read would replace a saved list with the empty initial state.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // A full or blocked storage must not break the page.
    }
  }, [items, loaded]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        has: (productId) => isWishlisted(items, productId),
        toggle: (product) => setItems((current) => toggleWishlistItem(current, product)),
        remove: (productId) => setItems((current) => removeWishlistItem(current, productId)),
        clear: () => setItems([]),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
