# Tablet Confirmation Bubble local positioning — 2026-10-13

Implemented on the existing uncommitted Phase 1/drawing/keypad work, committed baseline `21316532461923269c6c3d6f283185b8e1a8ebec`. Browser verification only; Lenovo and Xiaomi physical acceptance remain pending. No Git or PWA/cache publication.

## Confirmed causes

The previous `positionPenConnectionBubble()` transformed the model candidate correctly through `getScreenCTM()` and the Bubble is a body-mounted fixed element. No model/CSS coordinate mix-up or stale candidate was demonstrated in the reproduced drawing cases.

Two actual placement defects were reproduced before editing:

- The clamp used the whole visible viewport, including the toolbar, instead of the usable canvas. A near-top Thin first point produced Bubble top **65.859 CSS px** while the canvas began at **127 px**, overlapping the tablet toolbar at 44–92 px.
- Collision scoring considered overlap alone and included unrelated global corner candidates. With nearby overlays obstructing local candidates, an operation anchor at **(897.833, 399.833)** produced Bubble top-left **(210.047, 8)**. This controlled collision fixture proves the mechanism; it is not a reconstruction of the user's exact Lenovo screenshot/model, which was not provided.

Rotation also stored the Pivot as its frozen Move placement point. That transaction point remains unchanged; presentation now uses the active rendered Rotation Handle, avoiding a distant Pivot anchor.

Before-change source/output is preserved under ignored `.test-tools/bubble-local-20261013/`. Physical visualViewport offsets, browser settings and the exact affected Lenovo operation remain unknown.

## Anchor and coordinate handling

`penBubbleClientAnchor()` supplies client CSS-pixel coordinates. Drawing first/endpoints and snap, Thin's resolved reference-constrained endpoint, Dashed, Move destination/base/automatic Pivot Snap, proposed Pivot, Support, Force, connection and Person confirmations use their existing locked geometric candidate transformed by the live SVG screen CTM. Raw pen coordinates do not replace a frozen candidate. For Rotation, the visible Handle circle center supplies the anchor; before the rendered Handle is available, the rotated operation Handle is transformed through the same CTM.

No solver, positive NL interpretation, scale, reference offset/perpendicular convention, transaction state, pointer capture, numeric lock, history or confirm/cancel handler changes. The lock halo keeps its existing model anchor.

## Shared algorithm

`localPenBubblePosition()` takes a client anchor, measured DOM size, visible viewport, canvas rectangle, obstacle rectangles and previous placement. The visible viewport includes visualViewport width/height and offsets. Usable bounds are the intersection of canvas and viewport, inset 8 CSS px. If that intersection cannot contain the Bubble, the algorithm uses visible viewport space; extremely small viewports cannot guarantee full containment of a fixed-size control.

It evaluates upper/right, lower/right, upper/left, lower/left, above, below and side-centered positions at 20, 44, 76 and 108 CSS-pixel gaps. The ordinary preferred gap is 20 px. Candidates are clamped before scoring. No global toolbar/corner fallback is generated.

Candidate distance is the shortest anchor-to-Bubble-rectangle distance. Candidates beyond the closest feasible distance plus 120 px are excluded. When a local candidate can fully clear critical controls and the anchor target, only clear candidates are eligible. Otherwise the least obstructive local candidate remains eligible rather than seeking a distant screen corner.

Score: weighted obstacle overlap divided by Bubble area × 120, plus distance × 0.5, plus 8 for a different placement direction and 40 for a different preferred gap. High-priority controls have weight 4; radial sectors and Rotation's existing normal menu clearance have weight 1. These penalties select among nearby visible candidates, not engineering geometry.

Support/Force first-anchor confirmations prefer lower/right at 76 px (roughly 107 px diagonal distance). Their existing angle editor is seeded from the Bubble button contact; smaller/above placement could put that editor on the upward or rightward direction ray. The wider local preference preserves the existing Force solver/contact tests without moving or redesigning its editor.

## Obstacles and fallback

Visible top/bottom toolbar controls, Dynamic Input, shared keypad, command controls, Pivot, Rotation Handle, endpoint circles, Move anchor and relevant grip targets are obstacles. The anchor reserves a small 24px interaction rectangle. Hidden overlays are excluded through DOM bounds and ancestor visibility checks.

