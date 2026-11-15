# Kittl Canvas / Editor Audit for MH Fashion

**Date:** 2026-11-15  
**Scope:** Kittl editor behavior only; no code changes are included in this audit.

## Main conclusion

Kittl ရဲ့ အခြေခံ Canvas workflow ကို MH Fashion ရဲ့ လက်ရှိ system ထဲမှာ ဆက်လက်တည်ဆောက်လို့ရပါတယ်။ လက်ရှိ layer model, Layers panel, Group/Ungroup, linked layers, dynamic selection bounds, eight resize handles, rotate handle, mask brush, Text tool, Text Adjustment panel တို့က အခြေခံအုတ်မြစ်ဖြစ်နေပြီး Kittl-style interaction အချို့ကို တိုက်ရိုက်ထည့်နိုင်ပါတယ်။

ဒါပေမယ့် Kittl ရဲ့ အဆင့်မြင့် editor behavior အချို့က လက်ရှိ system ရဲ့ data model နဲ့ မလုံလောက်သေးပါ။ အထူးသဖြင့် character-level formatting, text box geometry/wrapping, text transformations, shadow/decoration effects, glyphs/ligatures, vector node editing, clipping masks, artboard hierarchy, and effect-preserving undo/redo တို့က model-level expansion လိုပါတယ်။ အဲဒီအပိုင်းတွေကို implementation မစခင် approval လိုပါတယ်။

## Kittl ရဲ့ Canvas workflow မှာ အဓိကတွေ့ရှိချက်များ

