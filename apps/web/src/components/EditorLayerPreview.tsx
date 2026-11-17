"use client";

import { useId, type SVGProps } from "react";
import type { EditorImageContent, EditorShapePath, EditorTextContent, EditorTextEffect } from "@/lib/editor-layers";

// The print canvas and every preview share one 1000 x 1200 unit artwork space.
export const EDITOR_ARTWORK_VIEWBOX = "0 0 1000 1200";
export const EDITOR_TEXT_FONT_FAMILY = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

export default function EditorLayerPreview({
  paths = [],
  text = null,
  image = null,
}: {
  paths?: EditorShapePath[];
  text?: EditorTextContent | null;
  image?: EditorImageContent | null;
}) {
  const rawId = useId();
  const effectPrefix = `text-effect-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "preview"}`;
  const imageFilterId = `${effectPrefix}-image-rgb`;
  const vignetteId = `${effectPrefix}-vignette`;
  const curveTableValues = (image?.curves ?? [0, 25, 50, 75, 100]).map((point) => Math.max(0, Math.min(100, point)) / 100).join(" ");
  const levelsTableValues = `${(image?.levelsBlack ?? 0) / 100} ${(image?.levelsWhite ?? 100) / 100}`;
  const effectKey = (effect: EditorTextEffect) => effect.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  return (
    <>
      {paths.map((path, index) => (
        <path
          key={`shape-${index}`}
          d={path.d}
          fill={path.fill ?? "none"}
          stroke={path.stroke ?? "none"}
          strokeWidth={path.strokeWidth ?? 20}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-editor-shape-path="true"
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
        type TextEffectProps = SVGProps<SVGTextElement> & { "data-editor-text-effect"?: string; "data-editor-text-content"?: string };
        const drawText = (key: string, props: TextEffectProps = {}) => (
          <text key={key} x={text.x} y={text.y} fontSize={text.fontSize} textAnchor={textAnchor} style={textStyle} data-editor-text-content="true" {...props}>{text.value}</text>
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
            {text.textDecoration === "line" && <line x1={text.x - text.fontSize * 2.2} y1={text.y + text.fontSize * 0.28} x2={text.x + text.fontSize * 2.2} y2={text.y + text.fontSize * 0.28} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} strokeLinecap="round" data-editor-text-decoration="line" />}
            {text.textDecoration === "cut" && <rect x={text.x - text.fontSize * 2.2} y={text.y - text.fontSize * 0.34} width={text.fontSize * 4.4} height={text.decorationWidth ?? 4} fill={text.decorationColor ?? "#d4ff3f"} opacity="0.8" data-editor-text-decoration="cut" />}
            {text.textDecoration === "oblique" && <line x1={text.x - text.fontSize * 2.1} y1={text.y + text.fontSize * 0.2} x2={text.x - text.fontSize * 1.5} y2={text.y - text.fontSize * 0.1} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} data-editor-text-decoration="oblique" />}
          </g>
        );
      })()}
      {image && (
        <g data-editor-image-layer="true">
          <defs>
            <filter id={imageFilterId} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="table" tableValues={levelsTableValues} />
                <feFuncG type="table" tableValues={levelsTableValues} />
                <feFuncB type="table" tableValues={levelsTableValues} />
              </feComponentTransfer>
              <feComponentTransfer>
                <feFuncR type="gamma" amplitude="1" exponent={image.levelsGamma ?? 1} offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent={image.levelsGamma ?? 1} offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent={image.levelsGamma ?? 1} offset="0" />
              </feComponentTransfer>
              <feComponentTransfer>
                <feFuncR type="linear" slope={(image.red ?? 100) / 100} />
                <feFuncG type="linear" slope={(image.green ?? 100) / 100} />
                <feFuncB type="linear" slope={(image.blue ?? 100) / 100} />
              </feComponentTransfer>
              <feComponentTransfer>
                <feFuncR type="table" tableValues={curveTableValues} />
                <feFuncG type="table" tableValues={curveTableValues} />
                <feFuncB type="table" tableValues={curveTableValues} />
              </feComponentTransfer>
            </filter>
            <radialGradient id={vignetteId} cx="50%" cy="50%" r="72%">
              <stop offset="52%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity={(image.vignette ?? 0) / 100} />
            </radialGradient>
          </defs>
          <image
            href={image.src}
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            preserveAspectRatio="none"
            style={{ filter: `url(#${imageFilterId}) brightness(${Math.max(0, 1 + ((image.exposure ?? 0) + (image.shadows ?? 0) * 0.35 + (image.highlights ?? 0) * 0.15) / 100)}) contrast(${Math.max(0, (image.contrast ?? 100) / 100 + (image.highlights ?? 0) / 500)}) saturate(${Math.max(0, 1 + ((image.saturation ?? 100) - 100 + (image.vibrance ?? 0)) / 100)}) sepia(${Math.max(0, image.temperature ?? 0) / 100}) hue-rotate(${(image.hue ?? 0) + (image.temperature ?? 0) * 0.35 + (image.tint ?? 0) * 0.45}deg) blur(${image.blur ?? 0}px)` }}
            data-editor-image-background-removed={image.backgroundRemoved ? "true" : "false"}
            data-editor-image-upscaled={image.upscaled ? "true" : "false"}
            data-editor-image-content="true"
          />
          {(image.vignette ?? 0) > 0 && <rect x={image.x} y={image.y} width={image.width} height={image.height} fill={`url(#${vignetteId})`} pointerEvents="none" data-editor-image-vignette="true" />}
        </g>
      )}
    </>
  );
}