Radial menu roots cover the entire viewport, so they are not forbidden rectangles. Only visible hit sectors/hub controls are obstacles. Rotation additionally retains its established normal menu-envelope preference where a local position can satisfy it. Ordinary SVG lines, whole drawings and whole radial SVG containers are never forbidden geometry.

If every local candidate collides, the score chooses a nearby visible fallback. Crowded canvas, an offscreen operation, a tiny visible viewport or large overlays may make complete clearance or the 80–120px usability target impossible. The algorithm never intentionally sends a right-side operation to an unrelated top-left toolbar location.

## Stability and updates

Previous position, anchor, direction and gap are stored in a WeakMap keyed by the existing placement object; no metadata is added to saved drawings. After a transform, the previous placement is translated by the client-anchor delta and reconsidered. A valid, clear previous position within a 10-point score hysteresis budget is retained. Pointer motion and identical redraws do not move a frozen confirmation.

Tablet rendering positions the Bubble after operation handles are rendered. Resize, scroll, visualViewport events, relevant overlay visibility/style/class changes and SVG viewBox/size changes schedule one animation-frame recheck. Positioning does not render or change command state. Left/top writes occur only for changes greater than 0.25 CSS px; observers exclude the Bubble's own style changes, preventing feedback loops. Existing cancellation rules on zoom, orientation, Pan or blur remain authoritative: only operations that survive those rules are repositioned.

Fine-pointer PC presentation retains the old position function and invocation behavior. No tablet-only Bubble behavior is added to ordinary PC mouse/keyboard workflows.

## Exact task files and validation scope

- `assets/app.js`: presentation helper, anchor adapter, obstacle gathering, hysteresis and tablet-only update scheduling; existing transaction functions unchanged.
- `tests/tablet-bubble-position.cjs`: new measured DOM tests in portrait/landscape, native touch/CDP pen, 148 context/location cases, frozen redraw stability, real drawing endpoints and Rotation, transaction anchor fixtures, camera/page-scale/orientation updates, radial obstacles and explicit viewport-offset/crowded fallback checks. Edge anchors covered by existing controls are placement fixtures, not fabricated claims of successful canvas contact through controls.
- `tests/pen-connection-placement.cjs`: camera/zoom presentation assertions now require local visible placement with unchanged dimensions. Exact fixed rectangle assertions remain for frozen pointer motion; geometry/history/precision checks remain unchanged.
- `tests/pen-support-placement.cjs`: the camera-change assertion now checks transformed local visible placement; solver, frozen numeric/reference state, pointer stability and geometry/history assertions remain unchanged.
- This documentation. Append-only project-memory records are separate.

The two older tests intentionally required absolute screen coordinates to remain unchanged after camera moves. That presentation requirement conflicts with the current explicit camera-aware instruction; its replacement checks actual anchor distance, drawing-area bounds and unchanged control dimensions. No engineering tolerances were loosened and no transaction assertions were removed.

Final suite counts, hashes, commands and earlier failures are recorded in `project-memory/codex-sessions/2026-10-13-tablet-bubble-local-position.md`. Screenshots of the corrected right/top canvas operation in both orientations were reviewed. Prior baseline failures and offline/HTTP limitations remain outside this presentation repair.

## Physical acceptance gate

On Lenovo and Xiaomi, verify local Bubble placement for first/snapped/endpoints near every edge, reference-constrained Thin, Move/Base/Pivot and Rotation Handle with distant/custom Pivot. Check open radial menus and Dynamic Input/keypad, browser zoom/scroll/orientation, frozen-pointer stability, no toolbar fallback and rapid ✓/× pen use. Confirm unchanged Support/Force, exactly-once creation, Undo/Redo and JSON workflow.

Verify Thin still opens the keypad automatically, ✓ locks NL, the same key becomes disabled/enabled ✓✓ according to valid direction, ✓✓ commits without another Bubble, fresh chaining restores ✓, caret remains editable without unexpected Android keyboard and × exits without deleting completed geometry. Stop for user-reported physical acceptance before Git publication.
