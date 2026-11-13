"use client";

import { useMemo, useRef, useState } from "react";

type MockupSide = "Front Mockup" | "Back Mockup";
type Point = { x: number; y: number };
type Stroke = { points: Point[] };
type Transform = { x: number; y: number; scale: number };
type Bounds = { x: number; y: number; width: number; height: number };
type Drag = {
  mode: "move" | "resize";
  pointerId: number;
  start: Point;
  origin: Transform;
  center: Point;
  startRadius: number;
};

function getArtworkBounds(strokes: Stroke[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x * 1000);
      maxX = Math.max(maxX, point.x * 1000);
      minY = Math.min(minY, point.y * 1200);
      maxY = Math.max(maxY, point.y * 1200);
    }
  }
  if (!Number.isFinite(minX)) return { x: 300, y: 360, width: 400, height: 480 };
  const pad = 18;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(1000, maxX + pad);
  const bottom = Math.min(1200, maxY + pad);
  return { x: left, y: top, width: Math.max(36, right - left), height: Math.max(36, bottom - top) };
}

function getDisplayedBounds(bounds: Bounds, transform: Transform): Bounds {
  const scale = 0.82 * transform.scale;
  return {
    x: 500 + transform.x + (bounds.x - 500) * scale,
    y: 600 + transform.y + (bounds.y - 600) * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
}

function toViewBoxPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const rect = svg.getBoundingClientRect();
  const unitsPerPixel = Math.max(1000 / rect.width, 1200 / rect.height);
  const renderedWidth = 1000 / unitsPerPixel;
  const renderedHeight = 1200 / unitsPerPixel;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  return {
    x: (clientX - rect.left - offsetX) * unitsPerPixel,
    y: (clientY - rect.top - offsetY) * unitsPerPixel,
  };
}

export default function MockupArtwork({ side, strokes }: { side: MockupSide; strokes: Stroke[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState(false);
  const bounds = useMemo(() => getArtworkBounds(strokes), [strokes]);
  const frame = getDisplayedBounds(bounds, transform);
  const artwork = useMemo(() => strokes.map((stroke, index) => {
    const path = stroke.points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1200}`).join(" ");
    return stroke.points.length === 1 ? (
      <circle key={index} cx={stroke.points[0].x * 1000} cy={stroke.points[0].y * 1200} r="12" fill="#202124" />
    ) : (
      <path key={index} d={path} fill="none" stroke="#202124" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    );
  }), [strokes]);

  const startTransform = (mode: Drag["mode"], event: React.PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toViewBoxPoint(svg, event.clientX, event.clientY);
    const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    svg.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      start,
      origin: transform,
      center,
      startRadius: Math.max(1, Math.hypot(start.x - center.x, start.y - center.y)),
    };
    setSelected(true);
  };

  const moveTransform = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !svg) return;
    event.preventDefault();
    const point = toViewBoxPoint(svg, event.clientX, event.clientY);
    if (drag.mode === "move") {
      const x = drag.origin.x + point.x - drag.start.x;
      const y = drag.origin.y + point.y - drag.start.y;
      const movedBounds = getDisplayedBounds(bounds, { ...drag.origin, x, y });
      const correctionX = movedBounds.x < 0 ? -movedBounds.x : movedBounds.x + movedBounds.width > 1000 ? 1000 - movedBounds.x - movedBounds.width : 0;
      const correctionY = movedBounds.y < 0 ? -movedBounds.y : movedBounds.y + movedBounds.height > 1200 ? 1200 - movedBounds.y - movedBounds.height : 0;
      setTransform({ ...drag.origin, x: x + correctionX, y: y + correctionY });
      return;
    }
    const radius = Math.hypot(point.x - drag.center.x, point.y - drag.center.y);
    const scale = Math.max(0.25, Math.min(3, drag.origin.scale * radius / drag.startRadius));
    const artworkScale = 0.82 * scale;
    const artworkCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    setTransform({
      scale,
      x: drag.center.x - 500 - (artworkCenter.x - 500) * artworkScale,
      y: drag.center.y - 600 - (artworkCenter.y - 600) * artworkScale,
    });
  };

  const endTransform = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const resizeByKeyboard = (amount: number) => {
    const scale = Math.max(0.25, Math.min(3, transform.scale + amount));
    const artworkScale = 0.82 * scale;
    const artworkCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    setTransform({
      scale,
      x: center.x - 500 - (artworkCenter.x - 500) * artworkScale,
      y: center.y - 600 - (artworkCenter.y - 600) * artworkScale,
    });
  };

  if (strokes.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      role="group"
      aria-label={`${side} artwork overlay`}
      viewBox="0 0 1000 1200"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={moveTransform}
      onPointerUp={endTransform}
      onPointerCancel={endTransform}
      onLostPointerCapture={endTransform}
      className="absolute inset-0 z-20 h-full w-full overflow-visible touch-none"
    >
      <g transform={`translate(${500 + transform.x} ${600 + transform.y}) scale(${0.82 * transform.scale}) translate(-500 -600)`}>
        {artwork}
      </g>
      <rect
        x={frame.x - 16}
        y={frame.y - 16}
        width={frame.width + 32}
        height={frame.height + 32}
        fill="transparent"
        stroke="transparent"
        aria-label={`Move ${side} artwork`}
        onPointerDown={(event) => startTransform("move", event)}
        className="cursor-move"
      />
      {selected && <g>
        <rect x={frame.x - 16} y={frame.y - 16} width={frame.width + 32} height={frame.height + 32} fill="none" stroke="#8f72d4" strokeWidth="5" strokeDasharray="12 8" pointerEvents="none" />
        <circle
          cx={frame.x + frame.width}
          cy={frame.y + frame.height}
          r="20"
          fill="white"
          stroke="#8f72d4"
          strokeWidth="6"
          role="button"
          tabIndex={0}
          aria-label="Resize mockup artwork"
          onPointerDown={(event) => startTransform("resize", event)}
          onKeyDown={(event) => {
            if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) event.preventDefault();
            if (event.key === "ArrowUp" || event.key === "ArrowRight") resizeByKeyboard(0.1);
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") resizeByKeyboard(-0.1);
          }}
          className="cursor-nwse-resize"
        />
      </g>}
    </svg>
  );
}
