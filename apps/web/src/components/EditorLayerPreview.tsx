"use client";

import type { EditorImageContent, EditorShapePath, EditorTextContent } from "@/lib/editor-layers";

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
        const transform = text.textTransform === "arch" ? `rotate(-6 ${text.x} ${text.y})` : text.textTransform === "wave" ? `skewX(-4)` : undefined;
        return (
          <g transform={transform} data-editor-text-transform={text.textTransform ?? "none"}>
            {text.textEffect === "shadow" && <text x={text.x + (text.effectOffset ?? 12)} y={text.y + (text.effectOffset ?? 12)} fontSize={text.fontSize} fill={text.effectColor ?? "#000000"} opacity={0.72} textAnchor={textAnchor} style={textStyle} data-editor-text-shadow="true">{text.value}</text>}
            <text x={text.x} y={text.y} fontSize={text.fontSize} fill={text.color} stroke={text.textEffect === "outline" ? (text.effectColor ?? "#000000") : "none"} strokeWidth={text.textEffect === "outline" ? (text.outlineWidth ?? 6) : 0} paintOrder="stroke" textAnchor={textAnchor} style={textStyle} data-editor-text-content="true">{text.value}</text>
            {text.textDecoration === "line" && <line x1={text.x - text.fontSize * 2.2} y1={text.y + text.fontSize * 0.28} x2={text.x + text.fontSize * 2.2} y2={text.y + text.fontSize * 0.28} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} strokeLinecap="round" data-editor-text-decoration="line" />}
            {text.textDecoration === "cut" && <rect x={text.x - text.fontSize * 2.2} y={text.y - text.fontSize * 0.34} width={text.fontSize * 4.4} height={text.decorationWidth ?? 4} fill={text.decorationColor ?? "#d4ff3f"} opacity="0.8" data-editor-text-decoration="cut" />}
            {text.textDecoration === "oblique" && <line x1={text.x - text.fontSize * 2.1} y1={text.y + text.fontSize * 0.2} x2={text.x - text.fontSize * 1.5} y2={text.y - text.fontSize * 0.1} stroke={text.decorationColor ?? "#d4ff3f"} strokeWidth={text.decorationWidth ?? 4} data-editor-text-decoration="oblique" />}
          </g>
        );
      })()}
      {image && (
        <image
          href={image.src}
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          preserveAspectRatio="none"
          data-editor-image-content="true"
        />
      )}
    </>
  );
}
