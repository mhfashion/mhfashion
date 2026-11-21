import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["cookie-policy"];

export const metadata = infoPageMetadata(page);

export default function CookiePolicyPage() {
  return <InfoPage page={page} />;
}
