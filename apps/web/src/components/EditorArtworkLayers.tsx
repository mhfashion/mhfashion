"use client";

import { useId } from "react";
import type { ArtworkStroke, EditorArtworkLayer, MaskBrushMode } from "@/lib/editor-layers";
import EditorLayerPreview from "@/components/EditorLayerPreview";
import { resolveEditorShapeStyle } from "@/lib/editor-layers";

function pathFor(stroke: ArtworkStroke) {
  return stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1200}`)
    .join(" ");
}

/** Default ink look for a brush/pencil stroke that predates per-stroke options. */
export const ARTWORK_BRUSH_DEFAULT_WIDTH = 52;
export const ARTWORK_BRUSH_DEFAULT_OPACITY = 0.68;
export const ARTWORK_PENCIL_DEFAULT_WIDTH = 24;

export function artworkStrokeWidth(stroke: ArtworkStroke, fallback = ARTWORK_PENCIL_DEFAULT_WIDTH) {
  return stroke.width ?? (stroke.tool === "brush" ? ARTWORK_BRUSH_DEFAULT_WIDTH : fallback);
}
export function artworkStrokeOpacity(stroke: ArtworkStroke) {
  return stroke.opacity ?? (stroke.tool === "brush" ? ARTWORK_BRUSH_DEFAULT_OPACITY : 1);
}
export function artworkStrokeSoftness(stroke: ArtworkStroke) {
  return stroke.softness ?? 0;
}

function StrokeShape({
  stroke,
  color,
  width,
  className,
  isArtwork = false,
  blurId,
}: {
  stroke: ArtworkStroke;
  color: string;
  width: number;
  className?: string;
  isArtwork?: boolean;
  blurId?: string;
}) {
  const strokeWidth = isArtwork ? artworkStrokeWidth(stroke, width) : width;
  const strokeOpacity = isArtwork ? artworkStrokeOpacity(stroke) : undefined;
  const softness = isArtwork ? artworkStrokeSoftness(stroke) : 0;
  const softFilter = softness > 0 && blurId ? `url(#${blurId})` : undefined;
  if (stroke.points.length === 0) return null;
  if (stroke.points.length === 1) {
    return (
      <circle
        cx={stroke.points[0].x * 1000}
        cy={stroke.points[0].y * 1200}
        r={strokeWidth / 2}
        fill={color}
        opacity={strokeOpacity}
        filter={softFilter}
        data-editor-artwork-stroke={isArtwork ? "true" : undefined}
        data-editor-stroke-shape={isArtwork ? stroke.shape ?? "round" : undefined}
        className={className}
      />
    );
  }
  return (
    <path
      d={pathFor(stroke)}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeLinecap={stroke.shape === "square" ? "butt" : "round"}
      strokeLinejoin="round"
      filter={softFilter}
      data-editor-artwork-stroke={isArtwork ? "true" : undefined}
      data-editor-stroke-shape={isArtwork ? stroke.shape ?? "round" : undefined}
      className={className}
    />
  );
}

export default function EditorArtworkLayers({
  layers,
  transform = "translate(500 600) scale(1) translate(-500 -600)",
  layerOffsets,
  layerScales,
  layerOrigins,
  layerRotations,
  selectedMaskLayerId = null,
  maskBrushMode = "hide",
  hiddenTextLayerId = null,
}: {
  layers: EditorArtworkLayer[];
  transform?: string;
  layerOffsets?: Record<string, { x: number; y: number }>;
  layerScales?: Record<string, { x: number; y: number }>;
  layerOrigins?: Record<string, { x: number; y: number }>;
  layerRotations?: Record<string, number>;
  selectedMaskLayerId?: string | null;
  maskBrushMode?: MaskBrushMode;
  /** The layer currently being typed on the print canvas is rendered by the inline editor. */
  hiddenTextLayerId?: string | null;
}) {
  const rawId = useId();
  const instanceId = `editor-layer-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "preview"}`;

  return (
    <>
      {[...layers]
        .reverse()
        .filter((layer) => layer.visible && layer.id !== hiddenTextLayerId)
        .map((layer) => {
        const maskId = `${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-mask`;
        const offset = layerOffsets?.[layer.id];
        const scale = layerScales?.[layer.id] ?? { x: 1, y: 1 };
        const origin = layerOrigins?.[layer.id] ?? { x: 500, y: 600 };
        const rotation = layerRotations?.[layer.id] ?? 0;
        const layerTransform = offset || scale.x !== 1 || scale.y !== 1 || rotation !== 0
          ? `translate(${offset?.x ?? 0} ${offset?.y ?? 0}) translate(${origin.x} ${origin.y}) rotate(${rotation}) scale(${scale.x} ${scale.y}) translate(${-origin.x} ${-origin.y})`
          : undefined;
        return (
          <g key={layer.id} transform={layerTransform} opacity={layer.opacity / 100} style={{ mixBlendMode: layer.blendMode }}>
            {layer.mask !== null && (
              <defs>
                <mask
                  id={maskId}
                  x="0"
                  y="0"
                  width="1000"
                  height="1200"
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                >
                  <rect x="0" y="0" width="1000" height="1200" fill="white" />
                  {layer.mask.map((stroke, index) => (
                    <StrokeShape
                      key={index}
                      stroke={stroke}
                      color={stroke.mode === "hide" ? "black" : "white"}
                      width={48}
                    />
                  ))}
                </mask>
              </defs>
            )}
            <g transform={transform} mask={layer.mask !== null ? `url(#${maskId})` : undefined} opacity={layer.fillOpacity / 100}>
              {layer.strokes.some((stroke) => artworkStrokeSoftness(stroke) > 0) && (
                <defs>
                  <filter id={`${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-soften`} x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="14" />
                  </filter>
                </defs>
              )}
              {layer.strokes.map((stroke, index) => (
                <StrokeShape
                  key={index}
                  stroke={stroke}
                  color={stroke.color ?? "#202124"}
                  width={ARTWORK_PENCIL_DEFAULT_WIDTH}
                  isArtwork
                  blurId={`${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-soften`}
                />
              ))}
              {(layer.shape !== null || layer.text !== null || layer.image !== null) && (
                <g data-editor-layer-kind={layer.kind}>
                  <EditorLayerPreview paths={layer.shape?.paths} shapeStyle={layer.shape ? resolveEditorShapeStyle(layer.shape) : null} text={layer.text} image={layer.image} />
                </g>
              )}
            </g>
            {selectedMaskLayerId === layer.id && layer.mask !== null && (
              <g transform={transform} pointerEvents="none" opacity="0.6">
                {layer.mask.map((stroke, index) => (
                  <StrokeShape
                    key={index}
                    stroke={stroke}
                    color={stroke.mode === "hide" ? "#f43f5e" : "#38bdf8"}
                    width={48}
                  />
                ))}
                <circle cx="18" cy="28" r="10" fill={maskBrushMode === "hide" ? "#f43f5e" : "#38bdf8"} />
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}
