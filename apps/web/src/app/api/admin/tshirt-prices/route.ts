import { isGoogleSheetUrl, readSheetPrices, sheetCsvUrl } from "@/lib/sheet-prices";

// The browser cannot read a Google Sheet directly (no CORS on the CSV endpoints), so the
// post editor posts the link here and this route fetches it server-side.
//
// The sheet must be shared as "anyone with the link can view" — no credentials are used.
// A private sheet needs a service account, which is a separate, credentialed setup.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let sheetUrl: unknown;
  try {
    ({ sheetUrl } = (await request.json()) as { sheetUrl?: unknown });
  } catch {
    return Response.json({ error: "Send { sheetUrl } as JSON." }, { status: 400 });
  }

  const csvUrl = typeof sheetUrl === "string" ? sheetCsvUrl(sheetUrl) : null;
  if (!csvUrl) {
    return Response.json({ error: "That does not look like a Google Sheet link." }, { status: 400 });
  }
  if (!isGoogleSheetUrl(csvUrl)) {
    return Response.json({ error: "Only Google Sheets links can be imported." }, { status: 400 });
  }

  const read = await readSheetPrices(csvUrl);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });
  return Response.json(read.result);
}
