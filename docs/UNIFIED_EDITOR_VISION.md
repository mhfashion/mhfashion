# MH Fashion Unified Editor Vision

**Status:** Canonical product direction for the next editor milestones  
**Scope:** Kittl-inspired design workflow + Photoshop-inspired professional control + Canva-inspired template and brand workflow, adapted for apparel production.

## 1. What we are building

MH Fashion should not become three separate editors hidden behind three different interfaces. It should be one editor with three complementary modes of work:

1. **Create mode — Kittl + Canva strengths.** A fast, visual starting point with templates, ready-made text layouts, searchable assets, brand colors, font pairings, mockups, and one-click composition. Kittl's official editor documentation describes templates, asset search, text layouts, text transformations, effects, artboards, mockups, and a Layers panel as connected parts of the same workflow. [1]
2. **Pro mode — Photoshop strengths.** Precise object and pixel workflows with a Move tool, selection tools, vector paths, masks, groups, Smart Objects, Blend Modes, Opacity, Fill, History, keyboard shortcuts, and non-destructive editing. Photoshop's documented model keeps layer order, Move-tool selection, groups, masks, Smart Objects, and history as explicit controls rather than flattening them into a template operation. [2] [3]
3. **Production mode — MH Fashion's differentiator.** Apparel sides, garment mockups, print-safe areas, fabric and GSM attributes, color and cutting options, DPI/export validation, and a clean production package. Production mode must protect template and print constraints while still allowing approved design edits.

The result should feel approachable when a user starts from a template, powerful when a designer opens the Layers and History docks, and safe when the design is sent to apparel production.

The supplied Kittl project link was not publicly inspectable in this session because it opened an account/authentication screen. This plan therefore uses Kittl's public documentation for behavior, not an unsupported claim about the private project artwork.

## 2. Shared workspace shell

The global site Header and the existing editor command bar remain unchanged. Below them, every mode uses the same workspace shell:

- **Left rail:** Create panels and professional tools. The top group contains Templates, Uploads, Elements, Text, Brand, Mockups, and AI. A divider separates these from Move, Select, Pen, Shape, Eraser, Clone, Gradient, Measure, Hand, and Zoom.
- **Center stage:** the active artboard or apparel side, with zoom, pan, rulers, guides, print-safe overlays, and mockup preview. The stage never owns document truth; it renders the scene graph and dispatches typed commands.
- **Context bar:** selection-aware controls for typography, color, alignment, dimensions, transform, and quick effects. It changes with the selected object but does not hide core layer controls.
- **Right dock:** tabs for Layers, History, Design, and Production. Layers and History are always available. Design exposes the selected object's detailed properties. Production exposes mockup, print area, and export validation.
- **Bottom attributes strip:** product, print method, fabric, knit, GSM, color, cutting, and size. It remains separate from creative editing because changing a garment attribute can change print constraints.

The shell is canvas-first on phone. Left tools become an icon rail, Create assets open in bottom sheets, and Layers/History open as sheets or an overlay. The same scene graph and commands are used on desktop and phone; only panel placement changes.

## 3. Mode behavior

### 3.1 Create mode

Create mode is the fastest path from an empty design to a usable garment composition. It opens with template and asset discovery, not a blank technical panel. Users can search a catalog, filter by category, preview a template, apply it to the active side, and replace editable content without breaking the garment document.

A template is not a flattened image. It is a versioned package containing editable nodes, groups, font references, brand-token slots, print-area intent, and optional mockup placement. A user can enter Pro mode at any time and inspect the same nodes in Layers.

Create mode includes:

- template search by product, style, occasion, and print method;
- recent, liked, and organization-approved templates;
- asset library with upload, element, photo, graphic, and texture categories;
- predefined text combinations that remain separate editable text layers;
- one-click color theme and font pairing application;
- quick mockup preview;
- safe reset that returns to the template version without deleting the source project.

### 3.2 Pro mode

