type HeroProps = {
  // When set (admin has configured an ad), it takes priority over the default banner.
  adImageUrl?: string;
  adLinkUrl?: string;
};

export default function Hero({ adImageUrl, adLinkUrl }: HeroProps) {
  if (adImageUrl) {
    return (
      <a href={adLinkUrl ?? "#"} className="block mx-4 md:mx-6 my-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={adImageUrl}
          alt="Promotion"
          className="w-full rounded-xl object-cover"
        />
      </a>
    );
  }

  // Default banner — falls back here whenever no admin ad is configured.
  return (
    <section className="px-6 md:px-8 py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.1]">
        DESIGN YOUR
        <br />
        <span className="text-accent">OWN WORLD.</span>
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
  );
}
