"use client";

import { useId } from "react";
import type { ArtworkStroke, EditorArtworkLayer, EditorErasure, MaskBrushMode } from "@/lib/editor-layers";
import EditorLayerPreview from "@/components/EditorLayerPreview";
import { EDITOR_TOOL_OPTIONS_DEFAULT, brushDabBlurRadius, brushDabPoints, eraserDabBlurRadius, eraserDabPoints, resolveEditorShapeStyle } from "@/lib/editor-layers";

function pathFor(stroke: ArtworkStroke) {
  return stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1200}`)
    .join(" ");
}

/**
 * A recorded eraser pass rendered into a luminance mask. Black dabs hide the artwork,
 * and `fillOpacity` lets overlapping dabs build up like Photoshop flow. A soft nib adds
 * a Gaussian blur whose radius scales with the nib and its hardness.
 */
function ErasureShape({ erasure, blurId }: { erasure: EditorErasure; blurId: string }) {
  const width = erasure.width ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.size;
  const dabs = eraserDabPoints(erasure);
  if (dabs.length === 0) return null;
  const blurRadius = eraserDabBlurRadius(erasure);
  const flowOpacity = (erasure.flow ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.flow) / 100;
  const passOpacity = erasure.opacity ?? 1;
  const roundness = erasure.roundness ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.roundness;
  const radius = width / 2;
  const filter = blurRadius > 0.05 ? `url(#${blurId})` : undefined;
  return (
    <g opacity={passOpacity} filter={filter}>
      {blurRadius > 0.05 && (
        <defs>
          <filter id={blurId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={blurRadius} />
          </filter>
        </defs>
      )}
      {dabs.map((dab, index) => erasure.shape === "square" ? (
        <rect
          key={index}
          x={dab.x * 1000 - radius}
          y={dab.y * 1200 - radius}
          width={width}
          height={width}
          rx={(roundness / 100) * radius}
          transform={`rotate(${erasure.angle ?? 0} ${dab.x * 1000} ${dab.y * 1200})`}
          fill="#000"
          fillOpacity={flowOpacity}
        />
      ) : (
        <circle key={index} cx={dab.x * 1000} cy={dab.y * 1200} r={radius} fill="#000" fillOpacity={flowOpacity} />
      ))}
    </g>
  );
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
/** Dabs are only used when a stroke carries brush spacing; pen/legacy strokes stay a path. */
export function artworkStrokeUsesDabs(stroke: ArtworkStroke) {
  return typeof stroke.spacing === "number";
}

/**
 * A freehand stroke rendered as a spaced run of nib dabs, matching Photoshop's brush engine:
 * spacing controls the dab gap, flow builds up overlap, and jitter varies size/opacity per
 * dab. The last dab of a fade-out stroke lands at the stroke's own opacity while the rest of
 * the run is capped so the tail still reads as fading rather than missing.
 */
function StrokeDabs({
  stroke,
  color,
  blurId,
  className,
}: {
  stroke: ArtworkStroke;
  color: string;
  blurId?: string;
  className?: string;
}) {
  const dabs = brushDabPoints(stroke);
  if (dabs.length === 0) return null;
  const width = stroke.width ?? ARTWORK_BRUSH_DEFAULT_WIDTH;
  const opacity = stroke.opacity ?? ARTWORK_BRUSH_DEFAULT_OPACITY;
  const roundness = stroke.roundness ?? EDITOR_TOOL_OPTIONS_DEFAULT.brush.roundness;
  const angle = stroke.angle ?? 0;
  const fadeOut = stroke.fadeOut === true;
  const blurRadius = brushDabBlurRadius(stroke);
  const filter = blurRadius > 0.05 && blurId ? `url(#${blurId})` : undefined;
  const blend = stroke.blend ?? "normal";
  return (
    <g
      className={className}
      opacity={opacity}
      filter={filter}
      data-editor-artwork-stroke="true"
      data-editor-stroke-shape={stroke.shape ?? "round"}
      data-editor-brush-blend={blend}
      style={blend === "normal" ? undefined : { mixBlendMode: blend }}
    >
      {dabs.map((dab, index) => {
        const fade = fadeOut ? 0.2 + 0.8 * (index / Math.max(1, dabs.length - 1)) : 1;
        const fillOpacity = Math.max(0, Math.min(1, dab.alpha * fade));
        const radius = (width / 2) * dab.scale;
        const cx = dab.x * 1000;
        const cy = dab.y * 1200;
        return stroke.shape === "square" ? (
          <rect
            key={index}
            x={cx - radius}
            y={cy - radius}
            width={radius * 2}
            height={radius * 2}
            rx={(roundness / 100) * radius}
            transform={`rotate(${angle} ${cx} ${cy})`}
            fill={color}
            fillOpacity={fillOpacity}
          />
        ) : (
          <circle key={index} cx={cx} cy={cy} r={radius} fill={color} fillOpacity={fillOpacity} />
        );
      })}
    </g>
  );
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
  if (isArtwork && artworkStrokeUsesDabs(stroke)) {
    return <StrokeDabs stroke={stroke} color={color} blurId={blurId} className={className} />;
  }
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
        const erasureMaskId = `${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-erase`;
        const erasureBlurId = `${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-erase-blur`;
        const hasErasures = layer.erasures.length > 0;
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
            {hasErasures && (
              <defs>
                <mask
                  id={erasureMaskId}
                  x="0"
                  y="0"
                  width="1000"
                  height="1200"
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                >
                  <rect x="0" y="0" width="1000" height="1200" fill="white" />
                  {layer.erasures.map((erasure, index) => (
                    <ErasureShape key={index} erasure={erasure} blurId={`${erasureBlurId}-${index}`} />
                  ))}
                </mask>
              </defs>
            )}
            <g transform={transform} mask={layer.mask !== null ? `url(#${maskId})` : undefined} opacity={layer.fillOpacity / 100}>
              <g mask={hasErasures ? `url(#${erasureMaskId})` : undefined}>
              {layer.strokes.map((stroke, index) => {
                const softenId = `${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-soften-${index}`;
                const blurRadius = artworkStrokeSoftness(stroke) > 0 ? brushDabBlurRadius(stroke) : 0;
                return (
                  <g key={index}>
                    {blurRadius > 0.05 && (
                      <defs>
                        <filter id={softenId} x="-60%" y="-60%" width="220%" height="220%">
                          <feGaussianBlur stdDeviation={Math.max(1, Math.round(blurRadius * 10) / 10)} />
                        </filter>
                      </defs>
                    )}
                    <StrokeShape
                      stroke={stroke}
                      color={stroke.color ?? "#202124"}
                      width={ARTWORK_PENCIL_DEFAULT_WIDTH}
                      isArtwork
                      blurId={softenId}
                    />
                  </g>
                );
              })}
              {(layer.shape !== null || layer.text !== null || layer.image !== null) && (
                <g data-editor-layer-kind={layer.kind}>
                  <EditorLayerPreview paths={layer.shape?.paths} shapeStyle={layer.shape ? resolveEditorShapeStyle(layer.shape) : null} text={layer.text} image={layer.image} />
                </g>
              )}
              </g>
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