Pro mode exposes the professional tool and layer model without forcing every beginner to see it first. The Move tool supports Auto-select Off, Layer, and Group. Shift-click supports additive selection. Arrow keys nudge selected content, and locked ancestors reject edits with an explanation.

Pro mode keeps editing non-destructive whenever the source type supports it:

- text remains editable until explicit outline/rasterize conversion;
- SVG and vector paths remain editable nodes;
- images retain source metadata and placement transforms;
- Smart Objects preserve source content while allowing replacement;
- masks hide/reveal without deleting source pixels;
- effects are ordered appearance nodes;
- blend mode, opacity, fill, and flow have distinct meanings;
- History stores named document commands and supports undo/redo branches and snapshots.

Photoshop's official guidance describes combining Smart Objects, Smart Filters, adjustment layers, and masks to preserve editability. MH Fashion should adopt that principle while keeping the implementation compatible with the browser scene graph. [2]

### 3.3 Production mode

Production mode makes the document ready for apparel, not merely visually attractive. It displays Front, Back, and any supported garment panels as artboards with garment-specific print-safe geometry. It shows warnings when content is outside the print area, uses an unsupported font, has insufficient raster resolution, or depends on an unavailable source asset.

A production lock can protect mockup geometry, side coordinates, template branding, or approved text. Creative edits remain possible inside the allowed region. The export command produces clean artwork, preview, coordinates, source/version metadata, and warnings instead of a screenshot-only output.

## 4. Unified document model

The editor should evolve from parallel `CanvasMark[]` and `EditorLayer[]` arrays into a typed scene graph while preserving backward compatibility during migration:

```ts
type DesignDocument = {
  version: number;
  activeArtboardId: string;
  artboards: Artboard[];
  nodes: DesignNode[];
  brandTokens: BrandTokenSet[];
  templateSource?: TemplateSource;
  production: ProductionDocument;
  history: HistoryMetadata;
};

type DesignNode = {
  id: string;
  kind: "group" | "text" | "path" | "shape" | "image" | "smart-object" | "mask" | "effect" | "adjustment" | "mockup";
  parentId?: string;
  children?: string[];
  visible: boolean;
  locked: boolean;
  selectable: boolean;
  transform: TransformState;
  appearance: AppearanceState;
  source?: SourceReference;
  constraints?: ProductionConstraint[];
};
```

The important design rule is that a template, an imported image, a text preset, and a hand-drawn path all become nodes in the same document. Their editing affordances differ by `kind`, but selection, grouping, ordering, visibility, locking, history, and export use the same command system.

Commands should be typed and history-backed:

```ts
type EditorCommand =
  | { type: "insert-template"; templateId: string }
  | { type: "insert-node"; node: DesignNode }
  | { type: "update-node"; id: string; patch: Partial<DesignNode> }
  | { type: "move-nodes"; ids: string[]; delta: { x: number; y: number } }
  | { type: "reorder-nodes"; ids: string[]; targetId: string; position: "before" | "inside" | "after" }
  | { type: "apply-effect"; id: string; effect: EffectState }
  | { type: "set-brand-token"; tokenId: string; value: string }
  | { type: "validate-production" };
```

This command boundary is what lets a Kittl-like quick action and a Photoshop-like precise property edit produce the same reliable undo, autosave, collaboration, and export behavior.

## 5. Kittl, Photoshop, and Canva strengths to combine

### Kittl contribution

Use Kittl's design-first behavior for templates, artboards, assets, text layouts, vector creation, text transformations, effects, clipping masks, mockups, and approachable right-panel controls. Kittl documents layers with reorder, hide, lock, and grouped-object expansion, and documents editable text effects and mockup workflows. [1]

### Photoshop contribution

Use Photoshop's professional behavior for document truth: explicit layers/groups, Move Auto-select modes, drag reorder insertion lines, multi-layer movement, masks, Smart Objects, blend modes, non-destructive effects, and named history states. Photoshop documents that Shift-click can add layers to a selection and that selected content can move together. [3]

### Canva contribution

