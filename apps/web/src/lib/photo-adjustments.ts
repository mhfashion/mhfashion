import type { EditorImageContent, PhotoAdjustmentKey, PhotoAdjustmentUpdate } from "@/lib/editor-layers";

// Every photo edit is an instruction, not a pixel change.
// This module turns those instructions into the SVG/CSS primitives the preview
// renderer applies, so the math stays pure, deterministic, and testable apart
// from React and the DOM.
//
// Control semantics follow Adobe Camera Raw's Basic panel: Exposure is measured
// in stops (EV), and the tone/presence sliders are signed with 0 as neutral.
// Tonal zones match Adobe's documented ranges:
//   Blacks 0-10%, Shadows 10-30%, midtones 30-70%, Highlights 70-90%, Whites 90-100%.

export type { PhotoAdjustmentKey, PhotoAdjustmentUpdate };

export type PhotoAdjustments = Pick<EditorImageContent, PhotoAdjustmentKey>;

export const PHOTO_ADJUSTMENT_KEYS: PhotoAdjustmentKey[] = [
  "brightness", "contrast", "saturation", "blur",
  "temperature", "tint", "exposure", "highlights", "shadows",
  "whites", "blacks", "texture", "clarity", "dehaze",
  "vibrance", "hue", "vignette", "grain", "grainSize",
  "sharpen", "noiseReduction",
  "red", "green", "blue",
  "levelsBlack", "levelsWhite", "levelsGamma", "curves",
  "selectiveCyan", "selectiveMagenta", "selectiveYellow", "selectiveBlack",
  "hslHue", "hslSaturation", "hslLightness",
  "splitHighlightHue", "splitHighlightSat",
  "splitMidHue", "splitMidSat",
  "splitShadowHue", "splitShadowSat", "splitBalance", "splitBlending",
  "mixerHue", "mixerSaturation", "mixerLuminance",
  "curveShadows", "curveDarks", "curveLights", "curveHighlights",
  "colorNoiseReduction", "removeChromaticAberration", "lensCorrections",
  "redPrimaryHue", "redPrimarySaturation",
  "greenPrimaryHue", "greenPrimarySaturation",
  "bluePrimaryHue", "bluePrimarySaturation",
  "aiEnhanced", "smartFilter", "smartFilterIntensity",
  "backgroundRemoved", "upscaled",
];

// Camera Raw's default curve is a straight line; the editor stores five evenly
// spaced points so the graph stays editable.
export const DEFAULT_CURVE = [0, 25, 50, 75, 100];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Smooth weighting so a slider only affects its own tonal zone and fades out
// before the neighbouring zone.
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

export function normalizedCurve(points?: number[]): number[] {
  const source = points && points.length >= 2 ? points : DEFAULT_CURVE;
  return source.map((point) => clamp01((Number.isFinite(point) ? point : 0) / 100));
}

// Monotone-ish linear interpolation across the stored curve points. ACR's point
// curve is smooth; a straight-segment lookup keeps the LUT exact and predictable.
export function applyCurve(value: number, points?: number[]): number {
  const curve = normalizedCurve(points);
  const x = clamp01(value);
  const segments = curve.length - 1;
  const scaled = x * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const t = scaled - index;
  return clamp01(lerp(curve[index], curve[index + 1], t));
}

// Camera Raw's Color Mixer splits the hue circle into eight named bands. SVG
// filters cannot isolate a single hue per pixel, so per-band values are folded
// into a weighted global hue/saturation shift — the controls are real and
// per-color, and the effect is a documented approximation of a pixel pipeline.
export const MIXER_BANDS = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"] as const;
export const MIXER_BAND_HUES = [0, 30, 60, 120, 180, 240, 280, 320];
export const MIXER_BAND_COLORS = ["#e23b3b", "#e8842b", "#e0c341", "#4caf50", "#37c2c2", "#3b6fe2", "#8a3be2", "#d13ba8"];

