import { Shirt, ShoppingBag, Coffee, Smartphone, Star } from "lucide-react";
import type { Category } from "@/lib/types";

const ICONS: Record<string, React.ElementType> = {
  shirt: Shirt,
  bag: ShoppingBag,
  cup: Coffee,
  phone: Smartphone,
  default: Star,
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "T-Shirts", slug: "t-shirts", icon: "shirt" },
  { id: "2", name: "Kids T-Shirts", slug: "kids-t-shirts", icon: "shirt" },
  { id: "3", name: "Phone Covers", slug: "phone-covers", icon: "phone" },
  { id: "4", name: "Bags", slug: "bags", icon: "bag" },
  { id: "5", name: "Cups", slug: "cups", icon: "cup" },
];

function CategoryItem({ cat }: { cat: Category }) {
  const Icon = ICONS[cat.icon] ?? ICONS.default;
  return (
    <a
      href={`/categories/${cat.slug}`}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16"
    >
      <div className="w-11 h-11 rounded-full bg-bg-surface flex items-center justify-center">
        <Icon size={18} />
      </div>
      <span className="text-[10px] whitespace-nowrap">{cat.name}</span>
    </a>
  );
}

export default function CategoryRow({
  categories = DEFAULT_CATEGORIES,
}: {
  categories?: Category[];
}) {
  return (
    <section className="px-6 md:px-8 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">SHOP BY CATEGORY</h2>
        <a href="/categories" className="text-xs text-accent">
          View all →
        </a>
      </div>

      {/* Continuous right-to-left auto-scroll (marquee); the category list
          is duplicated so translating -50% loops seamlessly back to the
          start. Hovering pauses it (see .animate-marquee in globals.css). */}
      <div className="overflow-hidden">
        <div className="flex gap-4 w-max animate-marquee">
          {categories.map((cat) => (
            <CategoryItem key={`a-${cat.id}`} cat={cat} />
          ))}
          {categories.map((cat) => (
            <CategoryItem key={`b-${cat.id}`} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}
