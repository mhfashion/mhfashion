import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Heart, Palette } from "lucide-react";
import Header from "@/components/Header";
import T from "@/components/T";
import CategoryRow from "@/components/CategoryRow";
import ProductStrip from "@/components/ProductStrip";
import { getProductsBySubBrand } from "@/lib/products";
import { NYEIN_PIECES } from "@/lib/nyein-pieces";
import { NYEIN_BRAND } from "@/lib/product-editing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nyein — MH Fashion",
  description:
    "Nyein ready-made pieces from MH Fashion. Printed exactly as shown, so there is nothing to customise.",
};

export default async function NyeinPage() {
  const catalogue = await getProductsBySubBrand(NYEIN_BRAND);
  // A stand-in piece links to its own page too: the product page resolves the same fallback slug, so the
  // buying box (Buy Now, Add to Cart, the size box) can be tried before the catalogue carries Nyein rows.
  const pieces = catalogue.length ? catalogue : NYEIN_PIECES;
  const popular = pieces.slice(0, 5);
  const arrivals = [...pieces].reverse().slice(0, 5);

  return (
    <main>
      <Header />
      <div className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1480px]">
          <section className="relative isolate min-h-[155px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dcf4bc] to-[#b6e773] px-4 py-4 text-[#172810] sm:min-h-[250px] sm:px-10 sm:py-10 lg:min-h-[300px] lg:px-12">
            <div className="relative z-10 max-w-[68%] sm:max-w-[47%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4c9d16] sm:text-xs sm:tracking-[0.18em]">Nyein · MH Fashion</p>
              <h1 className="mt-2 text-2xl font-black leading-[0.95] tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
                <T k="nyein.title1" />
                <br />
                <span className="text-[#4d9e16]"><T k="nyein.title2" /></span>
              </h1>
              <p className="mt-2 max-w-sm text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">
                <T k="nyein.lead" />
              </p>
              <a
                href="#nyein-pieces"
                className="mt-3 inline-flex h-7 items-center rounded-full bg-[#55a918] px-3 text-[10px] font-bold text-white shadow-sm sm:mt-5 sm:h-9 sm:px-4 sm:text-xs"
              >
                <T k="nyein.cta" />
                <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" />
              </a>
            </div>
            <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-[#95d64a]/60 blur-sm sm:-right-12 sm:-top-24 sm:h-80 sm:w-80" />
            <div className="absolute bottom-[-75px] right-[15%] hidden h-80 w-52 rotate-[-6deg] rounded-[44%] bg-white/80 shadow-xl sm:block">
              <div className="absolute left-1/2 top-20 -translate-x-1/2 text-center text-3xl font-black leading-none text-[#4d9e16]">
                NYEIN
                <br />
                <span className="text-sm"><T k="nyein.mark" /></span>
              </div>
            </div>
            <div className="absolute bottom-3 right-3 text-2xl font-black italic leading-tight text-[#37770e]/80 sm:bottom-8 sm:right-7 sm:text-4xl">
              <T k="nyein.stamp1" />
              <br />
              <T k="nyein.stamp2" />
            </div>
            <BadgeCheck className="absolute bottom-3 left-4 text-[#37770e]/70 sm:bottom-8" size={20} />
          </section>

          <CategoryRow />

          <section className="mb-6" id="nyein-pieces">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black sm:text-base">
                <Heart size={17} className="text-accent" /> <T k="nyein.popular" />
              </h2>
              <span className="text-[10px] font-semibold text-text-muted sm:text-xs"><T k="nyein.readyMade" /></span>
            </div>
            <ProductStrip products={popular} />
          </section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black sm:text-base">
                <Palette size={17} className="text-accent" /> <T k="nyein.newTitle" />
              </h2>
              <span className="text-[10px] font-semibold text-text-muted sm:text-xs"><T k="nyein.noEditing" /></span>
            </div>
            <ProductStrip products={arrivals} />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <a href="/categories/t-shirts" className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#f5f5f2] to-[#dfe8d9] p-5 text-[#172810] sm:p-7">
              <div className="relative z-10">
                <h2 className="text-xl font-black sm:text-2xl"><T k="nyein.cottonTitle" /></h2>
                <p className="mt-1 text-xs text-[#4a5a44]"><T k="nyein.cottonLead" /></p>
                <span className="mt-5 inline-flex rounded-full bg-accent px-3 py-2 text-[10px] font-bold text-accent-foreground">
                  <T k="nyein.shopNow" /> <ArrowRight size={13} className="ml-1" />
                </span>
              </div>
              <div className="absolute -bottom-20 right-[-10px] h-48 w-48 rounded-full bg-white/80" />
              <span className="absolute bottom-5 right-9 text-4xl font-black text-[#85ad69]/60">NY</span>
            </a>
            <div className="relative min-h-[150px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#d7f5a8] via-[#79bf20] to-[#4e9e12] p-5 text-white sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">Nyein</p>
              <h2 className="mt-2 text-2xl font-black">
                <T k="nyein.story1" />
                <br />
                <T k="nyein.story2" />
              </h2>
              <p className="mt-1 text-xs text-white/85"><T k="nyein.storyLead" /></p>
              <span className="mt-4 inline-flex rounded-full bg-white px-3 py-2 text-[10px] font-bold text-[#4e9e12]">
                <T k="nyein.readyOnly" />
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
