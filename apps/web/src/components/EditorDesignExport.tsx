"use client";

import type { RefObject } from "react";
import type { EditorArtworkLayer, MaskBrushMode } from "@/lib/editor-layers";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
import { ARTWORK_VIEWBOX } from "@/lib/design-export";

/**
 * The artwork on its own, with no transform box, guides or inline text editor, so "Download my
 * design" writes exactly the layers and nothing the editor draws for the operator.
 */
export default function EditorDesignExport({
  svgRef,
  layers,
  layerOffsets,
  layerScales,
  layerOrigins,
  layerRotations,
  selectedMaskLayerId,
  maskBrushMode,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  layers: EditorArtworkLayer[];
  layerOffsets?: Record<string, { x: number; y: number }>;
  layerScales?: Record<string, { x: number; y: number }>;
  layerOrigins?: Record<string, { x: number; y: number }>;
  layerRotations?: Record<string, number>;
  selectedMaskLayerId?: string | null;
  maskBrushMode?: MaskBrushMode;
}) {
  return (
    <svg
      ref={svgRef}
      data-editor-export-canvas="true"
      aria-hidden="true"
      viewBox={`0 0 ${ARTWORK_VIEWBOX.width} ${ARTWORK_VIEWBOX.height}`}
      className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
    >
      <g data-editor-export-artwork="true">
        <EditorArtworkLayers
          layers={layers}
          layerOffsets={layerOffsets}
          layerScales={layerScales}
          layerOrigins={layerOrigins}
          layerRotations={layerRotations}
          selectedMaskLayerId={selectedMaskLayerId}
          maskBrushMode={maskBrushMode}
        />
      </g>
    </svg>
  );
}
