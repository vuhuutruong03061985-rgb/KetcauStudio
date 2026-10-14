# Post-drawing Thin offset Mini Toolbar — 2026-10-13

Status: implemented on the current uncommitted workspace. The user reports Xiaomi Pad 6 Pro acceptance of the prior integrated drawing/editing workflow. The subsequent hybrid ownership fix and icon-only refinement require their own verification; latest integrated Mini Toolbar acceptance on Lenovo is not independently confirmed. No stage, commit, push, Service Worker or PWA cache changes.

## Drawing and post-drawing ownership

Reference detection, multiple-candidate resolution, directional disambiguation, explicit overrides, locking and highlights are unchanged. The reference-constrained drawing adapter now uses **zero drawing offset**: the start is exactly the confirmed anchor, the normal remains perpendicular to the chosen Bar, cursor intent chooses the normal side, positive NL controls length through the existing internalForceScale. The existing pure section-offset utility remains available unchanged; drawing no longer requests its visual displacement.

The accepted tablet sequence remains first-point Bubble confirmation → automatic shared keypad → ✓ locks NL → same-button ✓✓ commits one valid segment without another Bubble press → fresh chained NL input. Command × exits. Missing/invalid/ambiguous reference fallback keeps the existing free-drawing behavior, without offset metadata or automatic inference. No new controls appear during drawing and no unrelated chaining issue was changed.

In Selection mode, selecting exactly one eligible completed Thin Line shows:

`[ ◀ ] [ 0 ] [ ▶ ]`

The middle button displays `-3 … 0 … +3`; it resets to zero. The left chevron decreases the level toward reference endpoint A; the right chevron increases it toward B. These are logical reference directions, not fixed horizontal-screen movement. Visible Lùi/Tiến words are removed; Vietnamese accessible names remain. Levels clamp at ±3; limit buttons disable. Each effective click adds one checkpoint; a limit action or zero reset adds none. Controls remain available after an adjustment and disappear on deselection, multi-selection, another tool, active drawing/numeric/inline editing, Pan/gesture or Move/Pivot/Rotation transaction. No dialog or additional Bubble is created.

The three buttons have at least 44×44 CSS-pixel targets on both PC and tablet. Native click is the sole action path; pointer events prevent canvas acquisition and unnecessary focus changes. A narrow exemption in the existing radial outside-click handlers closes open menus and lets the same toolbar tap perform exactly one adjustment, like the existing top/bottom toolbar controls.

## Stable geometry and JSON v1 extension

For reference A→B, `t = (B-A)/|B-A|`. At commit, `step = 3 / |CTM × t|` stores approximately 3 CSS px as a **model-space scalar**, using the tangent's transformed screen length (also valid for inclined/nonuniform transforms). It is never recalculated on zoom, pan, resize, orientation or load.

Each target level k is computed from canonical coordinates:

`(x,y,x2,y2) = canonical endpoints + k × step × t`

Both endpoints receive the same vector. Negative levels move toward A and positive levels toward B, regardless of endpoint order or screen slope. Perpendicularity, length, labels, Pivot-local data and NL magnitude are preserved. Returning to zero restores the original endpoint numbers exactly; intermediate values are never accumulated, preventing repeated-tap drift.

An adjustment that would exceed the existing ±10000 model-coordinate document bounds is refused without a history entry.

Newly committed reference-constrained Thin Lines optionally store:

```json
"thinOffset": {
  "barId": "REFERENCE_ID",
  "reference": {"x": 200, "y": 300, "x2": 600, "y2": 300},
  "base": {"x": 300, "y": 300, "x2": 300, "y2": 350},
  "level": 0,
  "step": 2.5
}
```

The numbers above illustrate the schema; step is measured at the actual commit. `base.x/y` is the original confirmed reference anchor, so no duplicate anchor field is needed. The reference identity and endpoint snapshot avoid resolving an attachment again by proximity. The object and drawing format remain JSON v1; no legacy line gains metadata or changes geometry when loading. Current validation checks finite bounded reference/canonical geometry, positive finite step, valid level and perpendicular canonical geometry. Reference existence is an eligibility check, not a load requirement: orphaned metadata loads safely with its existing coordinates and no unusable controls.

Older readers may retain/ignore unknown metadata and cannot provide this editing feature. Cross-version readers that rewrite unknown fields are not validated in this task; use the updated application for offset editing.