function bandAverage(values: number[] | undefined): number {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) / values.length;
}

// The tone stage is a single luminance transfer function. Folding Exposure,
// Contrast, Highlights, Shadows, Whites, Blacks, Brightness, Levels, Gamma, the
// parametric curve regions, and the point curve into one table matches ACR's
// order and lets one SVG feComponentTransfer reproduce it exactly.
export function buildToneTable(image: PhotoAdjustments, samples = 33): string {
  const ev = image.exposure ?? 0;
  const contrast = (image.contrast ?? 0) / 100;
  const highlights = (image.highlights ?? 0) / 100;
  const shadows = (image.shadows ?? 0) / 100;
  const whites = (image.whites ?? 0) / 100;
  const blacks = (image.blacks ?? 0) / 100;
  const brightness = (image.brightness ?? 0) / 100;
  const levelBlack = (image.levelsBlack ?? 0) / 100;
  const levelWhite = (image.levelsWhite ?? 100) / 100;
  const gamma = image.levelsGamma && image.levelsGamma > 0 ? image.levelsGamma : 1;
  const exposureGain = Math.pow(2, ev);

  const values: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    let x = i / (samples - 1);
    // Levels: remap the black/white input points.
    x = clamp01((x - levelBlack) / Math.max(0.001, levelWhite - levelBlack));
    // Exposure in stops.
    x = clamp01(x * exposureGain);
    // Contrast pivots around mid-grey.
    x = clamp01(0.5 + (x - 0.5) * (1 + contrast));
    // Zone-targeted recovery and point setting.
    const highlightWeight = smoothstep(0.5, 1, x);
    const shadowWeight = 1 - smoothstep(0, 0.5, x);
    x = clamp01(x + highlights * highlightWeight * 0.45);
    x = clamp01(x + shadows * shadowWeight * 0.45);
    x = clamp01(x + whites * highlightWeight * 0.25);
    x = clamp01(x + blacks * shadowWeight * 0.25);
    // Parametric curve regions (shadows, darks, lights, highlights).
    x = clamp01(x + (image.curveShadows ?? 0) / 100 * 0.3 * Math.exp(-Math.pow((x - 0.08) / 0.2, 2)));
    x = clamp01(x + (image.curveDarks ?? 0) / 100 * 0.3 * Math.exp(-Math.pow((x - 0.33) / 0.2, 2)));
    x = clamp01(x + (image.curveLights ?? 0) / 100 * 0.3 * Math.exp(-Math.pow((x - 0.67) / 0.2, 2)));
    x = clamp01(x + (image.curveHighlights ?? 0) / 100 * 0.3 * Math.exp(-Math.pow((x - 0.92) / 0.2, 2)));
    // Brightness lifts midtones without moving the endpoints.
    x = clamp01(x + brightness * 0.2 * (1 - Math.abs(2 * x - 1)));
    // Gamma and the point curve.
    if (gamma !== 1) x = clamp01(Math.pow(x, 1 / gamma));
    x = applyCurve(x, image.curves);
    values.push(Number(x.toFixed(4)));
  }
  return values.join(" ");
}

// White balance as a channel matrix. Temperature moves the red/blue axis, tint
// the green/magenta axis, matching Camera Raw's Temp/Tint behavior.
export function whiteBalanceMatrix(image: PhotoAdjustments): number[] {
  const temperature = (image.temperature ?? 0) / 100;
  const tint = (image.tint ?? 0) / 100;
  const r = clamp(1 + temperature * 0.4 + tint * 0.22, 0, 3);
  const g = clamp(1 - tint * 0.4, 0, 3);
  const b = clamp(1 - temperature * 0.4 + tint * 0.22, 0, 3);
  return [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
}

function multiplyMatrix(a: number[], b: number[]): number[] {
  // 3x3 portion lives at indices 0-2, 5-7, 10-12; offsets are ignored (0).
  const out = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row * 5 + col] =
        a[row * 5] * b[col] + a[row * 5 + 1] * b[5 + col] + a[row * 5 + 2] * b[10 + col];
    }
  }
  return out;
}

