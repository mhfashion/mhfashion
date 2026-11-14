"use client";

import { useId } from "react";
import type { ArtworkStroke, EditorArtworkLayer, MaskBrushMode } from "@/lib/editor-layers";

function pathFor(stroke: ArtworkStroke) {
  return stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1200}`)
    .join(" ");
}

function StrokeShape({
  stroke,
  color,
  width,
  className,
}: {
  stroke: ArtworkStroke;
  color: string;
  width: number;
  className?: string;
}) {
  if (stroke.points.length === 0) return null;
  if (stroke.points.length === 1) {
    return (
      <circle
        cx={stroke.points[0].x * 1000}
        cy={stroke.points[0].y * 1200}
        r={width / 2}
        fill={color}
        data-editor-artwork-stroke={color === "#202124" ? "true" : undefined}
        className={className}
      />
    );
  }
  return (
    <path
      d={pathFor(stroke)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-editor-artwork-stroke={color === "#202124" ? "true" : undefined}
      className={className}
    />
  );
}

export default function EditorArtworkLayers({
  layers,
  transform = "translate(500 600) scale(1) translate(-500 -600)",
  selectedMaskLayerId = null,
  maskBrushMode = "hide",
}: {
  layers: EditorArtworkLayer[];
  transform?: string;
  selectedMaskLayerId?: string | null;
  maskBrushMode?: MaskBrushMode;
}) {
  const rawId = useId();
  const instanceId = `editor-layer-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "preview"}`;

  return (
    <>
      {[...layers].reverse().filter((layer) => layer.visible).map((layer) => {
        const maskId = `${instanceId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}-mask`;
        return (
          <g key={layer.id} opacity={layer.opacity / 100} style={{ mixBlendMode: layer.blendMode }}>
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
            <g transform={transform} mask={layer.mask !== null ? `url(#${maskId})` : undefined}>
              {layer.strokes.map((stroke, index) => (
                <StrokeShape key={index} stroke={stroke} color="#202124" width={24} />
              ))}
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
