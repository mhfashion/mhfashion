import InfoPage from "@/components/InfoPage";
import { infoPageMetadata } from "@/lib/storefront-info";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["privacy"];

export const metadata = infoPageMetadata(page);

export default function PrivacyPage() {
  return <InfoPage page={page} />;
}
