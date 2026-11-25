"use client";

import { useId, type SVGProps } from "react";
import type { EditorGradient, EditorImageContent, EditorShapePath, EditorShapeStyle, EditorTextContent, EditorTextEffect } from "@/lib/editor-layers";
import { editorPenEndMarkers, EDITOR_TEXT_FONT_FAMILY, editorTextDecoration, editorTextEffects, editorTextLines, editorTextMetrics, editorTextPresetTransform, mixEditorColors, editorGradientConicWedges, editorGradientDiamondFacets, editorGradientGeometry, roundEditorShapePath, sortEditorGradientStops } from "@/lib/editor-layers";
import { buildToneTable, colorMatrixValues, grainParams, photoFilterCss, splitToneBands, vignetteParams } from "@/lib/photo-adjustments";

// The print canvas and every preview share one 1000 x 1200 unit artwork space.
export const EDITOR_ARTWORK_VIEWBOX = "0 0 1000 1200";
export { EDITOR_TEXT_FONT_FAMILY };

export function GradientPreview({ gradient, idPrefix }: { gradient: EditorGradient; idPrefix: string }) {
  const { cx, cy, radius } = editorGradientGeometry(gradient);
  const stops = sortEditorGradientStops(gradient.stops);
  const stopNodes = stops.map((stop) => (
    <stop key={stop.id} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity={stop.opacity} />
  ));
  const clipId = `${idPrefix}-clip`;
  const fillId = `${idPrefix}-fill`;
  const facetIds = [0, 1, 2, 3].map((index) => `${idPrefix}-facet-${index}`);

  // "Reflected" mirrors the ramp about the start point, so the far side runs back to the first stop.
  const reflectedNodes = gradient.type === "reflected"
    ? [...stops].reverse().map((stop) => <stop key={`r-${stop.id}`} offset={`${(100 - stop.offset) / 2}%`} stopColor={stop.color} stopOpacity={stop.opacity} />)
      .concat(stops.map((stop) => <stop key={`f-${stop.id}`} offset={`${50 + stop.offset / 2}%`} stopColor={stop.color} stopOpacity={stop.opacity} />))
    : stopNodes;

  return (
    <g data-editor-gradient-layer={gradient.type}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="1000" height="1200" />
        </clipPath>
        {gradient.type === "linear" && (
          <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>{stopNodes}</linearGradient>
        )}
        {gradient.type === "reflected" && (
          <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1={gradient.x1 - (gradient.x2 - gradient.x1)} y1={gradient.y1 - (gradient.y2 - gradient.y1)} x2={gradient.x2} y2={gradient.y2}>{reflectedNodes}</linearGradient>
        )}
        {gradient.type === "radial" && (
          <radialGradient id={fillId} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={radius}>{stopNodes}</radialGradient>
        )}
        {gradient.type === "diamond" && editorGradientDiamondFacets(gradient).map((facet, index) => (
          <linearGradient key={facetIds[index]} id={facetIds[index]} gradientUnits="userSpaceOnUse" x1={facet.from.x} y1={facet.from.y} x2={facet.to.x} y2={facet.to.y}>{stopNodes}</linearGradient>
        ))}
      </defs>
      {(gradient.type === "linear" || gradient.type === "reflected" || gradient.type === "radial") && (
        <rect x="0" y="0" width="1000" height="1200" fill={`url(#${fillId})`} />
      )}
      {gradient.type === "angle" && (
        <g clipPath={`url(#${clipId})`} shapeRendering="crispEdges">
          {editorGradientConicWedges(gradient).map((wedge, index) => (
            <path key={index} d={wedge.d} fill={wedge.color} fillOpacity={wedge.opacity} stroke={wedge.color} strokeOpacity={wedge.opacity} strokeWidth="1.5" />
          ))}
        </g>
      )}
      {gradient.type === "diamond" && (
        <g clipPath={`url(#${clipId})`}>
          {editorGradientDiamondFacets(gradient).map((facet, index) => (
            <path key={index} d={facet.d} fill={`url(#${facetIds[index]})`} />
          ))}
        </g>
      )}
    </g>
  );
}

/**
 * The painted text, effects included. Shared by the layer preview and the style tiles in
 * the Adjustments panel, so a tile cannot show an effect the canvas does not paint.
 */
