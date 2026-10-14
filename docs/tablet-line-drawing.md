# Tablet Thin/Dashed drawing repair — 2026-10-13

Status: implemented; the user reports Xiaomi Pad 6 Pro acceptance of the prior integrated tablet drawing/editing workflow. Subsequent hybrid ownership/icon-only changes are separately verified and are not covered automatically by that earlier acceptance. No Git publication is authorized.

## Hybrid ownership correction — 2026-10-13

The former adapter marked tabletLineCommand during pen hover, then swallowed every mouse event. The focused ownership regression reproduced this on the affected workspace before the fix. Ownership now starts only after a valid pen/touch pointerdown has acquired a finite nonzero candidate. A pending Bubble or active Bubble contact still consumes canvas input until proper confirmation/cancellation.

Without a pending confirmation, genuine mouse PointerEvents follow the existing mouse drawing path; primary mouse contact retires the tablet command presentation flag without resetting the shared anchor, locked magnitude, reference or geometry. Only explicitly touch-generated mouse events are suppressed. Compatibility mousedown/up/click events are not PointerEvents and cannot enter the canvas pointerdown commit path. No timers, global pointer resets or capture changes were added. Existing candidate cleanup, segment cancel, pointercancel and mode exit remain authoritative.

`tests/line-pointer-ownership.cjs` covers native CDP pen hover → mouse → pen, mouse-started and pen-started chains, pending confirmation protection, Bubble cancel/confirm, emulated pen pointercancel, command cancel/exit/re-entry, native touch contacts, PC mouse-only behavior and exact single history checkpoints. Geometry/keypad/Bubble solvers remain shared and unchanged. Physical acceptance of this follow-up is not inferred from prior Xiaomi testing.

## Confirmed causes and scope

Before this repair, `handleTabletBarPlacement()` admitted only Bar. Thin/Dashed touch and pen reached the legacy canvas pointerdown path: first contact accepted the start immediately and endpoint contact committed immediately. Thin's keyboard Enter path could also commit a locked magnitude. The editor followed pointer coordinates, including positions above the canvas inside the toolbar area.

The saved task-entry application (accepted Git baseline `21316532461923269c6c3d6f283185b8e1a8ebec` plus uncommitted Thin/Dashed Phase 1) was compared in fresh Edge touch contexts. Before endpoint contact: zero model items with a visible preview. After endpoint contact: one item in the entry application, zero items and a confirming Bubble after repair. A near-top sample had editor top 71.859 versus canvas top 127 before repair; repaired editor top 135. The same model magnitudes were retained (including 1332.817), so moving the editor does not rescale NL.

The exact Xiaomi screenshot/model was not supplied to this repair session. Its `3559.161` value and specific long lines cannot be classified individually. The reproduced large readouts are NL magnitude (`model distance * internalForceScale`), not Bar length. No coordinate-transform or duplicate-event fault was demonstrated. Ordinary live preview can still be long when the cursor is far away; it does not enter the model until Bubble confirmation. Candidates outside the existing ±10000 model coordinate limit are refused. There is no arbitrary new engineering-length limit.

Whole-PC chrome leakage was not reproduced: the existing radial presentation was already active in the control. This repair hides the duplicate rectangular command controls only when the existing radial proxies are available, preserves the legitimate tablet top toolbar, and keeps fallback command controls otherwise.

## Ownership and geometry

- Coarse-capability touch/pen Thin/Dashed contacts acquire through existing `drawingPoint()`/Snap and freeze a point; movement, pointerup, compatibility mouse events and canvas Enter cannot commit it.
- Bubble ✓ accepts the first point, or commits exactly one endpoint segment. Ownership is retired before model/history changes. Bubble × rejects only the point, preserving the accepted start and earlier segments.
- Tablet command × / Escape cancels the current segment, clears its point/reference/numeric session and retains the drawing tool. Tablet command ✓ ends the tool without creating geometry. Previous confirmed segments are preserved.
- Thin freezes both the resolved start and endpoint from the existing reference-Bar or positive-NL solver. Bubble confirmation consumes those frozen coordinates without recalculating from the Bubble's screen position. `internalForceScale` changes invalidate an endpoint candidate. No Bar Length/Angle solver or mechanical formula is copied or changed.
- Thin NL accepts finite positive magnitude only. Cursor/pen determines direction and reference side. Numeric ✓ locks magnitude only. Editing a draft invalidates a pending point. Dashed has no NL editor.
- Existing four-row numeric keypad supplies caret-aware editing with `inputmode=none`. The tablet editor stays below the canvas top, reserves radial space and avoids Bubble/keypad; focus does not follow the drawing cursor. Resize, scroll, blur, camera/pan/pinch and matching pointercancel retire pending points.
- Mouse-started sessions retain PC pointer/Enter/Escape behavior. A touch/pen-started command retains tablet ownership until the tool is activated again; switching to mouse midway requires tool reactivation. Post-creation Phase 1 transformations remain separate.

