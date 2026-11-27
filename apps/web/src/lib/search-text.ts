// Plan §17 S1, S2 and S5: one normaliser for every search, so an English name and its Myanmar name find the
// same record. The editor's libraries (fonts, designs, elements, photos, patterns, text styles, brushes) filter
// in the browser with `matchesSearchQuery`, over the same text the storefront will use.

/** Zero-width characters that make two spellings of one Burmese word look different. */
const ZERO_WIDTH = /[\u200B\u200C\u200D\uFEFF]/g;

/**
 * The storage order of the signs that follow a consonant (Plan §17 S1): medial ya, ra, wa, ha; the e vowel; the
 * i/u/ai vowels; the anusvara; aa; the dot below; the asat; the visarga. A word stored as `က` + `ျ` + `ွ` and one
 * stored as `က` + `ွ` + `ျ` are the same word, so sorting the run makes them the same text. The asat sits before
 * the visarga because that is the order real text uses (every "င်း" in this repository is 103A then 1038), so
 * correct text is left untouched. U+1039 (virama) is absent on purpose: it joins the next consonant and must keep
 * its place.
 */
const SIGN_ORDER: Record<string, number> = {
  "\u103B": 10, // ျ medial ya
  "\u103C": 11, // ြ medial ra
  "\u103D": 12, // ွ medial wa
  "\u103E": 13, // ှ medial ha
  "\u1031": 20, // ေ e (rendered to the left of its consonant)
  "\u102D": 21, // ိ i
  "\u102E": 22, // ီ ii
  "\u102F": 23, // ု u
  "\u1030": 24, // ူ uu
  "\u1032": 25, // ဲ ai
  "\u1036": 30, // ံ anusvara
  "\u102B": 31, // ါ tall aa
  "\u102C": 32, // ာ aa
  "\u1037": 40, // ့ dot below
  "\u103A": 45, // ် asat, before the visarga: real Burmese text stores "င်း" as 103A then 1038
  "\u1038": 50, // း visarga
};

/** Put each run of signs that follows a base character into the standard order, and leave every other char. */
function orderMyanmarSigns(input: string): string {
  let out = "";
  let run: string[] = [];
  const flush = () => {
    if (run.length > 1) run.sort((a, b) => (SIGN_ORDER[a] ?? 100) - (SIGN_ORDER[b] ?? 100));
    out += run.join("");
    run = [];
  };
  for (const char of input) {
    if (char in SIGN_ORDER) {
      run.push(char);
      continue;
    }
    flush();
    out += char;
  }
  flush();
  return out;
}

/** The text a search compares: NFC, no zero-width characters, one space between words, lower case. */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  const folded = input.normalize("NFC").replace(ZERO_WIDTH, "").replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();
  return orderMyanmarSigns(folded);
}

/** The words of a query. A Myanmar query has no spaces, so it stays one word and matches as a substring. */
export function searchWords(query: string | null | undefined): string[] {
  const normal = normalizeSearchText(query);
  return normal ? normal.split(" ").filter(Boolean) : [];
}

/**
 * Whether `haystack` answers `query`: every word must appear, so `black tee` finds "Tee — black" and a
 * half-typed word still finds its record (Plan §17 S2). An empty query matches everything.
 */
export function matchesSearchQuery(haystack: string | null | undefined, query: string | null | undefined): boolean {
  const words = searchWords(query);
  if (!words.length) return true;
  const text = normalizeSearchText(haystack);
  return words.every((word) => text.includes(word));
}