Kittl မှာ element တစ်ခုရွေးပြီး Canvas ပေါ်မှာ move, scale, rotate, delete လုပ်နိုင်ပါတယ်။ Corner handle က scale အတွက်ဖြစ်ပြီး bounding box အောက်ဘက်မှာ သီးခြား rotate handle ပါပါတယ်။ Multi-select လုပ်ထားရင် element အားလုံးကို တစ်စုတည်း move, scale, rotate, delete လုပ်နိုင်ပါတယ်။ Zoom, pan, undo/redo တွေက Canvas workflow ရဲ့ အခြေခံအပိုင်းဖြစ်ပါတယ်။ Source: [Kittl Canvas essentials](https://help.kittl.com/editing-and-design/basic-handling)

Kittl Text tool က click တစ်ချက်နဲ့ text box ဖန်တီးပြီး ချက်ချင်းရိုက်နိုင်ပါတယ်။ Click-and-drag လုပ်ရင် custom-size text box ဖန်တီးနိုင်ပါတယ်။ စာရိုက်ပြီးတာနဲ့ Text tool က selection arrow သို့ ပြန်ပြောင်းပါတယ်။ Source: [Kittl Add text](https://help.kittl.com/editing-and-design/adding-text)

Kittl Layers panel က Canvas နဲ့ တစ်ဖက်တစ်လမ်းမဟုတ်ဘဲ two-way selection workflow ဖြစ်ပါတယ်။ Canvas ပေါ် element ကို hover လုပ်ရင် Layers panel မှာ highlight ဖြစ်ပြီး Layers panel မှာ hover လုပ်ရင် Canvas element ကို highlight ပြပါတယ်။ Layer ကို reorder, rename, hide, lock, group, expand/collapse လုပ်နိုင်ပါတယ်။ Source: [Kittl Use layers](https://help.kittl.com/editing-and-design/using-layers)

## Text system comparison

Kittl Text editing မှာ Text box တစ်ခုလုံးကို edit လုပ်နိုင်သလို Double-click ဝင်ပြီး character/word တစ်ခုချင်း highlight လုပ်ကာ သီးခြား style ပြင်နိုင်ပါတယ်။ Supported controls တွေက font family, font weight, font size, letter spacing, line height, left/center/right/justified alignment, uppercase, and ligatures ဖြစ်ပါတယ်။ Source: [Kittl Edit and style text](https://help.kittl.com/editing-and-design/text-settings-editing)

MH Fashion မှာ အခု Font family, Font size, color, bold, italic, underline, alignment, letter spacing, line height, opacity, fill နဲ့ direct Text tool typing ရှိနေပြီ။ ဒီအပိုင်းက Kittl basic text-box workflow နဲ့ ကိုက်ညီပါတယ်။

မကိုက်သေးတဲ့ အချက်တွေက—

- Character-level formatting မရှိသေးပါ။ လက်ရှိ style က layer တစ်ခုလုံးကိုပဲ သက်ရောက်ပါတယ်။
- Text box width/height နဲ့ multiline wrapping model မရှိသေးပါ။ လက်ရှိ text က point-based text ဖြစ်ပြီး Kittl လို drawn text box မဟုတ်သေးပါ။
- Font search, recent fonts, variable font weight, uppercase, ligatures, glyphs panel မရှိသေးပါ။
- Kittl ရဲ့ font fallback, font loading, per-character style runs လို typography engine မရှိသေးပါ။

## Kittl text effects comparison

Kittl မှာ Text Transformation section သီးခြားရှိပြီး Custom, Distort, Circle, Angle, Arch, Rise, Wave, Flag ဆိုတဲ့ transformation styles ရှစ်မျိုးရှိပါတယ်။ Curve/intensity slider နဲ့ Canvas ပေါ် handles တွေက effect ကို live ပြင်နိုင်ပါတယ်။ Source: [Kittl Text transformation](https://help.kittl.com/editing-and-design/text-transformation)

Kittl Text Shadow က Drop, Line, Block, Detailed 3D Shadow ဆိုပြီး style လေးမျိုးရှိပြီး color, opacity, offset, angle, blur, outline width တွေကို panel ကနေပြင်နိုင်ပါတယ်။ Source: [Kittl Text shadow effects](https://help.kittl.com/editing-and-design/text-shadow-effects)

Kittl Text Decoration က Horizontal Lines, Color Cut, Oblique Lines, Fading Color Cut ဆိုတဲ့ decoration styles တွေကို weight, distance, color နဲ့ချိန်နိုင်ပါတယ်။ Shadow နဲ့ Transformation တွေနဲ့ stack လုပ်နိုင်ပါတယ်။ Source: [Kittl Text decoration effects](https://help.kittl.com/editing-and-design/text-decoration-effects)

MH Fashion ရဲ့ လက်ရှိ system မှာ အဲဒီ effects တွေအတွက် data fields, SVG renderer, Adjustment sections, preview state, undo snapshots မရှိသေးပါ။ ဒါကြောင့် Text effects ကိုထည့်မယ်ဆိုရင် UI တစ်ခုတည်းမဟုတ်ဘဲ layer model နဲ့ rendering pipeline ကိုပါ ချဲ့ရပါမယ်။

## Alignment and layout

Kittl ရဲ့ Alignment panel က element/group ကို artboard နဲ့ align လုပ်နိုင်သလို selected elements အချင်းချင်း align လုပ်နိုင်ပါတယ်။ Left, center, right, top, middle, bottom နဲ့ Tidy spacing ပါပါတယ်။ Tidy က element သုံးခုနှင့်အထက်ရွေးထားတဲ့အခါ spacing ကိုညီအောင် ပြုလုပ်ပါတယ်။ Source: [Kittl Alignment](https://help.kittl.com/editing-and-design/alignment)

MH Fashion မှာ text alignment က text inside alignment အနေနဲ့ရှိပေမယ့် selected layer ကို artboard နဲ့ align လုပ်တဲ့ action မရှိသေးပါ။ Layer အများကြီးအတွက် distribute/tidy logic လည်း မရှိသေးပါ။ ဒီ feature က current layer model ထဲမှာ ဆက်ထည့်လို့ရပေမယ့် geometry update helpers နဲ့ multi-selection rules လိုပါမယ်။ Architecture ကို မကျော်ပါ၊ implementation scope တိုးမယ့် feature ဖြစ်ပါတယ်။

## MH Fashion system နဲ့ တိုက်ရိုက်ကိုက်ညီတဲ့အပိုင်း

အောက်ပါ Kittl-style behaviors တွေက လက်ရှိ system အတွင်းမှာ ဆက်လုပ်နိုင်ပါတယ်။

1. Dynamic content-based selection bounds
2. Eight resize handles and aspect-ratio behavior
3. Rotate handle and per-layer/group rotation
4. Group-level transform versus child-level transform
5. Linked-layer transform behavior
6. Text tool click-to-type and post-typing return to Move tool
7. Text Adjustment sections and live style updates
8. Layers reorder, rename, hide, lock, group, ungroup
9. Foreground/background color-driven mask painting
10. Layer-to-canvas selection synchronization
11. Alignment to print canvas and selected-layer distribution
12. Kittl-like collapsible right-side Text/Adjustment sections

အထက်ပါအချက်တွေက လက်ရှိ `EditorArtworkLayer`, `EditorLayersPanel`, `EditorAdjustmentsPanel`, `EditorArtworkLayers`, and `KittlCanvas` architecture ကို ဆက်အသုံးပြုပြီး တည်ဆောက်နိုင်ပါတယ်။

## လက်ရှိ system ကို ချဲ့ရမယ့်အပိုင်း

အောက်ပါ features တွေက current architecture ကို မဖျက်ဘဲ model ကို ချဲ့ရမယ့်အပိုင်းတွေဖြစ်ပါတယ်။ အကောင်အထည်ဖော်နိုင်ပေမယ့် feature တစ်ခုချင်းစီအတွက် data model, renderer, UI, tests, and undo/redo handling လိုပါမယ်။

- Text box width/height, multiline wrapping, and drag-to-create text box
- Text transform presets such as arch, wave, circle, and flag
- Text shadow/outline/decoration effect objects
- Alignment and tidy/distribution helpers
- Glyph and uppercase/ligature controls
- Canvas hover-to-layer highlighting
- Flip horizontal/vertical
- Snap guides and smart alignment lines
- Context menu actions
- Per-layer effect previews in thumbnails

## လက်ရှိ system ကို ကျော်နိုင်တဲ့ အချက်များ — သင့်ဆုံးဖြတ်ချက်လိုသည်

ဒီအပိုင်းတွေကို implementation မစခင် သင့် approval လိုပါတယ်။ လက်ရှိ system ရဲ့ simple layer model ကို အခြေခံပြီး တိုက်ရိုက်လုပ်ရင် နောက်ပိုင်း compatibility နဲ့ data migration risk ရှိနိုင်ပါတယ်။

### 1. Character-level text engine

Kittl လို စာလုံးတစ်လုံးချင်း font, size, color, weight ပြောင်းချင်ရင် `text` object တစ်ခုထဲက scalar style fields မလုံလောက်ပါ။ Text ကို `runs[]` သို့မဟုတ် per-character ranges အဖြစ် model ပြောင်းရပါမယ်။ Existing text layers ကို migration လုပ်ရပါမယ်။

**ဆုံးဖြတ်ရန်:** Character-level formatting ကို အခုတစ်ခါတည်း ထည့်မလား၊ Text box-level styling နဲ့ပဲ ဆက်သွားမလား။

### 2. Full Kittl text transformations

Arch, Wave, Circle, Flag, Distort စတဲ့ transformations တွေက regular SVG `<text>` ထက်ပိုပြီး path/layout engine လိုပါတယ်။ Text ကို path အဖြစ် convert လုပ်ရင် live text editing နဲ့ undo behavior ရှုပ်ထွေးနိုင်ပါတယ်။

**ဆုံးဖြတ်ရန်:** ပထမ version မှာ Arch/Wave လောက်ပဲ MVP လုပ်မလား၊ Kittl ရဲ့ transformation styles အားလုံးကို တစ်ခါတည်း လုပ်မလား။

### 3. Shadow, decoration, and 3D effects

Kittl-style effects တွေက layer တစ်ခုရဲ့ `color` တစ်ခုထက်ပိုတဲ့ rendering stack ဖြစ်ပါတယ်။ Text fill, outline, shadow, decoration, transformation တို့ကို order တိတိကျကျနဲ့ render ရပါမယ်။ Thumbnail, export, mockup render တို့မှာလည်း မပျောက်ရပါမယ်။

**ဆုံးဖြတ်ရန်:** Text effects ကို MVP မှာ Shadow/Outline တစ်ခုချင်းစီနဲ့ စမလား၊ full effect stack ကို တစ်ခါတည်းလုပ်မလား။

### 4. Vector path editing and Shape Builder

Kittl editor မှာ Pen tool node/Bezier handle editing နဲ့ Shape Builder Unite, Subtract, Intersect, Exclude တို့ရှိပါတယ်။ MH Fashion ရဲ့ current shape model က SVG path strings ကိုသိမ်းထားတာဖြစ်ပြီး node graph မဟုတ်ပါ။

**ဆုံးဖြတ်ရန်:** Shape/Vector editing ကို လက်ရှိ project scope ထဲ ထည့်မလား။ ထည့်မယ်ဆိုရင် shape path model ပြောင်းရပါမယ်။

### 5. Artboard hierarchy and infinite canvas

Kittl layers ထဲမှာ artboard အောက်မှာ element layers nested ဖြစ်ပြီး export scope က artboard membership နဲ့ ဆက်စပ်ပါတယ်။ MH Fashion က လက်ရှိ print canvas + mockup workspace model ကို သုံးနေပါတယ်။ Artboard တစ်ခုထက်ပိုပြီး infinite canvas လုပ်မယ်ဆိုရင် workspace, export, layer nesting, mockup ownership တစ်ခုလုံးကို ချဲ့ရပါမယ်။

**ဆုံးဖြတ်ရန်:** MH Fashion ကို single print canvas + mockups အဖြစ် ဆက်ထားမလား၊ multi-artboard/infinite canvas editor အဖြစ် တိုးချဲ့မလား။

### 6. Real-time collaboration and version history

Kittl editor ecosystem မှာ collaboration, autosave, version history စတဲ့ project-level systems တွေပါပါတယ်။ ဒါတွေက Canvas UI feature မဟုတ်ဘဲ persistence, conflict resolution, permissions, and backend state လိုတဲ့ architecture ဖြစ်ပါတယ်။

**ဆုံးဖြတ်ရန်:** ဒီ project scope ထဲ real-time collaboration/version history ပါမလား။

## အကြံပြုထားတဲ့ implementation order

သင့် approval မရခင် advanced items တွေကို မစပါ။ လက်ရှိ system နဲ့မကျော်ဘဲ အရင်လုပ်သင့်တဲ့ order က—

1. Canvas hover ↔ Layers hover highlight
2. Artboard alignment and Tidy spacing
3. Flip horizontal/vertical
4. Text box width/height and click-drag creation
5. Font search, recent fonts, and font weight options
6. Text shadow/outline MVP
7. Arch/Wave text transformation MVP
8. Character-level text runs
9. Full text effects stack, glyphs/ligatures, and vector editing only after separate approval

## Sources

- [Kittl Canvas essentials](https://help.kittl.com/editing-and-design/basic-handling)
- [Kittl Add text](https://help.kittl.com/editing-and-design/adding-text)
- [Kittl Edit and style text](https://help.kittl.com/editing-and-design/text-settings-editing)
- [Kittl Use layers](https://help.kittl.com/editing-and-design/using-layers)
- [Kittl Alignment](https://help.kittl.com/editing-and-design/alignment)
- [Kittl Text transformation](https://help.kittl.com/editing-and-design/text-transformation)
- [Kittl Text shadow effects](https://help.kittl.com/editing-and-design/text-shadow-effects)
- [Kittl Text decoration effects](https://help.kittl.com/editing-and-design/text-decoration-effects)
- [Kittl Glyphs panel](https://help.kittl.com/editing-and-design/glyphs-panel)
- [Kittl Editor overview](https://www.kittl.com/features/editor)