## Exact repair files

Application: `assets/app.js`, `assets/tablet.js`, `assets/app.css`.

Existing test fixtures (explicit tablet confirmation added; model/history/precision assertions retained):

- `tests/bar-zero-motion-commit.cjs` (Thin subcase only)
- `tests/dynamic-input-compact.cjs` (Thin subcase only)
- `tests/thin-dynamic-input.cjs`
- `tests/thin-endpoint-commit.cjs`
- `tests/thin-endpoint-preview.cjs`
- `tests/thin-keyboard.cjs`
- `tests/thin-live-input.cjs` (tablet anchor stability; PC cursor tracking retained)
- `tests/thin-perpendicular-runtime.cjs`
- `tests/thin-reference-highlight.cjs`
- `tests/thin-reference-marker.cjs`
- `tests/thin-reference-override.cjs`
- `tests/thin-reference-session.cjs`

New tests: `tests/tablet-line-placement.cjs`, `tests/tablet-point-test-actions.cjs`. Documentation: this file. Total: 18 repair application/test/documentation files. Append-only project-memory records are separate.

`assets/app.js` and `assets/tablet.js` contain mixed Phase 1 and repair hunks. Phase 1-only `assets/move.js`, `tests/bar-pivot-foundation.cjs`, `tests/pan-move-ownership.cjs`, `tests/line-transform-data.cjs`, `tests/line-transform-parity.cjs` and `docs/object-transform-capabilities.md` are preserved. No staging, commit, push, Service Worker or PWA cache changes.

## Validation and physical gate

Focused test: native browser touch and CDP pen × Thin/Dashed (four cases), first/endpoint Bubble accept/reject, frozen preview/model separation, invalid/positive NL, both reference sides, exactly-once commit, chaining/history, native radial cancellation/finish, pointercancel, oversized candidate rejection, caret replacement, four-row keypad, toolbar separation, 44px Bubble targets, zoom/orientation and keyboard suppression attributes.

Regression results and exact commands are recorded in `project-memory/codex-sessions/2026-10-13-tablet-line-drawing-repair.md`; ignored audit artifacts preserve output and source hashes. Tests use Edge browser emulation; they do not establish physical Android keyboard, Smart Pen palm rejection or PWA/offline acceptance.

Physical Xiaomi acceptance: check Thin/Dashed first point and endpoint freeze with Smart Pen movement, Bubble ×/✓, numeric ✓ without geometry, NL ±side via cursor with positive value, reference-Bar alignment, caret editing without Android keyboard, portrait/landscape, pan/zoom, radial cancel/end, chain/Undo/Redo and post-creation Move/Pivot/R1/R2. Stop before Git publication until user acceptance and review.

## Thin keypad parity update — 2026-10-13

The latest explicit user instruction supersedes the earlier Bubble-only endpoint completion rule for the numeric keypad path. After first-point Bubble confirmation, Thin automatically opens the existing numeric keypad. The bottom-right key validates/locks NL as ✓, then immediately displays ✓✓ in that same DOM button. A separate `keypadCommitState` predicate controls the label; `canFinishLockedThin()` controls geometry authorization. Locked NL without a valid drawing direction displays disabled ✓✓. Editing returns the key to ✓; numeric ✓ never creates geometry.

Canvas/reference intent retains the last valid direction/side in the Thin session, independently of keypad pointer coordinates. Enabled ✓✓ resolves the endpoint through the unchanged Thin magnitude/reference solvers and calls the shared `commitThinCandidate()` with resolved start/end. A pending frozen endpoint may be consumed directly by ✓✓; no additional Bubble press is required. One commit starts a fresh LIVE NL session, keeps the keypad visible and restores ✓. Magnitude alone cannot provide direction, including for the next chained segment. Coordinates must satisfy the existing finite/±10000 guard.

The four numeric rows retain their accepted order and geometry; the existing Bar command-exit × row is reused. Keypad × ends the Thin command without adding geometry or deleting prior segments. Existing radial ×/Escape segment-cancel and radial command-end behavior remain available. Bar's `canFinishLockedBar()`, field state and `finishActiveCommand()` paths are unchanged; other numeric tools retain their default ✓ behavior. No extra completion button or floating control was added.

This follow-up changes only `assets/tablet.js`, `tests/tablet-line-placement.cjs` (automatic visibility and four numeric rows excluding the established exit row), new `tests/thin-keypad-transitions.cjs`, and this documentation, plus append-only memory records. The earlier repair/Phase 1 work is preserved. The explicit transition suite covers native touch/CDP pen, same-button identity/location, lock-before-direction disabled state, keypad pointer isolation, valid/free/reference directions on both sides, editing/invalid draft transitions, exactly-once history, fresh chained input, command exit, Undo/Redo and frozen-point consumption. Physical Xiaomi acceptance remains pending; no stage/commit/push.
