// Photos section of the Editor Sidebar.
//
// The shop has no licensed stock photography yet, so these entries point at Lorem Picsum — a free
// placeholder service with stable seeded URLs and open CORS — and `placeholder` marks them as such.
// When licensed photos land in R2, change `url` to the object URL and flip `placeholder` to false;
// the sidebar panel and the canvas read nothing else, so no other code has to move.

export const PHOTO_LIBRARY_STATUS = "placeholder-stock";

export type PhotoLibraryEntry = {
  id: string;
  name: string;
  /** Where the photo is fetched from. */
  url: string;
  /** The photo's own pixel size, used to fit it onto the print canvas. */
  width: number;
  height: number;
  credit: string;
  /** True while the entry is a placeholder rather than a licensed photograph. */
  placeholder: boolean;
};

function picsum(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export const MH_PHOTO_LIBRARY: PhotoLibraryEntry[] = [
  { id: "photo-tee-flatlay", name: "Tee flat lay", url: picsum("mh-tee-flatlay", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-street-portrait", name: "Street portrait", url: picsum("mh-street-portrait", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-studio-model", name: "Studio model", url: picsum("mh-studio-model", 1200, 1600), width: 1200, height: 1600, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-fabric-closeup", name: "Fabric close-up", url: picsum("mh-fabric-closeup", 1400, 1400), width: 1400, height: 1400, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-yangon-street", name: "Yangon street", url: picsum("mh-yangon-street", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-hoodie-hang", name: "Hoodie on a hanger", url: picsum("mh-hoodie-hang", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-team-jersey", name: "Team jersey", url: picsum("mh-team-jersey", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-print-detail", name: "Print detail", url: picsum("mh-print-detail", 1400, 1400), width: 1400, height: 1400, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-cotton-texture", name: "Cotton texture", url: picsum("mh-cotton-texture", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
];

export function findPhoto(id: string): PhotoLibraryEntry | undefined {
  return MH_PHOTO_LIBRARY.find((photo) => photo.id === id);
}
