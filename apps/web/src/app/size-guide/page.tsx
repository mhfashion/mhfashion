import InfoPage from "@/components/InfoPage";
import { infoPageMetadata } from "@/lib/storefront-info";
import SizeChartLibrary from "@/components/SizeChartLibrary";
import { INFO_PAGES } from "@/lib/storefront-info";

const page = INFO_PAGES["size-guide"];

export const metadata = infoPageMetadata(page);

export default function SizeGuidePage() {
  return (
    <>
      <InfoPage page={page} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-10">
        <SizeChartLibrary />
      </div>
    </>
  );
}
