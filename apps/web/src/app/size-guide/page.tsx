import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["size-guide"];

export const metadata = infoPageMetadata(page);

export default function SizeGuidePage() {
  return <InfoPage page={page} />;
}
