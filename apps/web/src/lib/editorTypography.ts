import fontsManifest from "../../public/fonts/v1/manifest.json";
import textStylesManifest from "../../public/text-styles/v1/manifest.json";

export type FontOption = {
  id: string;
  name: string;
  family: string;
  category: string;
  tags: string[];
  source: "system" | "r2";
  r2Key: string;
};

export type TextFormatting = {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  textAlign: "left" | "center" | "right" | "justify";
  charSpacing: number;
  lineHeight: number;
  color: string;
};

export type TextPreset = {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  style: TextFormatting;
};

export type TextCombinationPart = {
  text: string;
  y: number;
  style: TextFormatting;
};

export type TextCombination = {
  id: string;
  name: string;
  previewKey: string;
  title: TextCombinationPart;
  subtitle: TextCombinationPart;
};

type FontManifest = { version: number; collection: string; sourceMode: string; fonts: FontOption[] };
type RawTextStyle = {
  fontId: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  textAlign: TextFormatting["textAlign"];
  charSpacing: number;
  lineHeight: number;
  color: string;
};
type RawPreset = Omit<TextPreset, "style"> & RawTextStyle;
type RawCombinationPart = Omit<TextCombinationPart, "style"> & RawTextStyle;
type TextStyleManifest = {
  version: number;
  collection: string;
  presets: RawPreset[];
  combinations: Array<{
    id: string;
    name: string;
    previewKey: string;
    title: RawCombinationPart;
    subtitle: RawCombinationPart;
  }>;
};

const fontManifest = fontsManifest as FontManifest;
const textManifest = textStylesManifest as TextStyleManifest;

export const FONT_LIBRARY = fontManifest.fonts;
export const FONT_CATEGORIES = [...new Set(FONT_LIBRARY.map((font) => font.category))];
export const DEFAULT_FONT = FONT_LIBRARY.find((font) => font.id === "arial") ?? FONT_LIBRARY[0];
const fontsById = new Map(FONT_LIBRARY.map((font) => [font.id, font]));

function toTextFormatting(raw: RawTextStyle): TextFormatting {
  const font = fontsById.get(raw.fontId) ?? DEFAULT_FONT;
  return {
    fontFamily: font.family,
    fontSize: raw.fontSize,
    fontWeight: raw.fontWeight,
    fontStyle: raw.fontStyle,
    underline: raw.underline,
    textAlign: raw.textAlign,
    charSpacing: raw.charSpacing,
    lineHeight: raw.lineHeight,
    color: raw.color,
  };
}

export const TEXT_PRESETS: TextPreset[] = textManifest.presets.map((preset) => ({
  id: preset.id,
  name: preset.name,
  description: preset.description,
  placeholder: preset.placeholder,
  style: toTextFormatting(preset),
}));

export const TEXT_COMBINATIONS: TextCombination[] = textManifest.combinations.map((combination) => ({
  id: combination.id,
  name: combination.name,
  previewKey: combination.previewKey,
  title: { text: combination.title.text, y: combination.title.y, style: toTextFormatting(combination.title) },
  subtitle: { text: combination.subtitle.text, y: combination.subtitle.y, style: toTextFormatting(combination.subtitle) },
}));

export const FONT_MANIFEST_VERSION = fontManifest.version;
export const TEXT_STYLES_MANIFEST_VERSION = textManifest.version;
