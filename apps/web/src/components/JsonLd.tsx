import { serializeJsonLd } from "@/lib/structured-data";

/** Server-rendered JSON-LD. One node per script so a broken node cannot take the others down. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" data-json-ld dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
