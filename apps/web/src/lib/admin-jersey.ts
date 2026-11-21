// Jersey mapping setup (Plan §4.4): one worn photo per style plus a quad per garment panel. The same
// zones feed the catalog preview and the post-edit mockup, so they are validated like print data:
// inside the photo, non-degenerate, and every required panel present.

import {
  JERSEY_PANEL_KEYS, JERSEY_REQUIRED_PANELS,
  type AdminDemoData, type JerseyPanel, type JerseyPanelKey, type JerseyPoint, type JerseyStyle,
} from "@/lib/admin-demo-data";

export const PANEL_LABELS: Record<JerseyPanelKey, string> = {
  "front-left": "Front left",
  "front-right": "Front right",
  "left-sleeve": "Left sleeve",
  "right-sleeve": "Right sleeve",
  collar: "Collar",
  back: "Back",
};

export const CORNER_LABELS = ["Top left", "Top right", "Bottom right", "Bottom left"] as const;

/** Smallest quad the mapping accepts, in square percent of the photo. */
export const MIN_PANEL_AREA = 25;

export function jerseyStyles(data: AdminDemoData): JerseyStyle[] {
  return data.jerseyStyles ?? [];
}

export function panelOf(style: JerseyStyle, key: JerseyPanelKey): JerseyPanel | undefined {
  return style.panels.find((panel) => panel.key === key);
}

/** Shoelace area; a quad whose corners collapse has an area near zero. */
export function quadArea(corners: readonly JerseyPoint[]): number {
  let total = 0;
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index];
    const next = corners[(index + 1) % corners.length];
    total += current.x * next.y - next.x * current.y;
  }
  return Math.abs(total) / 2;
}

function inPhoto(point: JerseyPoint): boolean {
  return point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100;
}

export function panelIssues(panel: JerseyPanel): string[] {
  const label = PANEL_LABELS[panel.key];
  const issues: string[] = [];
  const outside = panel.corners.filter((corner) => !inPhoto(corner));
  if (outside.length) issues.push(`${label}: ${outside.length} corner${outside.length === 1 ? " is" : "s are"} outside the photo.`);
  if (quadArea(panel.corners) < MIN_PANEL_AREA) issues.push(`${label}: the corners are too close together — the panel would print almost nothing.`);
  if (panel.view !== (panel.key === "back" ? "back" : "front")) {
    issues.push(`${label}: it belongs on the ${panel.key === "back" ? "back" : "front"} photo.`);
  }
  return issues;
}

export function styleIssues(style: JerseyStyle, all: readonly JerseyStyle[]): string[] {
  const issues: string[] = [];
  if (!style.name.trim()) issues.push("Give the style a name.");
  const clash = all.find((entry) => entry.id !== style.id && entry.name.trim().toLowerCase() === style.name.trim().toLowerCase());
  if (clash) issues.push(`"${style.name.trim()}" is already a style.`);

  for (const key of JERSEY_REQUIRED_PANELS) {
    if (!panelOf(style, key)) issues.push(`${PANEL_LABELS[key]} is required — the catalog preview and the mockup both need it.`);
  }
  for (const panel of style.panels) issues.push(...panelIssues(panel));
  if (!style.panels.length) issues.push("A style needs at least one panel.");
  return issues;
}

/** Adds every missing panel with a small default quad, so a new style is editable immediately. */
export function completePanels(style: JerseyStyle): JerseyStyle {
  const panels = [...style.panels];
  for (const key of JERSEY_PANEL_KEYS) {
    if (panels.some((panel) => panel.key === key)) continue;
    const view: JerseyPanel["view"] = key === "back" ? "back" : "front";
    panels.push({ key, view, corners: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }] });
  }
  return { ...style, panels };
}

export function saveStyle(data: AdminDemoData, style: JerseyStyle): { data: AdminDemoData; issues: string[] } {
  const styles = jerseyStyles(data);
  const exists = styles.some((entry) => entry.id === style.id);
  const next = exists ? styles.map((entry) => (entry.id === style.id ? style : entry)) : [...styles, style];
  const issues = styleIssues(style, next);
  if (issues.length) return { data, issues };
  return { data: { ...data, jerseyStyles: next }, issues: [] };
}

/** Refuses to delete the last style, so the jersey product never ends up with no mapping. */
export function removeStyle(data: AdminDemoData, id: string): { data: AdminDemoData; issues: string[] } {
  const styles = jerseyStyles(data);
  if (styles.length <= 1) return { data, issues: ["Keep at least one style — the jersey product needs a mapping to show a preview."] };
  return { data: { ...data, jerseyStyles: styles.filter((style) => style.id !== id) }, issues: [] };
}

export function duplicateStyle(data: AdminDemoData, id: string, name: string): { data: AdminDemoData; issues: string[] } {
  const source = jerseyStyles(data).find((style) => style.id === id);
  if (!source) return { data, issues: ["That style no longer exists."] };
  const copy: JerseyStyle = {
    ...source,
    id: `${source.id}-copy-${Date.now().toString(36)}`,
    name,
    wornPhoto: source.wornPhoto ? source.wornPhoto.replace(source.id, `${source.id}-copy`) : null,
    panels: source.panels.map((panel) => ({ ...panel, corners: panel.corners.map((corner) => ({ ...corner })) as JerseyPanel["corners"] })),
  };
  return saveStyle(data, copy);
}

export function updatePanel(
  data: AdminDemoData,
  styleId: string,
  key: JerseyPanelKey,
  corners: JerseyPanel["corners"],
): { data: AdminDemoData; issues: string[] } {
  const style = jerseyStyles(data).find((entry) => entry.id === styleId);
  if (!style) return { data, issues: ["That style no longer exists."] };
  const next: JerseyStyle = {
    ...style,
    panels: style.panels.map((panel) => (panel.key === key ? { ...panel, corners } : panel)),
  };
  return saveStyle(data, next);
}

/** R2 object layout from the plan: jersey-mockups/{id}/worn_photo.png + mapping_zones.json. */
export function mappingZonesJson(style: JerseyStyle): string {
  return JSON.stringify({
    styleId: style.id,
    name: style.name,
    wornPhoto: style.wornPhoto,
    updatedAt: style.updatedAt,
    panels: style.panels.map((panel) => ({
      key: panel.key,
      view: panel.view,
      corners: panel.corners.map((corner) => ({ x: Math.round(corner.x * 100) / 100, y: Math.round(corner.y * 100) / 100 })),
    })),
  }, null, 2);
}

/** Which required panels the style is still missing, for the checklist in the UI. */
export function missingPanels(style: JerseyStyle): JerseyPanelKey[] {
  return JERSEY_REQUIRED_PANELS.filter((key) => !panelOf(style, key));
}

export function panelsForView(style: JerseyStyle, view: "front" | "back"): JerseyPanel[] {
  return style.panels.filter((panel) => panel.view === view);
}

/** A quad's SVG path for the preview overlay. */
export function panelPath(panel: JerseyPanel): string {
  return `${panel.corners.map((corner, index) => `${index === 0 ? "M" : "L"}${corner.x} ${corner.y}`).join(" ")} Z`;
}
