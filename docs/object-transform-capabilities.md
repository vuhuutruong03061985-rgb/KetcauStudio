# Object transformation inventory and gated adapter plan

Baseline: 21316532461923269c6c3d6f283185b8e1a8ebec. Phase 1 extends only ordinary `thin` and `dashed` segments. Phases 2–4 are proposals, not implementations or physical acceptance.

## Phase 0 capability matrix

Inventory sources: assets/app.js `modes`, `make`, `render`, `validate`, `geometricPoints`, `objectPivot`, legacy drag, rigid helpers; assets/tablet.js `mirroredObjects`, selection/copy/section handlers; assets/move.js shared transaction. There are 21 drawable types; Select and Extend are commands, not objects. Every adapter must preserve id, labels/formulas/units, stroke/style, section relationships and unknown saved attributes. Translation T and rotation R below describe required model updates, not current unified eligibility.

| Type | Geometry and meaningful default Pivot | T / R adapter | Metadata and ownership / limitations |
| --- | --- | --- | --- |
| bar | World x/y/x2/y2; midpoint or local persistent Pivot | T both endpoints; R both around frozen Pivot | Geometry scale/labels unchanged; existing unified transaction and endpoint editor. Supported. |
| thin | Same endpoint segment; midpoint/local Pivot | Same T/R; preserve length | Numeric drawing uses transient thinNumericSession and document internalForceScale; never infer/recompute values from transformed orientation. Phase 1. |
| dashed | Same endpoint segment; midpoint/local Pivot | Same T/R | Preserve dashed type/style, values and attributes. Phase 1. |
| force | World insertion anchor; loadVector from direction/loadAngle; anchor Pivot | T anchor; R anchor and load vector through orientation adapter | Preserve magnitude/label/direction meaning; sectionVector overrides ordinary load rendering. Existing numerical placement; Phase 2 ambiguity gate. |
| moment | Insertion anchor; loadAngle rotates glyph; anchor Pivot | T anchor; R anchor and glyph orientation | Ordinary rotation preserves cw/ccw; sectionSign/vector special. Existing numeric placement. Phase 2. |
| udl | Span endpoints and independent loadVector; span midpoint Pivot | T endpoints; R endpoints and load vector together | Preserve intensity, label and distribution; do not derive load direction solely from rotated span. Phase 2. |
| support | Anchor, subtype and supportAngle/direction; anchor Pivot | T anchor; R anchor and orientation vector | Preserve pin/roller/fixed/plain subtype; clarify whether attached support follows connected member. Existing placement/anchor drag. Phase 2. |
| hinge | World anchor; anchor Pivot | T/R anchor; circular glyph has no visual orientation | Preserve connection interpretation; resolve attachment policy. Phase 2. |
| linkBar | Two world endpoints; midpoint proposed | T/R endpoints, validateConnection | Preserve endpoint validity/minimum length and properties; own endpoint/whole drag/cancel. Phase 2. |
| weld | World center; center Pivot | T/R center; current square glyph has no stored orientation | Decide visual orientation versus connection semantics; validateConnection. Phase 2. |
| curve | World origin plus two relative curvePoints (through/end); control-point bounds center proposed | T origin; R origin and relative vectors | Existing quadratic renderer/hit geometry; preserve control points and labels. Phase 3. |
| dim | Two world reference points, signed offset; reference midpoint proposed | T reference endpoints; R endpoints, retain physical offset side | Renderer auto-uprights text and normal; side flips need explicit adapter tests. Body drag edits offset, midpoint drag translates. Phase 3. |
| text | World anchor; anchor Pivot | T/R anchor; visual text orientation undecided | Current renderer has no text-rotation field. Preserve expressions/equations and layout. Explicit decision before adding orientation metadata. Phase 3. |
| positive | World anchor; center Pivot | T/R anchor; symmetric sign orientation may stay upright | No current orientation metadata; annotation semantics unchanged. Phase 3. |
| negative | World anchor; center Pivot | T/R anchor; decide upright versus rotated glyph | Preserve sign meaning; no implicit orientation schema. Phase 3. |
| diagramM | World anchor; center Pivot | T/R anchor; marker/text upright policy required | This is an M marker/label, not solved diagram geometry; units/formulas preserved. Phase 3. |
| diagramQ | World anchor; center Pivot | T/R anchor, same annotation policy | Preserve Q marker and numerical label. Phase 3. |
| diagramN | World anchor; center Pivot | T/R anchor, same annotation policy | Preserve N marker and numerical label. Phase 3. |
| hatch | Origin plus relative polygon points; bounds center proposed | T origin; R origin/points and hatch direction consistently | Preserve spacing, hatchAngle, linked boundary behavior; automaticHatchSegments. Phase 3. |
| rigidRegion | Origin + local spline points + rigidAngle; existing control-point centroid/temporary rigidPivot | Reuse translatedRigid/rotatedRigid; validateRigidRegion | Existing independent rigid action/point handles, snap/rollback/history must remain until a tested adapter bridges them. Phase 3; no replacement here. |
| person | World anchor, angle and size; insertion anchor proposed | T/R anchor plus existing visual angle | validatePerson and own placement/drag; preserve size. Included in inventory although not listed explicitly in request. Phase 3. |

