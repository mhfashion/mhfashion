import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["about"];

export const metadata = infoPageMetadata(page);

export default function AboutPage() {
  return <InfoPage page={page} />;
}
