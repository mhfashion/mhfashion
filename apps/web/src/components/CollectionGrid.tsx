const COLLECTIONS = [
  { name: "Minimal", slug: "minimal" },
  { name: "Street Art", slug: "street-art" },
  { name: "Anime", slug: "anime" },
  { name: "Dark Style", slug: "dark-style" },
];

export default function CollectionGrid() {
  return (
    <section className="px-6 md:px-8 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">SHOP BY COLLECTION</h2>
        <a href="/collections" className="text-xs text-accent">
          See All →
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {COLLECTIONS.map((c) => (
          <a
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="relative aspect-[4/5] rounded-lg bg-bg-surface flex items-end p-2.5"
          >
            <span className="text-xs font-semibold">{c.name} →</span>
          </a>
        ))}
      </div>
    </section>
  );
}