Section-generated objects are ordinary types plus sectionGroup/sectionExtract/sectionMark/sectionAction, cut keys, point names, vectors/signs/visibility. Their selection expands groups, legacy group translation owns them, and extracted geometry is cloned from source. Existing Bar eligibility/metadata validation retains its no-sectionGroup rule for saved-data compatibility. Thin/Dashed additionally reject sectionExtract/sectionMark/sectionAction; normal grouped Bar exports remain excluded. Orphan legacy Bar section flags without a group are not reclassified by Phase 1. Phase 4 must define a closed dependent selection and transform vectors/anchors consistently; partial hidden action selections cannot imply permission to rotate independent generated fragments.

## Shared architecture and Phase 1

`transformableLine(o)` is the narrow capability predicate for standalone Bar/Thin/Dashed. Existing entry points retain their names for compatibility; `movableBars` delegates to this predicate. Existing objectPivot/barPivotFrame/barPivotLocal/validateBarPivot now accept those three types with unchanged optional `pivot:{along,normal}` in model units relative to midpoint/local axes. Old JSON v1 without Pivot remains valid; old Bar Pivot bytes/meaning remain unchanged. Mirror flips local normal for all eligible segments.

All three use the same smartMoveSession, immutable rotation original/Pivot, non-mutating preview, snap ranking/hysteresis, unit/lock Δθ editor, four-row Numeric-only Keypad, Bubble and PC confirmation, capture retirement, Pan exclusion and history checkpoint paths. No alternate manipulation engine, device fork or engineering formula is added. Explicit tablet Pivot edits use a metadata-only checkpoint; group Pivot remains transient with no document checkpoint, preserving accepted Bar semantics. Group translation can include supported segment mixtures; synchronous group rotation remains deferred.

Compatibility is old drawings loaded by the updated application, including all previously valid Bar Pivot records. The baseline application's Bar-only Pivot validator cannot read a newly saved Thin/Dashed record carrying Pivot metadata. Reopen those drawings with the updated shared build; no forward-compatibility claim for older cached applications is made.

Phase 1 does not recalculate internalForceScale, geometryScale, label/formula or stored numeric attributes. Rotation updates only endpoint coordinates; Move updates only endpoint coordinates; Pivot edit updates only optional Pivot metadata. Existing endpoint/drawing ownership remains. Current section-generated line paths remain legacy.

## Concrete Phases 2–4 adapter plan

After physical Phase 1 acceptance, introduce a small type adapter dispatch inside the existing transaction: `eligible(object,operation,selection)`, `defaultPivot(snapshot)`, `snapPoints(snapshot)`, `translated(snapshot,delta)`, `rotated(snapshot,pivot,svgAngle)`, `validate(next)`, and a render-preview callback using existing renderers. Return new objects from immutable snapshots; commit through the single existing document/history guard. Do not enable a type merely because it exposes x2/y2.

Phase 2: force/moment/support/UDL adapters transform explicit orientation vectors and convert back through existing conventions, preserving magnitude/intensity/classification and cw/ccw under proper rotation. Add per-type angle/sign/unit, connection-anchor and load-span tests. Clarify attached-member behavior and global-versus-member-relative load direction before enabling each ambiguous case. Connections use validateConnection on every preview and commit.

Phase 3: define annotation orientation policy explicitly before adding any new JSON property. Curves transform origin/relative vectors; hatch transforms polygon and pattern; dimensions test auto-upright offset side. Bridge rigidRegion through its existing pure helpers and validator, retaining its action/point handles until full cancellation/snap/export compatibility is established. Use actual SVG/PNG preview/export checks, not only coordinate assertions.

Phase 4: resolve the complete selected/dependent group before snapshotting; share one Pivot, transform every eligible object from the same frozen snapshot, validate all next objects, then commit atomically with one checkpoint. Preserve ids, group membership, relative geometry and section connection metadata. Reject unsupported/partial dependency selections with a clear reason. No group rotation implementation in Phase 1.

## Acceptance gate

Stop for Xiaomi Pad 6 Pro/Smart Pen physical checks of Thin and Dashed Pivot adjustment/snap, body Move/snap, freehand and signed numeric rotation, field/keypad/Bubble ownership, cancellation, Undo/Redo, JSON reopening, endpoint editing and unchanged numerical scale/labels. Automated mouse/touch/CDP pen evidence does not establish physical acceptance. No staging/commit/push, Service Worker/cache or Phases 2–4 work is authorized in this change set.