## Safe compatibility rule

Controls are available only if the Bar with the stored ID still has exactly the snapshotted endpoints, and current Thin endpoints exactly equal the canonical geometry at the stored level. No replacement Bar is selected automatically.

After a Move, endpoint edit, Rotation R1/R2, copy/paste displacement, mirror or reference-Bar geometry change, stale metadata is retained but **offset editing is disabled** if those checks fail. Offset clicks cannot restore an obsolete base or undo a user's transform, including a 1e-10 model-unit endpoint edit. The transformation engines are not rewritten and the feature does not force perpendicularity after an unrelated transform. Moving the reference and Thin together also disables the old attachment under this conservative rule.

Pivot-only changes preserve endpoint geometry and remain eligible. Offset translation carries an existing local Pivot with the Thin Line through the established Pivot representation. Undo/Redo snapshots include metadata and coordinates together; Undo can restore eligibility after a later transform. Existing Undo selection clearing remains unchanged, so users may need to reselect the object.

New offset metadata is optional, not a structural/mechanical association for analysis or automatic recalculation. Scale-setting behavior is unchanged; offset editing preserves the segment's length and its magnitude under the current scale.

## Local presentation

The toolbar anchors beside the selected Thin midpoint in client CSS pixels. It reuses the Bubble repair's measured viewport/canvas placement helper and visible control/radial obstacles with independent position memory. Its own rectangle is excluded from its obstacles; the Bubble can consider the toolbar when visible. The Bubble algorithm and confirm/cancel handlers are unchanged.

Rendering and coalesced viewport/camera/overlay changes reposition the toolbar without changing committed coordinates. Relevant handles, toolbar edges, keypads and open radial sectors participate in collision scoring; ordinary drawing lines are not forbidden regions. Crowded or tiny views may require a nearby overlapping fallback. No layout redesign or new numeric field is introduced.

## Exact task files and evidence

- `assets/app.js`: zero-offset drawing adapter; optional canonical/reference metadata, validation and bounded history-backed level edits; render hook and self-exclusion parameter for shared obstacle collection.
- `assets/tablet.js`: Mini Toolbar presentation/native click ownership, transaction guards, position scheduling and its narrow radial-toolbar exemption. Existing numeric keypad flow remains unchanged.
- `assets/app.css`: compact local panel and ≥44px buttons.
- `tests/thin-offset-mini-toolbar.cjs`: 18 orientation/input combinations across mouse, touch and CDP pen, ±3 levels, exact reset/no drift, step measurement, history/JSON/viewport changes, native selection/taps, stale reference/geometry, groups/open menus and actual Move/Pivot/R1 preview/numeric R2 interaction.
- `tests/thin-perpendicular-runtime.cjs`: approved centered drawing expectations instead of automatic offsets; original magnitude/reference/fallback/history/persistence assertions and precision tolerances retained.
- `tests/thin-dynamic-input.cjs`: the snapped reference case now expects its exact confirmed start rather than a 3px drawing displacement; original tolerance and lifecycle assertions retained.
- This document. Append-only project-memory records are separate.

Final suite counts, actual commands, source hashes, interim failures and baseline limitations: `project-memory/codex-sessions/2026-10-13-thin-offset-mini-toolbar.md`. Screenshot review shows the local three-button panel beside the selected Thin Line. Tests are browser emulation, not physical Android acceptance.

## Physical acceptance

The user reports prior integrated Xiaomi drawing/editing acceptance; the later hybrid ownership/icon-only refinement has not received a separate physical report. Latest integrated Lenovo Mini Toolbar acceptance remains unconfirmed.

For physical follow-up: draw and commit reference-constrained Thin using the unchanged reference selector and keypad, verify exact anchor/perpendicular side, exit and select the line. Check repeated pen/touch ◀/▶/reset, seven levels, endpoints A/B on horizontal/vertical/inclined/reverse Bars, one history step per effective tap, no native keyboard and no drawing controls leaking into this toolbar. Check hybrid pen hover → genuine mouse → pen, local portrait/landscape placement, open radial menus, pan/zoom/save/load, legacy lines without controls, deleted reference, and Move/Pivot/Rotation without stale geometry restoration. Stop for user review before Git publication.
