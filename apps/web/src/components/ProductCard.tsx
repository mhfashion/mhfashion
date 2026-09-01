"use client";

import { useState } from "react";
import { Heart, Shirt } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPriceRange } from "@/lib/currency";

export default function ProductCard({ product }: { product: Product }) {
  const [favorited, setFavorited] = useState(false);

  return (
    <a href={`/products/${product.slug}`} className="block group">
      <div className="relative aspect-square rounded-lg bg-bg-surface flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Shirt size={22} className="text-border-light" />
        )}

        {product.isNew && (
          <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[7px] font-bold px-1 py-0.5 rounded">
            NEW
          </span>
        )}

        {/* Favorite heart — every product card must have this */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setFavorited((f) => !f);
          }}
          aria-label="Favorite"
          className="absolute top-1.5 right-1.5"
        >
          <Heart
            size={15}
            fill={favorited ? "currentColor" : "none"}
            className={favorited ? "text-accent" : "text-text-primary"}
          />
        </button>
      </div>

      <p className="text-[10px] mt-1 truncate">{product.name}</p>
      <p className="text-[10px] text-text-muted">
        {formatPriceRange(product.priceMinKs, product.priceMaxKs)}
      </p>
    </a>
  );
}