Use Canva's low-friction discovery and team workflow for templates, Brand Kits, and mobile-friendly layer access. Canva documents opening Layers from Position, selecting layers from the panel, drag-reordering with an insertion line, rearranging multiple layers, and Shift-selecting multiple layers. [4] Canva Brand Kits organize official logos, colors, fonts, and assets for use inside the editor, with Brand Templates and brand controls supporting consistency. [5]

### MH Fashion contribution

Add product-aware constraints that generic design tools do not own: front/back garment sides, print method, fabric and GSM, cuttings, mockup placement, print-safe boundaries, export validation, and production handoff. These rules are first-class constraints, not an afterthought added during checkout.

## 6. Panel information architecture

The right dock should use four tabs:

- **Layers:** scene tree, search/filter, multi-select, visibility, lock, groups, reorder, masks, clipping, Smart Object badges, Blend Mode, Opacity, Fill, and effects.
- **History:** named commands, Undo/Redo, snapshots, draft restore, and branch-clearing behavior after a new edit.
- **Design:** context properties for text, vectors, images, effects, transforms, alignment, and color.
- **Production:** active garment side, mockup, print area, DPI, warnings, and export package.

The left Create rail should use five user-facing sections: Templates, Assets, Text, Brand, and AI. Professional tools remain below a divider. This keeps Canva/Kittl discovery separate from Photoshop precision without building three competing sidebars.

## 7. Brand and template system

Brand assets need a reusable token layer rather than copied colors. A Brand Kit stores logos, color palettes, font families, graphics, usage guidelines, and approved templates. Applying a brand theme updates linked nodes only; a user can detach a node to preserve a deliberate exception.

Template slots should support locked, replaceable, and optional content:

- locked logo or production mark;
- replaceable headline text;
- replaceable image or graphic;
- optional badge/group;
- brand color token;
- garment-side placement constraint.

A template preview must explain what is editable before insertion. If a font or source asset is missing, the editor shows a substitution warning and keeps the node editable rather than silently converting it to a raster image.

## 8. Implementation roadmap

**U1 — Unified shell and mode state.** Add Create/Pro/Production mode state without duplicating the canvas. Add right-dock tabs for Layers, History, Design, and Production. Keep current Header and command bar unchanged.

**U2 — Scene graph adapter.** Introduce a node adapter around current `CanvasMark` and `EditorLayer` data. Serialize stable IDs, parent/child links, appearance, source metadata, and production constraints. Add migration tests for existing local drafts.

**U3 — Create system.** Add template records, searchable template cards, editable slots, recent/liked templates, brand token application, and template-safe reset.

**U4 — Pro system.** Complete multi-layer drag reorder, contiguous range selection, group isolation, keyboard movement, masks, Smart Object source states, appearance effects, and richer History snapshots.

**U5 — Production system.** Add garment-aware artboards, print-safe geometry, DPI/font/source validation, mockup linkage, and reproducible export manifests.

**U6 — Collaboration and AI.** Add comments/presence, permissions, version restore, AI generation as node insertion, and brand-safe AI guardrails. AI suggestions must create editable nodes or clearly labeled raster results; they must not silently replace the source design.

## 9. Non-negotiable product rules

The three inspirations must be combined at the document and command level, not by copying three visual shells. There must be one selection model, one layer tree, one history system, one autosave path, and one export validator.

Fast template actions must always be inspectable in Pro mode. Professional operations must not destroy template semantics without an explicit conversion. Production restrictions must be visible and explainable. Mobile must expose the same capabilities through sheets and compact controls rather than becoming a separate reduced document model.

## References

[1]: https://help.kittl.com/editing-and-design "Kittl Editing and design official documentation"
[2]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html "Adobe Photoshop Non-destructive editing techniques"
[3]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Adobe Photoshop Reorder and move layers"
[4]: https://www.canva.com/help/finding-and-arranging-layers/ "Canva Finding and arranging layers"
[5]: https://www.canva.com/help/brand-kit/ "Canva Set up Brand Kits"
