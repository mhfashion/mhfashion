import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["shipping"];

export const metadata = infoPageMetadata(page);

export default function ShippingPage() {
  return <InfoPage page={page} />;
}