export function EditorTextArtwork({ text, idPrefix }: { text: EditorTextContent; idPrefix: string }) {
  const textAnchor = text.textAlign === "left" ? "start" : text.textAlign === "right" ? "end" : "middle";
  const textStyle = {
    fontFamily: text.fontFamily ?? EDITOR_TEXT_FONT_FAMILY,
    fontWeight: text.fontWeight ?? 700,
    fontStyle: text.fontStyle ?? "normal",
    textDecoration: text.underline ? "underline" : "none",
    letterSpacing: `${text.letterSpacing ?? 0}px`,
  };
  const transform = editorTextPresetTransform(text);
  const effects = editorTextEffects(text);
  const decoration = editorTextDecoration(text);
  const lines = editorTextLines(text);
  const lineHeight = text.fontSize * (text.lineHeight ?? 1.2);
  const effectKey = (effect: EditorTextEffect) => effect.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const hollow = effects.find((effect) => effect.enabled !== false && effect.kind === "hollow");
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
        {effects.filter((effect) => effect.enabled !== false && (effect.kind === "glow" || effect.kind === "blur" || (effect.kind === "shadow" && (effect.blur ?? 0) > 0))).map((effect) => (
          <filter key={effect.id} id={`${idPrefix}-blur-${effectKey(effect)}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={Math.max(0.5, Math.min(20, effect.blur ?? 4))} />
          </filter>
        ))}
        {effects.filter((effect) => effect.enabled !== false && effect.kind === "stripe").map((effect) => (
          <pattern key={effect.id} id={`${idPrefix}-stripe-${effectKey(effect)}`} width={Math.max(6, effect.distance ?? 14)} height={Math.max(6, effect.distance ?? 14)} patternUnits="userSpaceOnUse" patternTransform={`rotate(${effect.angle ?? -30})`}>
            <path d={`M 0 0 H ${Math.max(6, effect.distance ?? 14)}`} fill="none" stroke={effect.color} strokeWidth={Math.max(1, effect.width ?? 4)} />
          </pattern>
        ))}
        {effects.filter((effect) => effect.enabled !== false && effect.kind === "pattern").map((effect) => {
          const tile = Math.max(6, effect.distance ?? 16);
          const motif = effect.pattern ?? "dots";
          return <pattern key={effect.id} id={`${idPrefix}-pattern-${effectKey(effect)}`} width={tile} height={tile} patternUnits="userSpaceOnUse" patternTransform={effect.angle ? `rotate(${effect.angle})` : undefined}>
            <rect width={tile} height={tile} fill={effect.color2 ?? "transparent"} />
            {motif === "dots" && <circle cx={tile / 2} cy={tile / 2} r={Math.max(1.2, tile * 0.22)} fill={effect.color} />}
            {motif === "grid" && <><path d={`M 0 0 V ${tile} M 0 0 H ${tile}`} fill="none" stroke={effect.color} strokeWidth={Math.max(1, effect.width ?? 2)} /></>}
            {motif === "checker" && <><rect width={tile / 2} height={tile / 2} fill={effect.color} /><rect x={tile / 2} y={tile / 2} width={tile / 2} height={tile / 2} fill={effect.color} /></>}
          </pattern>;
        })}
        {effects.filter((effect) => effect.enabled !== false && effect.kind === "gloss").map((effect) => (
          <linearGradient key={effect.id} id={`${idPrefix}-gloss-${effectKey(effect)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effect.color} stopOpacity={Math.max(0.05, Math.min(1, effect.opacity ?? 0.75))} />
            <stop offset="55%" stopColor={effect.color} stopOpacity="0" />
          </linearGradient>
        ))}
        {effects.filter((effect) => effect.enabled !== false && effect.kind === "gradient").map((effect) => (
          <linearGradient key={effect.id} id={`${idPrefix}-grad-${effectKey(effect)}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={effect.color} />
            <stop offset="100%" stopColor={effect.color2 ?? effect.color} />
          </linearGradient>
        ))}
      </defs>
      {effects.map((effect) => {
        if (effect.enabled === false) return null;
        const opacity = Math.max(0.05, Math.min(1, effect.opacity ?? 0.72));
        const offsetX = effect.offsetX ?? 10;
        const offsetY = effect.offsetY ?? 10;
        const key = effectKey(effect);
        if (effect.kind === "shadow" || effect.kind === "offset") {
          return drawText(`effect-${key}`, { x: text.x + offsetX, y: text.y + offsetY, fill: effect.color, opacity, filter: effect.kind === "shadow" && (effect.blur ?? 0) > 0 ? `url(#${idPrefix}-blur-${key})` : undefined, "data-editor-text-effect": effect.kind });
        }
        if (effect.kind === "outline") {
          return drawText(`effect-${key}`, { fill: "none", stroke: effect.color, strokeWidth: effect.width ?? 6, paintOrder: "stroke", opacity, "data-editor-text-effect": effect.kind });
        }
        if (effect.kind === "glow") {
          return drawText(`effect-${key}`, { fill: "none", stroke: effect.color, strokeWidth: (effect.width ?? 12) * 1.5, filter: `url(#${idPrefix}-blur-${key})`, opacity: opacity * 0.8, "data-editor-text-effect": effect.kind });
        }
        if (effect.kind === "blur") {
          return drawText(`effect-${key}`, { fill: effect.color, filter: `url(#${idPrefix}-blur-${key})`, opacity, "data-editor-text-effect": effect.kind });
        }
        if (effect.kind === "bevel") {
          const edge = Math.max(1, effect.width ?? 4);
          return [
            drawText(`effect-${key}-lit`, { x: text.x - edge, y: text.y - edge, fill: effect.color2 ?? "#ffffff", opacity, "data-editor-text-effect": effect.kind }),
            drawText(`effect-${key}-shade`, { x: text.x + edge, y: text.y + edge, fill: effect.color, opacity, "data-editor-text-effect": effect.kind }),
          ];
        }
        if (effect.kind === "echo") {
          const count = Math.max(1, Math.min(8, Math.round(effect.count ?? 3)));
          return Array.from({ length: count }, (_, copy) => drawText(`effect-${key}-${copy}`, { x: text.x + offsetX * (copy + 1) / count, y: text.y + offsetY * (copy + 1) / count, fill: effect.color, opacity: opacity * (1 - copy / (count + 1)), "data-editor-text-effect": effect.kind }));
        }
        if (effect.kind === "extrude") {
          const count = Math.max(1, Math.min(16, Math.round(effect.count ?? 8)));
          const angle = (effect.angle ?? 45) * Math.PI / 180;
          return Array.from({ length: count }, (_, step) => drawText(`effect-${key}-${step}`, {
            x: text.x + Math.cos(angle) * (effect.distance ?? 18) * (step + 1) / count,
            y: text.y + Math.sin(angle) * (effect.distance ?? 18) * (step + 1) / count,
            // The deepest copy is the far end of the side, the last one meets the face.
            fill: mixEditorColors(effect.color2 ?? effect.color, effect.color, (step + 1) / count),
            opacity,
            "data-editor-text-effect": effect.kind,
          }));
        }
        return null;
      })}
      {effects.filter((effect) => effect.enabled !== false && effect.kind === "gloss").map((effect) => (
        <clipPath key={`clip-${effect.id}`} id={`${idPrefix}-gloss-clip-${effectKey(effect)}`}>
          <text x={text.x} y={text.y} fontSize={text.fontSize} textAnchor={textAnchor} style={textStyle}>
            {lines.map((line, index) => <tspan key={index} x={text.x} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>)}
          </text>
        </clipPath>
      ))}
      {hollow
        ? drawText("base-text", { fill: "none", stroke: hollow.color, strokeWidth: hollow.width ?? 6, paintOrder: "stroke", "data-editor-text-effect": "hollow" })
        : drawText("base-text", { fill: text.color, stroke: "none" })}
      {effects.filter((effect) => effect.enabled !== false && effect.kind === "gradient").map((effect) => drawText(`gradient-${effectKey(effect)}`, { fill: `url(#${idPrefix}-grad-${effectKey(effect)})`, opacity: Math.max(0.05, Math.min(1, effect.opacity ?? 1)), "data-editor-text-effect": effect.kind }))}
      {effects.filter((effect) => effect.enabled !== false && effect.kind === "stripe").map((effect) => drawText(`stripe-${effectKey(effect)}`, { fill: `url(#${idPrefix}-stripe-${effectKey(effect)})`, opacity: Math.max(0.05, Math.min(1, effect.opacity ?? 0.72)), "data-editor-text-effect": effect.kind }))}
      {effects.filter((effect) => effect.enabled !== false && effect.kind === "pattern").map((effect) => drawText(`pattern-${effectKey(effect)}`, { fill: `url(#${idPrefix}-pattern-${effectKey(effect)})`, opacity: Math.max(0.05, Math.min(1, effect.opacity ?? 1)), "data-editor-text-effect": effect.kind }))}
      {effects.filter((effect) => effect.enabled !== false && effect.kind === "gloss").map((effect) => {
        const metrics = editorTextMetrics(text);
        const top = text.y + metrics.inkTop;
        const height = Math.max(1, metrics.inkBottom - metrics.inkTop);
        return <rect key={`gloss-${effect.id}`} x={text.x + metrics.inkLeft} y={top} width={Math.max(1, metrics.inkWidth)} height={height} fill={`url(#${idPrefix}-gloss-${effectKey(effect)})`} clipPath={`url(#${idPrefix}-gloss-clip-${effectKey(effect)})`} data-editor-text-effect={effect.kind} />;
      })}
      {decoration?.kind === "line" && <line x1={decoration.x1} y1={decoration.y1} x2={decoration.x2} y2={decoration.y2} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={decoration.width} strokeLinecap="round" data-editor-text-decoration="line" />}
      {decoration?.kind === "cut" && <rect x={decoration.x} y={decoration.y} width={decoration.width} height={decoration.height} fill={text.decorationColor ?? "#d4ff3f"} opacity="0.8" data-editor-text-decoration="cut" />}
      {decoration?.kind === "oblique" && <line x1={decoration.x1} y1={decoration.y1} x2={decoration.x2} y2={decoration.y2} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={decoration.width} data-editor-text-decoration="oblique" />}
    </g>
  );
}

export default function EditorLayerPreview({
  paths = [],
  shapeStyle = null,
  text = null,
  image = null,
  gradient = null,
}: {
  paths?: EditorShapePath[];
  shapeStyle?: EditorShapeStyle | null;
  text?: EditorTextContent | null;
  image?: EditorImageContent | null;
  gradient?: EditorGradient | null;
}) {
  const rawId = useId();
  const effectPrefix = `text-effect-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "preview"}`;
  const imageFilterId = `${effectPrefix}-image`;
  const imageGradientId = `${effectPrefix}-image-gradient`;
  const imageGrainId = `${effectPrefix}-image-grain`;
  const imageClipId = `${effectPrefix}-image-clip`;
  const frameRadius = Math.max(0, image?.cornerRadius ?? 0);
  const frameWidth = Math.max(0, image?.borderWidth ?? 0);
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
          strokeDasharray={shapeStyle ? shapeDash : path.dash}
          strokeLinecap="round"
          strokeLinejoin={path.lineJoin ?? "round"}
          filter={shapeStyle ? shapeFilter : undefined}
          data-editor-shape-path="true"
          data-editor-shape-style={shapeStyle ? "true" : undefined}
        />
      ))}
      {shapePaths.map((path, index) => editorPenEndMarkers(path).map((marker, endIndex) => (
        <g
          key={`pen-end-${index}-${endIndex}`}
          data-editor-pen-end={marker.kind}
          transform={`translate(${marker.x} ${marker.y}) rotate(${marker.angle})`}
          fill={path.stroke ?? "none"}
          stroke={path.stroke ?? "none"}
          strokeWidth={marker.kind === "bar" ? Math.max(1, (path.strokeWidth ?? 5) * 0.8) : 0}
          pointerEvents="none"
        >
          {marker.kind === "arrow" && <path d={`M 0 0 L ${-marker.size} ${-marker.size / 2} L ${-marker.size * 0.6} 0 L ${-marker.size} ${marker.size / 2} Z`} />}
          {marker.kind === "circle" && <circle r={marker.size / 2} />}
          {marker.kind === "square" && <rect x={-marker.size / 2} y={-marker.size / 2} width={marker.size} height={marker.size} />}
          {marker.kind === "bar" && <line x1={0} y1={-marker.size} x2={0} y2={marker.size} />}
        </g>
      )))}
      {text && <EditorTextArtwork text={text} idPrefix={effectPrefix} />}
      {image && (
        <g
          data-editor-image-layer="true"
          data-editor-image-frame={frameRadius > 0 || frameWidth > 0 ? "true" : "false"}
          clipPath={frameRadius > 0 ? `url(#${imageClipId})` : undefined}
        >
          <defs>
            {frameRadius > 0 && (
              <clipPath id={imageClipId}>
                <rect x={image.x} y={image.y} width={image.width} height={image.height} rx={frameRadius} />
              </clipPath>
            )}
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
          {/* The border is inset by half its own width, so the frame paints inside the
              image box and the transform box still hugs the layer. */}
          {frameWidth > 0 && (
            <rect
              x={image.x + frameWidth / 2}
              y={image.y + frameWidth / 2}
              width={Math.max(0, image.width - frameWidth)}
              height={Math.max(0, image.height - frameWidth)}
              rx={Math.max(0, frameRadius - frameWidth / 2)}
              fill="none"
              stroke={image.borderColor || "#ffffff"}
              strokeWidth={frameWidth}
              pointerEvents="none"
              data-editor-image-border="true"
            />
          )}
        </g>
      )}
      {gradient && <GradientPreview gradient={gradient} idPrefix={`${effectPrefix}-gradient`} />}
    </>
  );
}
