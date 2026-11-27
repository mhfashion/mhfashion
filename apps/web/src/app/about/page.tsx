import InfoPage from "@/components/InfoPage";
import { infoPageMetadata } from "@/lib/storefront-info";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["about"];

export const metadata = infoPageMetadata(page);

export default function AboutPage() {
  return <InfoPage page={page} />;
}
