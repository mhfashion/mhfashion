export const EDITOR_CANVAS_SPEC = Object.freeze({
  width: 4500,
  height: 5400,
  resolutionDpi: 300,
  background: "transparent" as const,
  format: "png" as const,
  fixed: true as const,
});

export const EDITOR_ARTBOARD_ID = "mh-editor-artboard";

export type EditorHistory = {
  snapshots: string[];
  index: number;
};

export type EditorViewportTransform = [number, number, number, number, number, number];
export type SerializedEditorDocument = Record<string, unknown>;

/** Fit the fixed logical print canvas into the visible viewport. */
export function calculateEditorViewport(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  artboardWidth = EDITOR_CANVAS_SPEC.width,
  artboardHeight = EDITOR_CANVAS_SPEC.height,
  padding = 24,
): EditorViewportTransform {
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const fitScale = Math.min(availableWidth / artboardWidth, availableHeight / artboardHeight);
  const scale = Math.max(0.01, fitScale * clampEditorZoom(zoom));
  const offsetX = (viewportWidth - artboardWidth * scale) / 2 + panX;
  const offsetY = (viewportHeight - artboardHeight * scale) / 2 + panY;
  return [scale, 0, 0, scale, offsetX, offsetY];
}

/** Scale a pre-fixed-size 500×600 local document into the current 4500×5400 print canvas. */
export function migrateLegacyEditorDocument(document: SerializedEditorDocument): SerializedEditorDocument {
  const scaleX = EDITOR_CANVAS_SPEC.width / 500;
  const scaleY = EDITOR_CANVAS_SPEC.height / 600;
  const objects = Array.isArray(document.objects) ? document.objects : [];

  return {
    ...document,
    objects: objects.flatMap((value) => {
      if (!value || typeof value !== "object") return [value];
      const object = value as Record<string, unknown>;
      if (object.editorId === EDITOR_ARTBOARD_ID) {
        return [{
          ...object,
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          width: EDITOR_CANVAS_SPEC.width,
          height: EDITOR_CANVAS_SPEC.height,
          scaleX: 1,
          scaleY: 1,
          fill: "rgba(0,0,0,0)",
          stroke: "rgba(0,0,0,0)",
          strokeWidth: 0,
          opacity: 0,
        }];
      }

      const type = typeof object.type === "string" ? object.type.toLowerCase() : "";
      const text = typeof object.text === "string" ? object.text.trim().toLowerCase().replace(/[\s-]+/g, " ") : "";
      if (["textbox", "i-text", "text"].includes(type) && ["t shirt", "your design"].includes(text)) {
        return [];
      }

      const migrated: Record<string, unknown> = { ...object };
      const scaleProperty = (key: string, factor: number) => {
        const valueAtKey = object[key];
        if (typeof valueAtKey === "number" && Number.isFinite(valueAtKey)) {
          migrated[key] = valueAtKey * factor;
        }
      };
      scaleProperty("left", scaleX);
      scaleProperty("top", scaleY);

      if (["textbox", "i-text", "text"].includes(type)) {
        for (const key of ["width", "height", "fontSize", "strokeWidth"]) scaleProperty(key, scaleX);
      } else if (type === "rect") {
        for (const key of ["width", "height", "rx", "ry", "strokeWidth"]) scaleProperty(key, scaleX);
      } else if (type === "circle") {
        for (const key of ["width", "height", "radius", "strokeWidth"]) scaleProperty(key, scaleX);
      } else {
        for (const key of ["scaleX", "scaleY", "strokeWidth"]) scaleProperty(key, scaleX);
      }
      return [migrated];
    }),
  };
}

export function clampEditorZoom(zoom: number): number {
  return Math.min(3, Math.max(0.25, Number.isFinite(zoom) ? zoom : 1));
}

export function createEditorHistory(initialSnapshot: string): EditorHistory {
  return { snapshots: [initialSnapshot], index: 0 };
}

export function pushEditorSnapshot(
  history: EditorHistory,
  snapshot: string,
  limit = 40,
): EditorHistory {
  if (history.snapshots[history.index] === snapshot) return history;

  const branched = [...history.snapshots.slice(0, history.index + 1), snapshot];
  const trimmed = branched.slice(-Math.max(2, limit));
  return { snapshots: trimmed, index: trimmed.length - 1 };
}

export function stepEditorHistory(
  history: EditorHistory,
  direction: "undo" | "redo",
): { history: EditorHistory; snapshot?: string } {
  const nextIndex = history.index + (direction === "undo" ? -1 : 1);
  if (nextIndex < 0 || nextIndex >= history.snapshots.length) {
    return { history, snapshot: undefined };
  }
  return {
    history: { ...history, index: nextIndex },
    snapshot: history.snapshots[nextIndex],
  };
}
