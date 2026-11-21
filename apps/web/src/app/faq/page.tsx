import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["faq"];

export const metadata = infoPageMetadata(page);

export default function FaqPage() {
  return <InfoPage page={page} />;
}
