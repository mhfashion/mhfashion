import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["terms"];

export const metadata = infoPageMetadata(page);

export default function TermsPage() {
  return <InfoPage page={page} />;
}
