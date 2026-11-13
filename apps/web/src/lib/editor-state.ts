export type EditorHistory = {
  snapshots: string[];
  index: number;
};

export type EditorViewportTransform = [number, number, number, number, number, number];

export function clampEditorZoom(zoom: number): number {
  return Math.min(3, Math.max(0.25, Number.isFinite(zoom) ? zoom : 1));
}

/** Fit a logical artboard into the visible viewport without changing document coordinates. */
export function calculateEditorViewport(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  artboardWidth = 500,
  artboardHeight = 600,
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
