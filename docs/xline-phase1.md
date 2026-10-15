# XLine — Đường gióng (XL), Phase 1

XLine is a construction object, independent of Bar, Thin, Dashed and linkBar. Its geometry is the infinite line through two finite, distinct defining points; those points are not selectable endpoints.

## Creation and cancellation

Choose **Đường gióng (XL)** from the existing drawing toolbar or the left radial geometry category. On tablet, pen/touch selects a snapped P1, the existing local Bubble confirms it, then selects P2 and uses that Bubble's ✓ to create one object and one history checkpoint. P2 × rejects only P2 and retains P1. P1 × returns to the first-point stage. Identical points are rejected without losing P1. Frozen candidates do not follow later pointer movement. Each completed line starts a fresh first-point stage; there is no endpoint chaining, third Bubble, angle/length editor, Numeric Keypad or ✓✓.

PC mouse uses the established two-click convention, with Escape/right-click for command exit. Both platforms share geometry and data. Exiting keeps committed objects. An owned canvas interruption cancels only that pending candidate; unrelated cancellation does not erase confirmed P1. XLine touch Bubble contacts have matching-pointer capture/release and single activation on release inside the chosen button, because a canvas drag can suppress the browser's compatibility click. This adapter is scoped to XLine; other Bubble tools retain their existing handlers.

## Model, display and persistence

JSON document version remains 1. Each XLine has exactly `{id,type:"xline",x,y,x2,y2}`. Required coordinates are finite and within ±10000 model units; separation must exceed 1e-9 units. The existing 2000-object document limit applies. Label/support/Thin/Pivot metadata is not added. Old documents remain readable by the new application. Older application versions that do not know `xline` cannot read a new document containing it; this is an additive supported-type change, not a migration of old drawing data.

Rendering clips the infinite line against the actual visible model rectangle obtained from the canvas CTM and client bounds. Unit directions avoid oversized synthetic endpoints; clipping is recomputed on camera and canvas size changes. Guides use a neutral thin dashed stroke, no arrows, no mechanical symbols and no committed endpoint handles. A separate transparent screen-width stroke supports picking without thickening the visible line. Preview uses the same clipping/stroke but is not an object, snap target or history entry.

The icon-only **Hiện đường gióng XLine** toggle lives in the existing PC view tools and tablet right utility ring. Visibility is runtime UI state, outside JSON/history. Hidden guides have no canvas geometry, hit area or snap participation. Revealing them restores their original definitions. XLine selection supports existing Delete/Undo/Redo, but does not enable Bar endpoint editing, line-style conversion, Move, Pivot or Rotation. Selecting a guide leaves shared tool property defaults unchanged.

Clean SVG/PNG/Word rendering omits XLine and its previews. Guide geometry is also excluded from drawing fit/bounds measurement. JSON retains all committed guides, regardless of visibility. Real object export behavior is unchanged.

## Intersections and limits

XLine–XLine intersections use both infinite lines. XLine–Bar intersections require the unique intersection to lie on the actual finite Bar segment. Parallel/coincident/degenerate lines contribute no arbitrary point. The determinant tolerance uses normalized directions (1e-10), and finite-segment membership allows 1e-8 model-unit roundoff. Intersection candidates outside the existing model-coordinate bounds are ignored for acquisition.

Snap uses the existing intersection switch and a 12-CSS-pixel radius converted through the canvas CTM. Existing finite intersections retain their priority; an XLine intersection does not steal a nearby existing endpoint. The broad phase scans objects once and pairs only lines near the cursor, with deterministic ID order and nearest-distance selection. It does not create nodes or extend Bars. Extended Bar–Bar, curves/Hatch intersections, topology, trim/extend and dedicated H/V/angle/parallel/perpendicular modes are outside Phase 1.

## Validation

`tests/xline-phase1.cjs` covers geometry, clipping, invalid JSON, finite/infinite intersections, endpoint priority, local snap search, export/bounds, visibility/history, camera/orientation, 18 mouse/CDP-pen/CDP-touch creation cases, point retry/cancellation, candidate freezing, no numeric UI, continuation/dedup, selection/delete/history/JSON, unchanged property defaults and actual radial actions. Existing feature regressions are recorded in the task's audit and project session journal.

Automated browser emulation is not physical Xiaomi Pad 6 Pro or Lenovo acceptance. Physically check P1/P2 Bubble placement, contact interruption/retry, radial tool/toggle usability, snap when drawing Bars, hide/show, Zoom/Pan, save/load and clean export before finalizing or publishing this feature. No PWA/Service Worker, commit or push is part of Phase 1 implementation.
