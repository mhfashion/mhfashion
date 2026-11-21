import InfoPage, { infoPageMetadata } from "@/components/InfoPage";
import JsonLd from "@/components/JsonLd";
import { INFO_PAGES } from "@/lib/storefront-info";
import { faqSchema } from "@/lib/structured-data";

const page = INFO_PAGES["faq"];

export const metadata = infoPageMetadata(page);

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqSchema(page.sections)} />
      <InfoPage page={page} />
    </>
  );
}
