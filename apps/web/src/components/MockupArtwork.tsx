"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LARGE_ARTWORK_EDGE_PX, SMALL_ARTWORK_EDGE_PX } from "@/lib/editor-artwork-tiers";

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

const BASE_ARTWORK_SCALE = 0.82;
const PIXELS_PER_VIEWBOX_UNIT = 4.5;

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
  const scale = BASE_ARTWORK_SCALE * transform.scale;
  return {
    x: 500 + transform.x + (bounds.x - 500) * scale,
    y: 600 + transform.y + (bounds.y - 600) * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
}

function getOriginalArtworkEdgePx(bounds: Bounds): number {
  return Math.max(bounds.width, bounds.height) * PIXELS_PER_VIEWBOX_UNIT * BASE_ARTWORK_SCALE;
}

function getMaxArtworkScale(bounds: Bounds, maxEdgePx: number): number {
  const originalEdgePx = getOriginalArtworkEdgePx(bounds);
  return Math.max(0.25, Math.min(3, maxEdgePx / originalEdgePx));
}

function scaleAroundCenter(bounds: Bounds, transform: Transform, scale: number): Transform {
  const currentFrame = getDisplayedBounds(bounds, transform);
  const center = { x: currentFrame.x + currentFrame.width / 2, y: currentFrame.y + currentFrame.height / 2 };
  const artworkCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const artworkScale = BASE_ARTWORK_SCALE * scale;
  return {
    scale,
    x: center.x - 500 - (artworkCenter.x - 500) * artworkScale,
    y: center.y - 600 - (artworkCenter.y - 600) * artworkScale,
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

export default function MockupArtwork({
  side,
  strokes,
  maxArtworkEdgePx,
  onLargeTierRequested,
  onArtworkDisplayedEdgeChange,
  viewZoom,
}: {
  side: MockupSide;
  strokes: Stroke[];
  maxArtworkEdgePx: number;
  onLargeTierRequested: (side: MockupSide) => void;
  onArtworkDisplayedEdgeChange: (side: MockupSide, longestEdgePx: number) => void;
  viewZoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const bounds = useMemo(() => getArtworkBounds(strokes), [strokes]);
  const maxArtworkScale = getMaxArtworkScale(bounds, maxArtworkEdgePx);
  const [transform, setTransform] = useState<Transform>(() => ({ x: 0, y: 0, scale: Math.min(1, maxArtworkScale) }));
  const [selected, setSelected] = useState(false);
  const [touchHitRadius, setTouchHitRadius] = useState(92);
  const safeTransform = transform.scale > maxArtworkScale ? scaleAroundCenter(bounds, transform, maxArtworkScale) : transform;
  const frame = getDisplayedBounds(bounds, safeTransform);
  const displayedWidthPx = Math.round(frame.width * PIXELS_PER_VIEWBOX_UNIT);
  const displayedHeightPx = Math.round(frame.height * PIXELS_PER_VIEWBOX_UNIT);
  const displayedLongestEdgePx = strokes.length === 0 ? 0 : Math.max(displayedWidthPx, displayedHeightPx);
  const separateTouchHandle = Math.max(frame.width, frame.height) < touchHitRadius * 2;
  const touchResizePoint = separateTouchHandle
    ? { x: frame.x + frame.width / 2 + touchHitRadius * 2.4, y: frame.y + frame.height / 2 }
    : { x: frame.x + frame.width, y: frame.y + frame.height };
  const hasArtwork = strokes.length > 0;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const updateTouchTarget = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // Screen-sized touch targets remain usable after viewport zoom and phone rotation.
      setTouchHitRadius(22 * Math.max(1000 / rect.width, 1200 / rect.height));
    };
    const frameId = window.requestAnimationFrame(updateTouchTarget);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateTouchTarget);
    observer?.observe(svg);
    window.addEventListener("resize", updateTouchTarget);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", updateTouchTarget);
    };
  }, [hasArtwork, viewZoom]);
  useEffect(() => {
    const cancelDrag = () => { dragRef.current = null; };
    window.addEventListener("blur", cancelDrag);
    return () => window.removeEventListener("blur", cancelDrag);
  }, []);
  useEffect(() => {
    if (transform.scale <= maxArtworkScale) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Persist the clamp so a later tier transfer cannot restore the old oversized scale.
    setTransform((current) => current.scale > maxArtworkScale
      ? scaleAroundCenter(bounds, current, maxArtworkScale)
      : current);
  }, [bounds, maxArtworkScale, transform.scale]);
  useEffect(() => {
    onArtworkDisplayedEdgeChange(side, displayedLongestEdgePx);
  }, [displayedLongestEdgePx, onArtworkDisplayedEdgeChange, side]);
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
    if (!svg || event.button !== 0 || !event.isPrimary || dragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toViewBoxPoint(svg, event.clientX, event.clientY);
    const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    svg.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      start,
      origin: safeTransform,
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
    const requestedScale = drag.origin.scale * radius / drag.startRadius;
    const claimsLargeTier = getOriginalArtworkEdgePx(bounds) * requestedScale > SMALL_ARTWORK_EDGE_PX;
    if (claimsLargeTier) {
      onLargeTierRequested(side);
    }
    const gestureMaxScale = claimsLargeTier ? getMaxArtworkScale(bounds, LARGE_ARTWORK_EDGE_PX) : maxArtworkScale;
    const scale = Math.max(0.25, Math.min(gestureMaxScale, requestedScale));
    setTransform(scaleAroundCenter(bounds, drag.origin, scale));
  };

  const endTransform = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const resizeByKeyboard = (amount: number) => {
    const requestedScale = safeTransform.scale + amount;
    const claimsLargeTier = getOriginalArtworkEdgePx(bounds) * requestedScale > SMALL_ARTWORK_EDGE_PX;
    if (claimsLargeTier) {
      onLargeTierRequested(side);
    }
    const keyboardMaxScale = claimsLargeTier ? getMaxArtworkScale(bounds, LARGE_ARTWORK_EDGE_PX) : maxArtworkScale;
    const scale = Math.max(0.25, Math.min(keyboardMaxScale, requestedScale));
    setTransform(scaleAroundCenter(bounds, safeTransform, scale));
  };

  const resizeKeyDown = (event: React.KeyboardEvent<SVGCircleElement>) => {
    if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowUp" || event.key === "ArrowRight") resizeByKeyboard(0.1);
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") resizeByKeyboard(-0.1);
  };

  if (strokes.length === 0) return null;

  return (
    <>
    <svg
      ref={svgRef}
      role="group"
      aria-label={`${side} artwork overlay, ${displayedWidthPx} × ${displayedHeightPx} px`}
      data-artwork-max-edge-px={maxArtworkEdgePx}
      viewBox="0 0 1000 1200"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={moveTransform}
      onPointerUp={endTransform}
      onPointerCancel={endTransform}
      onLostPointerCapture={endTransform}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible touch-none"
    >
      <g transform={`translate(${500 + safeTransform.x} ${600 + safeTransform.y}) scale(${BASE_ARTWORK_SCALE * safeTransform.scale}) translate(-500 -600)`}>
        {artwork}
      </g>
      <rect
        data-artwork-move-touch-target
        x={frame.x + frame.width / 2 - Math.max(frame.width + 32, touchHitRadius * 2) / 2}
        y={frame.y + frame.height / 2 - Math.max(frame.height + 32, touchHitRadius * 2) / 2}
        width={Math.max(frame.width + 32, touchHitRadius * 2)}
        height={Math.max(frame.height + 32, touchHitRadius * 2)}
        fill="transparent"
        aria-hidden="true"
        onPointerDown={(event) => startTransform("move", event)}
        className="pointer-events-none touch-none [@media(pointer:coarse)]:pointer-events-auto"
      />
      <rect
        x={frame.x - 16}
        y={frame.y - 16}
        width={frame.width + 32}
        height={frame.height + 32}
        fill="transparent"
        stroke="transparent"
        aria-label={`Move ${side} artwork`}
        onPointerDown={(event) => startTransform("move", event)}
        className="pointer-events-auto cursor-move touch-none"
      />
      {selected && <g>
        <text x={frame.x - 16} y={frame.y - 28} fill="#60429d" fontSize="28" fontWeight="600" pointerEvents="none" className="[@media(pointer:coarse)]:hidden">{`${displayedWidthPx} × ${displayedHeightPx} px`}</text>
        <rect x={frame.x - 16} y={frame.y - 16} width={frame.width + 32} height={frame.height + 32} fill="none" stroke="#8f72d4" strokeWidth="5" strokeDasharray="12 8" pointerEvents="none" />
        <circle
          data-artwork-resize-touch-target
          cx={touchResizePoint.x}
          cy={touchResizePoint.y}
          r={touchHitRadius}
          fill="transparent"
          aria-hidden="true"
          onPointerDown={(event) => startTransform("resize", event)}
          className="pointer-events-none touch-none [@media(pointer:coarse)]:pointer-events-auto"
        />
        <circle
          cx={frame.x + frame.width}
          cy={frame.y + frame.height}
          r="20"
          fill="white"
          stroke="#8f72d4"
          strokeWidth="6"
          role="button"
          tabIndex={0}
          aria-label={`Resize mockup artwork; maximum edge ${maxArtworkEdgePx} px`}
          onPointerDown={(event) => startTransform("resize", event)}
          onKeyDown={resizeKeyDown}
          className={`pointer-events-auto cursor-nwse-resize touch-none ${separateTouchHandle ? "[@media(pointer:coarse)]:hidden" : ""}`}
        />
        {separateTouchHandle && <g className="hidden [@media(pointer:coarse)]:block">
          <line x1={frame.x + frame.width} y1={frame.y + frame.height / 2} x2={touchResizePoint.x} y2={touchResizePoint.y} stroke="#8f72d4" strokeWidth="4" pointerEvents="none" />
          <circle
            data-artwork-separated-resize-handle
            cx={touchResizePoint.x}
            cy={touchResizePoint.y}
            r="20"
            fill="white"
            stroke="#8f72d4"
            strokeWidth="6"
            role="button"
            tabIndex={0}
            aria-label={`Resize mockup artwork; maximum edge ${maxArtworkEdgePx} px`}
            onPointerDown={(event) => startTransform("resize", event)}
            onKeyDown={resizeKeyDown}
            className="pointer-events-auto cursor-nwse-resize touch-none"
          />
        </g>}
      </g>}
    </svg>
    {selected && <div data-artwork-touch-dimensions style={{ transform: `scale(${1 / viewZoom})`, transformOrigin: "top left" }} className="pointer-events-none absolute left-2 top-2 z-30 hidden rounded bg-white/90 px-2 py-1 text-xs font-medium text-[#60429d] [@media(pointer:coarse)]:block">{`${displayedWidthPx} × ${displayedHeightPx} px`}</div>}
    </>
  );
}