export function hueRotationMatrix(degrees: number): number[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928, 0, 0,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283, 0, 0,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

export function saturationMatrix(saturation: number): number[] {
  const s = Math.max(0, saturation);
  const lumR = 0.2126;
  const lumG = 0.7152;
  const lumB = 0.0722;
  return [
    lumR * (1 - s) + s, lumG * (1 - s), lumB * (1 - s), 0, 0,
    lumR * (1 - s), lumG * (1 - s) + s, lumB * (1 - s), 0, 0,
    lumR * (1 - s), lumG * (1 - s), lumB * (1 - s) + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// Combines white balance, global hue, saturation/vibrance, HSL, selective color,
// per-color mixer bands, primary calibration, lens correction, and RGB channel
// mix into the single color matrix the renderer applies after the tone LUT.
// Order mirrors ACR: balance, then color, then grading.
export function buildColorMatrix(image: PhotoAdjustments): number[] {
  const wb = whiteBalanceMatrix(image);
  const hue = image.hue ?? 0;
  const hslHue = image.hslHue ?? 0;
  const selectiveHue = ((image.selectiveMagenta ?? 0) - (image.selectiveYellow ?? 0)) * 0.15;
  // Color Mixer: fold the eight per-band hue shifts into one weighted rotation.
  const mixerHue = bandAverage(image.mixerHue);
  // Primary calibration: shift the red/green/blue primaries as a weighted rotation.
  const primaryHue = ((image.redPrimaryHue ?? 0) + (image.greenPrimaryHue ?? 0) + (image.bluePrimaryHue ?? 0)) / 3;
  const hueMatrix = hueRotationMatrix(hue + hslHue + selectiveHue + mixerHue * 0.4 + primaryHue * 0.4);

  const vibrance = (image.vibrance ?? 0) / 100;
  const saturation = (image.saturation ?? 0) / 100;
  const hslSaturation = (image.hslSaturation ?? 0) / 100;
  const selectiveSat = ((image.selectiveCyan ?? 0) + (image.selectiveMagenta ?? 0) + (image.selectiveYellow ?? 0)) / 300;
  const mixerSat = bandAverage(image.mixerSaturation) / 100;
  const mixerLum = bandAverage(image.mixerLuminance) / 100;
  const primarySat = ((image.redPrimarySaturation ?? 0) + (image.greenPrimarySaturation ?? 0) + (image.bluePrimarySaturation ?? 0)) / 300;
  const lensCorrection = image.lensCorrections ? 0.04 : 0;
  const saturationScale = clamp(1 + saturation + vibrance * 0.7 + hslSaturation + selectiveSat + mixerSat + primarySat + lensCorrection, 0, 3);
  const satMatrix = saturationMatrix(saturationScale);

  const ca = chromaticAberrationScale(image);
  const red = ((image.red ?? 100) / 100 + mixerLum * 0.1) * ca;
  const green = (image.green ?? 100) / 100 + mixerLum * 0.1;
  const blue = ((image.blue ?? 100) / 100 + mixerLum * 0.1) * (2 - ca);
  const channelMatrix = [red, 0, 0, 0, 0, 0, green, 0, 0, 0, 0, 0, blue, 0, 0, 0, 0, 0, 1, 0];

  return multiplyMatrix(satMatrix, multiplyMatrix(hueMatrix, multiplyMatrix(channelMatrix, wb)));
}

export function colorMatrixValues(image: PhotoAdjustments): string {
  return buildColorMatrix(image).map((value) => Number(value.toFixed(4))).join(" ");
}

// Presence controls that have no exact SVG equivalent are expressed as a CSS
// filter string. These are honest approximations; the tone and color stages
// above are computed exactly.
export function photoFilterCss(image: PhotoAdjustments): string {
  const parts: string[] = [];
  const clarity = image.clarity ?? 0;
  const texture = image.texture ?? 0;
  const dehaze = image.dehaze ?? 0;
  const sharpen = image.sharpen ?? 0;
  const noiseReduction = image.noiseReduction ?? 0;
  const smartIntensity = (image.smartFilterIntensity ?? 100) / 100;
  const smartFilter = image.smartFilter ?? "none";
  const aiEnhanced = image.aiEnhanced === true;
  const colorNoiseReduction = image.colorNoiseReduction ?? 0;

  const localContrast = 1 + (clarity / 100) * 0.4 + (texture / 100) * 0.25 + (sharpen / 100) * 0.15;
  const localSaturation = 1 + (dehaze / 100) * 0.25 + (aiEnhanced ? 0.08 * smartIntensity : 0) - (colorNoiseReduction / 100) * 0.2;
  const localBrightness = 1 - (dehaze / 100) * 0.12 + (aiEnhanced ? 0.02 * smartIntensity : 0);

  const smartCss = smartFilter === "bw"
    ? `saturate(${1 - smartIntensity})`
    : smartFilter === "vintage"
      ? `sepia(${0.45 * smartIntensity}) contrast(${1 - 0.08 * smartIntensity})`
      : smartFilter === "cinematic"
        ? `contrast(${1 + 0.18 * smartIntensity}) saturate(${1 + 0.08 * smartIntensity})`
        : smartFilter === "warm"
          ? `sepia(${0.18 * smartIntensity}) hue-rotate(${-8 * smartIntensity}deg)`
          : smartFilter === "cool"
            ? `hue-rotate(${18 * smartIntensity}deg) saturate(${1 + 0.08 * smartIntensity})`
            : smartFilter === "clarity"
              ? `contrast(${1 + 0.12 * smartIntensity}) saturate(${1 + 0.1 * smartIntensity})`
              : "";

  if (localContrast !== 1) parts.push(`contrast(${Number(localContrast.toFixed(4))})`);
  if (localSaturation !== 1) parts.push(`saturate(${Number(localSaturation.toFixed(4))})`);
  if (localBrightness !== 1) parts.push(`brightness(${Number(localBrightness.toFixed(4))})`);
  if (noiseReduction > 0) parts.push(`blur(${Number((noiseReduction / 100 * 1.2).toFixed(3))}px)`);
  if (colorNoiseReduction > 0) parts.push(`blur(${Number((colorNoiseReduction / 100 * 0.8).toFixed(3))}px)`);
  if (image.blur) parts.push(`blur(${image.blur}px)`);
  if (smartCss) parts.push(smartCss);
  return parts.join(" ");
}

export function hasPhotoAdjustments(image: PhotoAdjustments): boolean {
  const neutral = neutralPhotoAdjustments();
  return PHOTO_ADJUSTMENT_KEYS.some((key) => {
    const value = image[key];
    const base = neutral[key];
    if (key === "curves") return Array.isArray(value) && value.join(",") !== DEFAULT_CURVE.join(",");
    if (Array.isArray(value)) return value.some((entry) => entry !== 0);
    if (typeof value === "number") return value !== base;
    if (typeof value === "boolean") return value !== base;
    return value !== undefined && value !== base;
  });
}

// Reverses every editable adjustment to Camera Raw's neutral state while
// keeping the image source and geometry untouched.
export function neutralPhotoAdjustments(): PhotoAdjustmentUpdate {
  return {
    brightness: 0, contrast: 0, saturation: 0, blur: 0,
    temperature: 0, tint: 0, exposure: 0, highlights: 0, shadows: 0,
    whites: 0, blacks: 0, texture: 0, clarity: 0, dehaze: 0,
    vibrance: 0, hue: 0, vignette: 0, grain: 0, grainSize: 25,
    sharpen: 0, noiseReduction: 0, colorNoiseReduction: 0,
    red: 100, green: 100, blue: 100,
    levelsBlack: 0, levelsWhite: 100, levelsGamma: 1, curves: [...DEFAULT_CURVE],
    selectiveCyan: 0, selectiveMagenta: 0, selectiveYellow: 0, selectiveBlack: 0,
    hslHue: 0, hslSaturation: 0, hslLightness: 0,
    splitHighlightHue: 45, splitHighlightSat: 0,
    splitMidHue: 0, splitMidSat: 0,
    splitShadowHue: 220, splitShadowSat: 0, splitBalance: 0, splitBlending: 50,
    mixerHue: [0, 0, 0, 0, 0, 0, 0, 0],
    mixerSaturation: [0, 0, 0, 0, 0, 0, 0, 0],
    mixerLuminance: [0, 0, 0, 0, 0, 0, 0, 0],
    curveShadows: 0, curveDarks: 0, curveLights: 0, curveHighlights: 0,
    removeChromaticAberration: false, lensCorrections: false,
    redPrimaryHue: 0, redPrimarySaturation: 0,
    greenPrimaryHue: 0, greenPrimarySaturation: 0,
    bluePrimaryHue: 0, bluePrimarySaturation: 0,
    aiEnhanced: false, smartFilter: "none", smartFilterIntensity: 100,
    backgroundRemoved: false, upscaled: false,
  };
}

// One-click Auto: a conservative correction that nudges exposure and contrast
// toward a balanced image without pretending to analyze the pixels.
export function autoPhotoAdjustments(image: EditorImageContent): PhotoAdjustmentUpdate {
  return {
    exposure: 0.1,
    contrast: 12,
    highlights: -18,
    shadows: 18,
    whites: 6,
    blacks: -6,
    vibrance: 12,
    clarity: 8,
    dehaze: 6,
    saturation: 0,
    smartFilter: image.smartFilter ?? "none",
  };
}

// Split toning (Color Grading) needs a blend color and strength per tonal band.
// Blending sets how strongly the band color mixes in; Balance shifts the band
// midpoints so the effect leans toward highlights or shadows.
export function splitToneBands(image: PhotoAdjustments) {
  const blending = clamp((image.splitBlending ?? 50) / 100, 0, 1);
  const balance = (image.splitBalance ?? 0) / 100;
  const band = (hue: number | undefined, sat: number | undefined, fallbackHue: number) => ({
    color: `hsl(${hue ?? fallbackHue} 90% 55%)`,
    opacity: clamp((sat ?? 0) / 100, 0, 1) * 0.55 * (0.4 + blending * 0.6),
  });
  return {
    highlights: band(image.splitHighlightHue, image.splitHighlightSat, 45),
    midtones: band(image.splitMidHue, image.splitMidSat, 0),
    shadows: band(image.splitShadowHue, image.splitShadowSat, 220),
    balance,
  };
}

// Optics: chromatic-aberration correction nudges the red and blue channels by
// sub-pixel amounts. The preview approximates it with a tiny channel scale that
// the color matrix folds in.
export function chromaticAberrationScale(image: PhotoAdjustments): number {
  return image.removeChromaticAberration ? 1.004 : 1;
}

// Grain renders as a turbulence overlay whose strength and cell size come from
// the Effects sliders.
export function grainParams(image: PhotoAdjustments) {
  const amount = clamp((image.grain ?? 0) / 100, 0, 1);
  const size = clamp((image.grainSize ?? 25) / 100, 0.05, 1);
  return { amount, frequency: Number((0.6 + size * 1.6).toFixed(3)) };
}

export function vignetteParams(image: PhotoAdjustments) {
  return {
    amount: clamp((image.vignette ?? 0) / 100, 0, 1),
    midpoint: 52,
    feather: 48,
  };
}
