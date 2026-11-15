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
