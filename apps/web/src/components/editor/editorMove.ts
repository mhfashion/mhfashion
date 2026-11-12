import type { FabricObject } from "fabric";
import type { CanvasMark } from "./InteractiveCanvas";
import type { EditorLayer } from "./LayersPanel";

export type MoveTransform = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  skewX: number;
  skewY: number;
  originX: CanvasMark["originX"];
  originY: CanvasMark["originY"];
};

export type MoveSnapshot = Map<string, MoveTransform>;

type DataObject = FabricObject & { data?: CanvasMark };

export function objectId(object: FabricObject): string | undefined {
  return (object as DataObject).data?.id;
}

export function captureMoveTransform(object: FabricObject): MoveTransform {
  return {
    left: object.left ?? 0,
    top: object.top ?? 0,
    scaleX: object.scaleX ?? 1,
    scaleY: object.scaleY ?? 1,
    angle: object.angle ?? 0,
    skewX: object.skewX ?? 0,
    skewY: object.skewY ?? 0,
    originX: object.originX as CanvasMark["originX"],
    originY: object.originY as CanvasMark["originY"],
  };
}

export function captureMoveSnapshot(objects: FabricObject[]): MoveSnapshot {
  return new Map(objects.flatMap((object) => {
    const id = objectId(object);
    return id ? [[id, captureMoveTransform(object)] as const] : [];
  }));
}

export function restoreMoveSnapshot(objects: FabricObject[], snapshot: MoveSnapshot) {
  for (const object of objects) {
    const id = objectId(object);
    const transform = id ? snapshot.get(id) : undefined;
    if (!transform) continue;
    object.set(transform);
    object.setCoords();
  }
}

export function isLayerLocked(layers: EditorLayer[], id: string | undefined): boolean {
  let layer = id ? layers.find((candidate) => candidate.id === id) : undefined;
  while (layer) {
    if (layer.locked) return true;
    layer = layer.parentId ? layers.find((candidate) => candidate.id === layer?.parentId) : undefined;
  }
  return false;
}

export function movableObjects(objects: FabricObject[], layers: EditorLayer[]): FabricObject[] {
  return objects.filter((object) => {
    const id = objectId(object);
    return Boolean(id) && !isLayerLocked(layers, id) && object.visible !== false;
  });
}

export function applySceneDelta(objects: FabricObject[], delta: { x: number; y: number }) {
  for (const object of objects) {
    object.set({ left: (object.left ?? 0) + delta.x, top: (object.top ?? 0) + delta.y });
    object.setCoords();
  }
}

export function transformChanged(before: MoveSnapshot, objects: FabricObject[], epsilon = 0.001): boolean {
  return objects.some((object) => {
    const id = objectId(object);
    const previous = id ? before.get(id) : undefined;
    if (!previous) return false;
    const current = captureMoveTransform(object);
    return ["left", "top", "scaleX", "scaleY", "angle", "skewX", "skewY"].some((key) =>
      Math.abs(Number(current[key as keyof MoveTransform]) - Number(previous[key as keyof MoveTransform])) > epsilon,
    );
  });
}

export function roundDocumentValue(value: number): number {
  return Math.round(value * 100) / 100;
}
