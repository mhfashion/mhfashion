"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-6 border-t border-border px-4 py-4 md:px-8 md:py-6">
      <div className="hidden md:grid grid-cols-2 md:grid-cols-5 gap-5 pb-5 border-b border-border">
        <div className="col-span-2 md:col-span-1">
          <p className="font-bold text-sm mb-2">MH FASHION.</p>
          <p className="text-[10px] text-text-muted leading-relaxed">
            {t("footer.description")}
          </p>
          <div className="flex gap-2.5 mt-3 text-text-secondary text-xs">
            <span>FB</span>
            <span>IG</span>
            <span>TikTok</span>
            <span>YT</span>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">{t("footer.shop")}</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/products">{t("nav.allProducts")}</a></li>
            <li><a href="/new">{t("nav.newArrivals")}</a></li>
            <li><a href="/best-sellers">{t("nav.bestSellers")}</a></li>
            <li><a href="/collections">{t("nav.collectionsPlural")}</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">{t("footer.help")}</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/guide">{t("nav.guide")}</a></li>
            <li><a href="/faq">{t("nav.faq")}</a></li>
            <li><a href="/contact">{t("nav.contact")}</a></li>
            <li><a href="/shipping">{t("nav.shipping")}</a></li>
            <li><a href="/returns">{t("nav.returns")}</a></li>
            <li><a href="/size-guide">{t("nav.sizeGuide")}</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">{t("footer.legal")}</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/about">About Us</a></li>
            <li><a href="/terms">Terms of Use</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/cookie-policy">Cookie Policy</a></li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <p className="text-[10px] font-semibold text-text-muted mb-2">
            {t("footer.newsletter")}
          </p>
          <p className="text-[9px] text-text-muted mb-2">
            {t("footer.discount")}
          </p>
          <form className="flex gap-1.5">
            <input
              type="email"
              placeholder={t("footer.email")}
              className="flex-1 bg-bg-surface rounded-md h-6 px-2 text-[9px] text-text-primary placeholder:text-text-faint"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="w-6 h-6 bg-accent rounded-md text-accent-foreground text-xs"
            >
              →
            </button>
          </form>
        </div>
      </div>

      {/* Payment methods (split Myanmar / International) + app download,
          mirroring the reference layout the user provided. */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 py-5 border-b border-border">
        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">
            {t("footer.myanmarPayment")}
          </p>
          <div className="flex flex-wrap gap-1.5 text-[9px] text-text-secondary">
            <span className="border border-border-light rounded px-1.5 py-0.5">KBZPay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">Wave Pay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">AYA Pay</span>
          </div>
        </div>

        <div className="md:text-center">
          <p className="text-[10px] font-semibold text-text-muted mb-2">
            {t("footer.download")}
          </p>
          <div className="flex gap-1.5 md:justify-center">
            <a
              href="#"
              className="border border-border-light rounded px-2.5 py-1 text-[9px] text-text-secondary"
            >
              App Store
            </a>
            <a
              href="#"
              className="border border-border-light rounded px-2.5 py-1 text-[9px] text-text-secondary"
            >
              Google Play
            </a>
          </div>
        </div>

        <div className="md:text-right">
          <p className="text-[10px] font-semibold text-text-muted mb-2">
            {t("footer.internationalPayment")}
          </p>
          <div className="flex flex-wrap gap-1.5 text-[9px] text-text-secondary md:justify-end">
            <span className="border border-border-light rounded px-1.5 py-0.5">Visa</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">Mastercard</span>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-text-faint text-center pt-1 md:pt-4">
        © {new Date().getFullYear()} MH Fashion. {t("footer.rights")}
      </p>
    </footer>
  );
}
