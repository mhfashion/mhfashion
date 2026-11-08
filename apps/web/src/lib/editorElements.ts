import manifest from "../../public/elements/v1/manifest.json";

export type EditorElement = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  assetPath: string;
  r2Key: string;
  recolorable: boolean;
};

type ElementsManifest = {
  version: number;
  collection: string;
  items: EditorElement[];
};

const catalog = manifest as ElementsManifest;

export const EDITOR_ELEMENTS = catalog.items;
export const ELEMENT_CATEGORIES = [
  ...new Set(EDITOR_ELEMENTS.map((element) => element.category)),
];
export const ELEMENTS_MANIFEST_VERSION = catalog.version;

export function findEditorElement(id: string) {
  return EDITOR_ELEMENTS.find((element) => element.id === id);
}
