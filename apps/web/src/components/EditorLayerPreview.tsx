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
      {text && (
        <text
          x={text.x}
          y={text.y}
          fontSize={text.fontSize}
          fill={text.color}
          textAnchor="middle"
          style={{ fontFamily: EDITOR_TEXT_FONT_FAMILY, fontWeight: 700 }}
          data-editor-text-content="true"
        >
          {text.value}
        </text>
      )}
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
