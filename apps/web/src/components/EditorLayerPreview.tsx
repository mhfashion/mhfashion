"use client";

import { useId, type SVGProps } from "react";
import type { EditorImageContent, EditorShapePath, EditorShapeStyle, EditorTextContent, EditorTextEffect } from "@/lib/editor-layers";
import { EDITOR_TEXT_FONT_FAMILY, roundEditorShapePath } from "@/lib/editor-layers";
import { buildToneTable, colorMatrixValues, grainParams, photoFilterCss, splitToneBands, vignetteParams } from "@/lib/photo-adjustments";

// The print canvas and every preview share one 1000 x 1200 unit artwork space.
export const EDITOR_ARTWORK_VIEWBOX = "0 0 1000 1200";
export { EDITOR_TEXT_FONT_FAMILY };

export default function EditorLayerPreview({
  paths = [],
  shapeStyle = null,
  text = null,
  image = null,
}: {
  paths?: EditorShapePath[];
  shapeStyle?: EditorShapeStyle | null;
  text?: EditorTextContent | null;
  image?: EditorImageContent | null;
}) {
  const rawId = useId();
  const effectPrefix = `text-effect-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "preview"}`;
  const imageFilterId = `${effectPrefix}-image`;
  const imageGradientId = `${effectPrefix}-image-gradient`;
  const imageGrainId = `${effectPrefix}-image-grain`;
  const vignetteId = `${effectPrefix}-vignette`;
  const shapeShadowId = `${effectPrefix}-shape-shadow`;
  const shapeGlowId = `${effectPrefix}-shape-glow`;
  const toneTable = image ? buildToneTable(image) : "";
  const colorValues = image ? colorMatrixValues(image) : "";
  const imageFilterCss = image ? photoFilterCss(image) : "";
  const grain = image ? grainParams(image) : { amount: 0, frequency: 1 };
  const vignette = image ? vignetteParams(image) : { amount: 0, midpoint: 52, feather: 48 };
  const bands = image ? splitToneBands(image) : null;
  const splitToneStrength = bands ? Math.max(bands.highlights.opacity, bands.midtones.opacity, bands.shadows.opacity) : 0;
  const effectKey = (effect: EditorTextEffect) => effect.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const shapeDash = shapeStyle?.strokeStyle === "dash"
    ? `${Math.max(8, (shapeStyle.strokeWidth || 8) * 2)} ${Math.max(6, shapeStyle.strokeWidth || 8)}`
    : shapeStyle?.strokeStyle === "dot"
      ? `0.01 ${Math.max(8, (shapeStyle.strokeWidth || 8) * 2)}`
      : undefined;
  const shapeFilter = shapeStyle?.glow.enabled
    ? `url(#${shapeGlowId})`
    : shapeStyle?.shadow.enabled
      ? `url(#${shapeShadowId})`
      : undefined;
  const shapeFill = !shapeStyle || !shapeStyle.fillEnabled ? "none" : shapeStyle.fill;
  const shapeStrokeWidth = shapeStyle?.strokeWidth ?? 0;
  const shapeStroke = shapeStyle && shapeStrokeWidth > 0 ? shapeStyle.stroke : "none";
  const shapePaths = shapeStyle
    ? paths.map((path) => ({ ...path, d: roundEditorShapePath(path.d, shapeStyle.cornerRadius) }))
    : paths;
  return (
    <>
      {shapeStyle && (shapeStyle.shadow.enabled || shapeStyle.glow.enabled) && (
        <defs>
          {shapeStyle.shadow.enabled && (
            <filter id={shapeShadowId} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx={shapeStyle.shadow.offsetX} dy={shapeStyle.shadow.offsetY} stdDeviation={shapeStyle.shadow.blur} floodColor={shapeStyle.shadow.color} floodOpacity={shapeStyle.shadow.opacity} />
            </filter>
          )}
          {shapeStyle.glow.enabled && (
            <filter id={shapeGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={shapeStyle.glow.width / 3} result="blur" />
              <feFlood floodColor={shapeStyle.glow.color} floodOpacity={shapeStyle.glow.opacity} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
      )}
      {shapePaths.map((path, index) => (
        <path
          key={`shape-${index}`}
          d={path.d}
          fill={shapeStyle ? shapeFill : path.fill ?? "none"}
          fillOpacity={shapeStyle ? shapeStyle.fillOpacity / 100 : undefined}
          stroke={shapeStyle ? shapeStroke : path.stroke ?? "none"}
          strokeWidth={shapeStyle ? shapeStrokeWidth : path.strokeWidth ?? 20}
          strokeDasharray={shapeStyle ? shapeDash : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={shapeStyle ? shapeFilter : undefined}
          data-editor-shape-path="true"
          data-editor-shape-style={shapeStyle ? "true" : undefined}
        />
      ))}
      {text && (() => {
        const textAnchor = text.textAlign === "left" ? "start" : text.textAlign === "right" ? "end" : "middle";
        const textStyle = {
          fontFamily: text.fontFamily ?? EDITOR_TEXT_FONT_FAMILY,
          fontWeight: text.fontWeight ?? 700,
          fontStyle: text.fontStyle ?? "normal",
          textDecoration: text.underline ? "underline" : "none",
          letterSpacing: `${text.letterSpacing ?? 0}px`,
        };
        const transform = text.textTransform === "arch" ? `rotate(-6 ${text.x} ${text.y})` : text.textTransform === "wave" ? "skewX(-4)" : undefined;
        const legacyEffects: EditorTextEffect[] = text.textEffect === "shadow"
          ? [{ id: "legacy-shadow", kind: "shadow", color: text.effectColor ?? "#000000", offsetX: text.effectOffset ?? 12, offsetY: text.effectOffset ?? 12, blur: text.effectBlur ?? 0 }]
          : text.textEffect === "outline"
            ? [{ id: "legacy-outline", kind: "outline", color: text.effectColor ?? "#000000", width: text.outlineWidth ?? 6 }]
            : [];
        const effects = text.effects ?? legacyEffects;
        const lines = text.value.split("\n");
        const lineHeight = text.fontSize * (text.lineHeight ?? 1.2);
        type TextEffectProps = SVGProps<SVGTextElement> & { "data-editor-text-effect"?: string; "data-editor-text-content"?: string };
        const drawText = (key: string, props: TextEffectProps = {}) => (
          <text key={key} x={text.x} y={text.y} fontSize={text.fontSize} textAnchor={textAnchor} style={textStyle} data-editor-text-content="true" {...props}>
            {lines.map((line, index) => (
              <tspan key={index} x={text.x} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
            ))}
          </text>
        );
        return (
          <g transform={transform} data-editor-text-transform={text.textTransform ?? "none"}>
            <defs>
              {effects.filter((effect) => effect.enabled !== false && (effect.kind === "glow" || (effect.kind === "shadow" && (effect.blur ?? 0) > 0))).map((effect) => (
                <filter key={effect.id} id={`${effectPrefix}-blur-${effectKey(effect)}`} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation={Math.max(0.5, Math.min(20, effect.blur ?? 4))} />
                </filter>
              ))}
              {effects.filter((effect) => effect.enabled !== false && effect.kind === "stripe").map((effect) => (
                <pattern key={effect.id} id={`${effectPrefix}-stripe-${effectKey(effect)}`} width={Math.max(6, effect.distance ?? 14)} height={Math.max(6, effect.distance ?? 14)} patternUnits="userSpaceOnUse" patternTransform={`rotate(${effect.angle ?? -30})`}>
                  <path d={`M 0 0 H ${Math.max(6, effect.distance ?? 14)}`} fill="none" stroke={effect.color} strokeWidth={Math.max(1, effect.width ?? 4)} />
                </pattern>
              ))}
            </defs>
            {effects.map((effect) => {
              if (effect.enabled === false) return null;
              const opacity = Math.max(0.05, Math.min(1, effect.opacity ?? 0.72));
              const offsetX = effect.offsetX ?? 10;
              const offsetY = effect.offsetY ?? 10;
              const key = effectKey(effect);
              if (effect.kind === "shadow" || effect.kind === "offset") {
                return drawText(`effect-${key}`, { x: text.x + offsetX, y: text.y + offsetY, fill: effect.color, opacity, filter: effect.kind === "shadow" && (effect.blur ?? 0) > 0 ? `url(#${effectPrefix}-blur-${key})` : undefined, "data-editor-text-effect": effect.kind });
              }
              if (effect.kind === "outline") {
                return drawText(`effect-${key}`, { fill: "none", stroke: effect.color, strokeWidth: effect.width ?? 6, paintOrder: "stroke", opacity, "data-editor-text-effect": effect.kind });
              }
              if (effect.kind === "glow") {
                return drawText(`effect-${key}`, { fill: "none", stroke: effect.color, strokeWidth: (effect.width ?? 12) * 1.5, filter: `url(#${effectPrefix}-blur-${key})`, opacity: opacity * 0.8, "data-editor-text-effect": effect.kind });
              }
              if (effect.kind === "echo") {
                const count = Math.max(1, Math.min(8, Math.round(effect.count ?? 3)));
                return Array.from({ length: count }, (_, copy) => drawText(`effect-${key}-${copy}`, { x: text.x + offsetX * (copy + 1) / count, y: text.y + offsetY * (copy + 1) / count, fill: effect.color, opacity: opacity * (1 - copy / (count + 1)), "data-editor-text-effect": effect.kind }));
              }
              if (effect.kind === "extrude") {
                const count = Math.max(1, Math.min(16, Math.round(effect.count ?? 8)));
                const angle = (effect.angle ?? 45) * Math.PI / 180;
                return Array.from({ length: count }, (_, step) => drawText(`effect-${key}-${step}`, { x: text.x + Math.cos(angle) * (effect.distance ?? 18) * (step + 1) / count, y: text.y + Math.sin(angle) * (effect.distance ?? 18) * (step + 1) / count, fill: effect.color, opacity, "data-editor-text-effect": effect.kind }));
              }
              if (effect.kind === "stripe") return null;
              return null;
            })}
            {drawText("base-text", { fill: text.color, stroke: "none", "data-editor-text-content": "true" })}
            {effects.filter((effect) => effect.enabled !== false && effect.kind === "stripe").map((effect) => drawText(`stripe-${effectKey(effect)}`, { fill: `url(#${effectPrefix}-stripe-${effectKey(effect)})`, opacity: Math.max(0.05, Math.min(1, effect.opacity ?? 0.72)), "data-editor-text-effect": effect.kind }))}
            {text.textDecoration === "line" && <line x1={text.x - text.fontSize * 2.2} y1={text.y + (lines.length - 1) * lineHeight + text.fontSize * 0.28} x2={text.x + text.fontSize * 2.2} y2={text.y + (lines.length - 1) * lineHeight + text.fontSize * 0.28} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} strokeLinecap="round" data-editor-text-decoration="line" />}
            {text.textDecoration === "cut" && <rect x={text.x - text.fontSize * 2.2} y={text.y - text.fontSize * 0.34} width={text.fontSize * 4.4} height={text.decorationWidth ?? 4} fill={text.decorationColor ?? "#d4ff3f"} opacity="0.8" data-editor-text-decoration="cut" />}
            {text.textDecoration === "oblique" && <line x1={text.x - text.fontSize * 2.1} y1={text.y + text.fontSize * 0.2} x2={text.x - text.fontSize * 1.5} y2={text.y - text.fontSize * 0.1} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} data-editor-text-decoration="oblique" />}
          </g>
        );
      })()}
      {image && (
        <g data-editor-image-layer="true">
          <defs>
            <filter id={imageFilterId} colorInterpolationFilters="sRGB">
              {/* Tone: one luminance transfer table folds Exposure, Contrast,
                  Highlights, Shadows, Whites, Blacks, Brightness, Levels, Gamma,
                  and the point curve, in Camera Raw order. */}
              <feComponentTransfer>
                <feFuncR type="table" tableValues={toneTable} />
                <feFuncG type="table" tableValues={toneTable} />
                <feFuncB type="table" tableValues={toneTable} />
              </feComponentTransfer>
              {/* Color: white balance, hue, saturation/vibrance, HSL, selective
                  color, and RGB mix combined into one matrix. */}
              <feColorMatrix type="matrix" values={colorValues} />
            </filter>
            {/* Split toning: warm highlights and cool shadows by default weight.
                Balance slides the midtone stop so the grade leans to one end. */}
            <linearGradient id={imageGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bands?.highlights.color ?? "#000"} stopOpacity={bands?.highlights.opacity ?? 0} />
              <stop offset={`${50 - (bands?.balance ?? 0) * 25}%`} stopColor={bands?.midtones.color ?? "#000"} stopOpacity={bands?.midtones.opacity ?? 0} />
              <stop offset="100%" stopColor={bands?.shadows.color ?? "#000"} stopOpacity={bands?.shadows.opacity ?? 0} />
            </linearGradient>
            <filter id={imageGrainId}>
              <feTurbulence type="fractalNoise" baseFrequency={grain.frequency} numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <radialGradient id={vignetteId} cx="50%" cy="50%" r={`${100 - vignette.feather / 2}%`}>
              <stop offset={`${vignette.midpoint}%`} stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity={vignette.amount} />
            </radialGradient>
          </defs>
          <image
            href={image.src}
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            preserveAspectRatio="none"
            style={{ filter: `url(#${imageFilterId}) ${imageFilterCss}`.trim() }}
            data-editor-image-background-removed={image.backgroundRemoved ? "true" : "false"}
            data-editor-image-upscaled={image.upscaled ? "true" : "false"}
            data-editor-image-content="true"
          />
          {splitToneStrength > 0 && <rect x={image.x} y={image.y} width={image.width} height={image.height} fill={`url(#${imageGradientId})`} pointerEvents="none" data-editor-image-split-tone="true" />}
          {vignette.amount > 0 && <rect x={image.x} y={image.y} width={image.width} height={image.height} fill={`url(#${vignetteId})`} pointerEvents="none" data-editor-image-vignette="true" />}
          {grain.amount > 0 && <rect x={image.x} y={image.y} width={image.width} height={image.height} filter={`url(#${imageGrainId})`} opacity={grain.amount * 0.4} pointerEvents="none" data-editor-image-grain="true" />}
        </g>
      )}
    </>
  );
}
