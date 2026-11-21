import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["privacy"];

export const metadata = infoPageMetadata(page);

export default function PrivacyPage() {
  return <InfoPage page={page} />;
}
