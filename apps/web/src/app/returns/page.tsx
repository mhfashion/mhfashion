import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["returns"];

export const metadata = infoPageMetadata(page);

export default function ReturnsPage() {
  return <InfoPage page={page} />;
}
