import Header from "@/components/Header";

export default function HomePage() {
  return (
    <main>
      <Header />
      <section className="px-8 py-12">
        <h1 className="text-3xl font-extrabold leading-tight">
          DESIGN YOUR <span className="text-accent">OWN WORLD.</span>
        </h1>
        <p className="text-text-secondary text-sm mt-3 mb-5">
          Wear what defines you — custom prints made your way.
        </p>
        <a
          href="/create"
          className="inline-block bg-accent text-accent-foreground font-semibold px-5 py-2.5 rounded"
        >
          Create design →
        </a>
      </section>
      {/* TODO: Category row, New Arrivals, Best Sellers, Shop by Collection, Footer */}
    </main>
  );
}
