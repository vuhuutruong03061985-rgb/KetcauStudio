# Existing UI Components

Implementation inventory reviewed on 2026-09-19. This document describes the current code, including exceptions; it does not prescribe redesigned behavior or replace [UI_DESIGN_RULES.md](UI_DESIGN_RULES.md).

## Runtime and ownership

The application uses deferred classic scripts, shared drawing state, DOM elements, SVG, and CSS. There is no UI framework or independent component lifecycle. Functions listed below are existing reuse points; many depend on shared globals and initialized DOM controls.

| Source | UI responsibility |
| --- | --- |
| [index.html](../index.html) | Header, sidebar, action/view toolbars, drawing SVG, status area, initial property controls. |
| [assets/app.css](../assets/app.css) | Layout, responsive rules, controls, icon states, dialogs and panel styling. |
| [assets/app.js](../assets/app.js) | Drawing modes, rendering, selection, labels, shared secondary options, load placement, core actions. |
| [assets/tablet.js](../assets/tablet.js) | Camera/touch, toolbar organization, icons, file UI, snapping options, supports, joints, sections, Mirror, symbol palette. |
| [assets/calculator.js](../assets/calculator.js) | Arithmetic/equation processing and SVG equation layout used by label editing. |

See [DEVELOPMENT.md](DEVELOPMENT.md) for runtime and testing context.

## Application shell and tool groups

- **Purpose:** organize drawing controls around the SVG workspace.
- **Sources:** `index.html`, `assets/app.css`, `assets/tablet.js`.
- **Elements:** `#toolPanel`, `#tools`, `#actions`, `#viewTools`, `.canvas-wrap`, `#drawing`, `#help`, `#status`.
- **State:** the sidebar toggle changes `body.tools-collapsed` and `aria-expanded`. Responsive CSS changes sidebar placement, tool columns, and canvas height. The view/action toolbars wrap controls.
- **Reuse points:** `.tool-group`, `.tool-buttons`, `.action-group`, `viewButton(id, label, handler)`.
- **Exceptions:** most controls are constructed or moved by JavaScript. Static HTML alone does not represent the final layout. The original interaction section is removed; the toolbar button with ID `resetView` currently means **Select**, not reset camera.

## Standard icon buttons

- **Purpose:** display compact toolbar commands and drawing tools.
- **Sources:** `toolIconPaths`, `decorateToolIcons()` in `assets/tablet.js`; `.icon-button` rules in `assets/app.css`.
- **State:** inactive icon buttons have a light gradient and raised shadow. `.active` or `aria-pressed="true"` gives a highlighted background, inset shadow, and 1px downward translation.
- **Reuse points:** `toolIconPaths`, `decorateToolIcons()`, `--tool-icon`, `.icon-button`, `data-mode`, `data-toolbar-icon`.
- **Details:** the common icon is a 24px CSS mask made from SVG with stroke width 1.6. Buttons have a minimum 44px target. Decoration supplies `title` and `aria-label`; shortcut names are appended where present in `drawingShortcutNames`. A child-list mutation observer decorates dynamically added controls.
- **Exceptions:** support buttons render SVG directly with their own class. The Section button assigns its mask directly. Ω is a text button and does not use the shared `.icon-button` styling. Buttons without a matching icon entry are skipped by the decorator.

## Tool modes, toggles, and commands

- **Purpose:** distinguish a current interaction mode from enabled settings and immediate actions.
- **Sources:** `assets/app.js`, `assets/tablet.js`.
- **Reuse points:** `setMode(m)`, `activateSelection()`, `render()`, `viewButton()`, core `actions`.
- **State:** `setMode()` resets pending drawing points, cancels load placement, clears multi-selection, and synchronizes `.active`/`aria-pressed` on `button[data-mode]`. `render()` also synchronizes selected controls such as Select, label editing, and Mirror.

| Control category | Existing state behavior |
| --- | --- |
| Drawing modes | Remain selected during their workflow; clicking the same ordinary drawing tool is not a universal off toggle. |
| Grid and snapping | Independent enabled settings, each with its own pressed state. |
| Pan | Explicit toggle; holding Alt+Ctrl also temporarily presents the active pan state. |
| Label editing | Persistent editing mode with a pressed toolbar button. |
| Section and Mirror | Have explicit click-again exit behavior. |
| Save, export, undo, redo | Execute commands without a persistent selected-tool state. |
| Copy/Paste | Enter point-picking modes, but their buttons do not use the same `data-mode` state mechanism. |

- **Exceptions:** pressed appearance can mean current mode, enabled setting, or remembered option depending on the control. These meanings are not represented by one shared state object. Global Escape returns to Select and cancels several pending operations, but it is not a universal closer for every floating `div`.

## Shared secondary tool panel

- **Purpose:** expose options for tools such as Hatch without expanding the main toolbar.
- **Sources:** `assets/app.js`; supporting CSS in `assets/app.css`.
- **Elements/state:** `#secondaryTools`, `toolOptionFields`, `toolDefaults`, `data-anchor-mode`, `hidden`, parent `aria-expanded`, option `.active` and `aria-pressed`.
- **Reuse points:** `chooseToolOptions()`, `secondaryIcon()`, `rememberToolOption()`, `positionSecondaryTools()`, `closeSecondaryTools()`, `autoHideSecondary()`.
- **Behavior:** selecting an option updates the source control and stores defaults in local storage. The panel stays open after an option click. Positioning anchors it near the tool and constrains it to the viewport; resize and relevant scroll events reposition it.
- **Dismissal:** shared auto-hide closes on outside pointer-down, window blur, or 250ms of pointer movement outside both panel and anchor. Touch pointer movement does not trigger hover dismissal. Returning to the panel/anchor cancels the timer. Escape has a separate close handler.
- **Exceptions:** closing the panel does not itself end the active drawing mode. Force, moment, and distributed-load tools bypass the shared option panel and use canvas placement. Support options remain in the field mapping, but the visible support UI uses separate buttons. The current Section workflow uses point selection and a naming dialog rather than this panel.

## Snapping toggle and option flyout

- **Purpose:** enable snapping and choose multiple snapping methods.
- **Sources:** `assets/tablet.js`, `assets/app.js`, `assets/app.css`.
- **Elements:** `#snapToggle`, `#snapSettings`, `.snap-choices`, `#snap-*` checkbox inputs.
- **Reuse points:** `updateSnapControls()`, `saveSnapSettings()`, `positionSnapChoices()`, `autoHideSecondary()`.
- **State:** the main button tracks `snapEnabled`; checkboxes track `snapOptions`. Choices are persisted. Panel visibility is separate from the enabled state and reflected by `aria-expanded`.
- **Behavior:** enabling snapping opens the panel; hovering the enabled button can reopen it. ArrowDown opens it and focuses an option. Multiple options can be changed without closing the panel. It uses shared auto-hide, closes on relevant scrolling, and closes the shared secondary panel when opened.
- **Exceptions:** it is implemented with a `details` element whose summary is hidden. It is mounted in the document body, not as an inline option row. Closing the flyout does not disable snapping. Grid visibility and snap preferences are separate, though grid snapping also requires the grid to be visible.

## Support/link symbol choices

- **Purpose:** choose engineering supports or change the type of a selected support.
- **Sources:** `assets/tablet.js`, `drawSupport()` in `assets/app.js`, `.support-choices`/`.support-symbol` in `assets/app.css`.
- **Reuse points:** `drawSupport()`, `syncSupportChoices()`.
- **State:** each `data-support-type` button is highlighted/pressed only while `mode === 'support'` and its value matches the support property control. Selecting one either edits the selected support in Select mode or activates support placement.
- **Exceptions:** the support type remains remembered internally after leaving Support mode, but its button is no longer highlighted/pressed. Editing a selected support in Select mode does not activate a drawing tool. These controls remain visible in the sidebar. They use larger direct-SVG symbols and their own raised/inset styling; they are not shared secondary-panel options.

## Canvas, camera, selection, and feedback

- **Desktop selection:** `selectedObjectIds()` reads the valid union of `selected` (optional primary ID) and `multiSelection` (ID Set). `updateSelection()` keeps the primary valid; Ctrl+mouse-left toggles the directly hit SVG `data-id`, makes an added object primary, and chooses the first remaining object in drawing order when removing the primary. Selection is transient and adds no Undo entries.
- **Click versus drag:** ordinary clicks select one object. On an already selected group member, mouse movement below 4 CSS pixels followed by release collapses to that member; movement reaching the threshold keeps the existing group translation. Touch group dragging retains its prior behavior. Empty-canvas full-containment marquee remains unchanged. Geometry handles appear only for a single effective selection.
- **Section exception:** normal section-group clicks still select/move the linked group; Alt retains individual selection. Ctrl+mouse-left runs before section capture and toggles only the hit drawable, without opening its label editor. Ctrl+Alt remains temporary pan.
- **Cancellation:** Escape and mouse right-click on the SVG share `cancelToSelection()`. It cancels the inline editor with `finish(false)`, rolls back pending geometry, clears unfinished section state/naming UI and returns to Select. A cancel-only tool-entry selection snapshot restores valid surviving IDs after rollback; ordinary mode changes retain their existing visible-selection policy. Pan/pinch tracking stops without reverting the camera. Right-button chording during left-drag is handled through Pointer Events too. Context menus outside the SVG and touch long-press are not redirected to this command. No touch multi-select mode is introduced.

- **Purpose:** draw, select, move, and inspect engineering objects without changing geometry merely to pan or zoom.
- **Sources:** `assets/app.js`, `assets/tablet.js`, `assets/app.css`.
- **Reuse points:** `el()`, `line()`, `txt()`, `render(clean)`, `rawPoint()`, `point()`, `drawingPoint()`, `applyCamera()`, `zoomAt()`, `captureDrawing()`, `restoreDrawing()`, `stopPointer()`, `drawJointHandles()`.
- **State:** drawing state and camera state are separate. Selection uses `selected` and `multiSelection`; marquee, group drag, joint drag, and touch gestures have separate pending state. Camera operations update the SVG viewBox. Touch snapshots support rollback when a second finger begins a pinch.
- **Feedback:** selection bounds, joint handles, snap hints, placement previews, `#help`, and `msg()`/`#status` guide operations.
- **Exceptions:** SVG content is rebuilt by rendering; transient hints are also added by pointer handlers. Clean export rendering omits normal editing decorations. A cut-section group has its own group-selection behavior; Alt permits individual selection.

## Section-group internal-force visibility

- **Purpose/location:** compact native N/Q/M checkboxes in `#viewTools` (`#sectionVisibility`), shown when effective selection represents at least one compatible extracted group. Each label has a 44px touch target.
- **Sources/reuse:** `assets/app.js` provides `sectionForceAction()`, `hiddenSectionAction()`, render/handle gating and validation. `assets/tablet.js` provides `selectedSectionGroups()`, `sectionActionState()`, `setSectionActionVisibility()`, `syncSectionVisibilityControls()` and creation preferences in `finishSection()`.
- **Scope:** one editable unit is an entire `sectionGroup`, not an individual cut point. Disabling N hides every N action across all cut points in the selected extraction; Q/M work identically. Selected group members resolve to unique groups only when those groups contain compatible force/moment actions. A partially selected group is still edited completely; unrelated selected objects are ignored.
- **Data/rendering:** each compatible action may store boolean `sectionVisible`; absence means visible. JSON remains v1. False skips the entire action SVG group, label, hit target and selection/move decoration, but retains the object, formulas, values and orientation. Hidden primary selection remains valid internally. Equations still receive all `items`. Copy/paste and mirror preserve flags. Clean SVG, PNG and Word's shared clean-render/crop path respect visibility.
- **UI state:** checked means all existing corresponding actions are visible, unchecked means all hidden, and `indeterminate` represents either intra-group or inter-group differences. Missing actions do not count as hidden; a checkbox is disabled if no selected group contains that action. Changes normalize existing matching actions only, never recreate deleted ones. Remaining extracted geometry allows selecting the group after all forces are hidden.
- **History/preferences:** one real checkbox mutation creates one checkpoint for all affected groups; no-op edits create none. A single unique group edit remembers definite component states in `ket-cau-studio-section-visibility-v1` as `{N,Q,M}` booleans; missing/mixed components retain their previous preference. Multi-group edits do not change preferences. Invalid/missing storage defaults all visible. New extraction creates every action and applies these preferences; copy/mirror do not use creation defaults. Preferences are not drawing history or JSON state.
- **Exceptions:** no `sectionCutId`, central group entity, independent cut-point controls or new touch selection mode. Physical Android validation remains pending.

## Drawing-only link bar and weld

- **Sources:** `assets/app.js` owns creation, rendering, hit testing, endpoint editing, validation and scoped drag rollback; `assets/tablet.js` integrates the existing toolbar/icons, color, touch, copy and mirror paths.
- **Toolbar:** `linkBar` and `weld` use existing tool-mode buttons in **Liên kết**. The weld icon uses a filled mask.
- **Link bar:** one object stores `x/y` and `x2/y2`. A 3.5-unit line connects two white circles with radius 6 and outline width 1.8. Two placements create one object without chaining. Dragging either endpoint holds the other fixed; body movement translates both equally. Lengths below 1 are rejected. Short selected links offset editing handles from geometry to keep both ends accessible.
- **Weld:** one `x/y` object renders a centered solid 12×12 square, entirely colored by its foreground, black by default. Movement snaps its center rather than the pointer offset.
- **Snapping:** shared `geometricPoints()`/`translationSnap()` logic exposes only A/B for linkBar and the center for weld. Neither adds body, midpoint, intersection or contact targets. Normal movement/editing excludes self targets; existing enabled snapping methods provide external targets.
- **Lifecycle/history:** completed edits use one Undo entry; unchanged individual gestures add none. Pointer cancellation, Escape, mode changes and touch-to-pinch cancellation restore pending movement without history. Scoped transactions preserve unrelated historical workflows.
- **Integration/exceptions:** both are drawing-only and explicitly excluded from `deformJoint()` propagation. Optional `strokeColor`, selection, copy/paste, horizontal/vertical/oblique mirror, JSON version 1 validation and clean SVG/PNG export reuse existing paths. Link hinge interiors remain white. Old drawings remain valid; older application versions cannot interpret the new types. Physical Android validation remains outstanding.

## rigidRegion rotation, pivot and geometric snapping

- **Sources:** `assets/app.js` owns `rigidSegments()`, `rigidWorld()`, `rigidLocal()`, `rotatedRigid()`, `renderRigidControls()`, drag state and geometric snap queries. `assets/tablet.js` integrates snap settings, pointer/touch rollback and mirror.
- **Model/rendering:** `x/y` plus local `points[]`; optional `rigidAngle` in degrees defaults to zero when absent. JSON remains version 1. Rotation applies local rotation then world translation. Outline, fill, hatch and hit path share the transformed Catmull–Rom cubic boundary. Styles remain independent of orientation.
- **Selection:** a single selected region displays control points, a pivot handle and an outside rotation handle. The transient `{id,x,y}` pivot starts at the arithmetic mean of world control points (not the area centroid of the spline). Moving it does not change geometry or model history. It may snap to the region's own points as well as external targets. Selection/mode changes can reset it; it is not serialized.
- **Rotation:** freezes pivot and object snapshot at gesture start. Pointer direction determines angular delta; origin rotates around the fixed pivot and `rigidAngle` changes, while `points[]` stays unchanged. No automatic tangent/orientation alignment occurs.
- **Snap geometry:** `geometricPoints()` adds transformed region control points, hinge centers and support insertion coordinates `x/y` to endpoint snapping. Support insertion coordinates are not necessarily the centers of decorative support circles. These are geometric targets only, with no structural topology or propagation.
- **Move/edit:** point editing snaps in world space, then converts back to local coordinates. Single-region translation considers each control point and applies one common correction to the origin. Target-type priority precedes nearest distance; equal candidates retain source control-point order. Own points and boundary are excluded for normal move/edit; pivot placement deliberately permits own targets. Multi-selection retains the generic group-move workflow rather than per-region contact alignment.
- **Contact:** the existing snap options include **Tangent / Contact**, initially off and persisted with other preferences. Enabled contact uses segment projection for bar/thin/dashed, exact quadratic-to-cubic conversion for curve, and the rendered cubic segments for rigidRegion. `cubicContact()` evaluates positions and derivatives, selecting nearest stationary/end candidates; degenerate zero-derivative candidates are skipped. Returned contact includes point and tangent direction, without imposing tangency of the moving region's own boundary.
- **Priority/tolerance:** intersection, endpoint/control/hinge/support, midpoint, tangent/member, then enabled visible grid. Discrete/contact tolerances use the existing screen-space scale (12px or 14px by type). Existing bar-member snapping remains available when tangent contact is off. Region feedback identifies the selected target and draws its tangent where available; it clears on completion/cancellation.
- **Lifecycle/history:** completed rotation, point edit or single-region move adds at most one model Undo entry; pivot-only moves add none. Pointer cancellation, Escape, mode change and touch-to-pinch rollback restore active gesture state. Rotation and whole-move validation checks local/world point limits; bounds validation does not certify that every spline overshoot stays inside those limits.
- **Persistence/export:** copy retains orientation/local geometry; mirror transforms reflected geometry with angle handling. Clean SVG and the existing PNG path retain rotation and omit handles/hints. Older drawings without angles remain valid; older application versions do not understand newly rotated drawings. Physical Android interaction still requires acceptance testing.

## Load placement and angle editor

- **Purpose:** orient P, M, and q directly on the canvas and optionally enter an angle.
- **Sources:** `assets/app.js`; cancellation/pan integration in `assets/tablet.js`.
- **Reuse points:** `openLoadAnglePanel()`, `paintLoadPreview()`, `placeLoadObject()`, `cancelLoadPlacement()`, `loadVector()`.
- **State:** `loadPlacement` retains the pending type, anchor, angle, and rotation; q also requires a second endpoint. Pointer movement updates the preview; Shift constrains the angle. The input and placement button commit the load. Moment placement includes a direction-reversal control.
- **Exceptions:** the editor is a fixed-position `div` near the canvas interaction, not near the toolbar button. It has its own inline styling and is not registered with `autoHideSecondary()`. Canvas clicks participate in placement rather than generic outside-click dismissal. `setMode()` cancels pending placement.

## Inline label and Equation editor

- **Value declaration classification:** `engineeringValueLabel()` recognizes a single identifier assigned a signed numeric literal (including decimal/scientific notation) followed by a unit-shaped suffix, including compound units and powers. This grammar does not maintain a unit-name blacklist. Such annotations retain their entered text and do not create solver metadata or a waiting-result suffix. Arithmetic expressions and explicit `giai(...)`, `solve(...)` or `-->` requests retain their existing paths. Ambiguous implicit products such as `x=2y` fit the declaration grammar; use `x=2*y` or an explicit solver command to express solving intent. Previously saved solver metadata is not automatically migrated.

- **New Text placement:** TT (two T presses within 700ms) or the Text toolbar activates the existing placement mode. Successful canvas placement creates/selects/renders one Text object, then calls `editObjectLabel()` → `editLabel()` immediately. Preventing the placement pointer event's default action preserves editor focus; no second click or Alt+S is needed. Mouse and touch use the same path.
- **Text history:** creation keeps its existing checkpoint; opening the editor adds none. Confirming changed content adds the existing edit checkpoint; unchanged plain text adds none. Cancel discards pending input and retains the newly created Text. Creation and a committed edit remain separately undoable/redoable. Existing `strokeColor` survives editing. TT timing and the generic Alt+S label-edit workflow are unchanged.

- **Purpose:** edit labels, calculations, equations, and mathematical presentation in place.
- **Sources:** `assets/app.js`, `assets/calculator.js`, entry points in `assets/tablet.js`.
- **Reuse points:** `editLabel()`, `editObjectLabel()`, `scriptRuns()`, `txt()`, `equationLayout()`, `renderEquation()`.
- **State:** `inlineEditor` owns a fixed text input and a separate preview element marked `data-label-expression`. Enter or blur normally saves; Escape cancels. Invalid equation conditions can retain editing. Formula metadata preserves source expressions for reopening.
- **Behavior:** the preview shows results or SVG mathematical layout. Equation command shortcuts such as `\sum` followed by Space insert a symbol and selected placeholder. Supported entry points include label editing mode, Alt+S, and text double-click handlers.
- **Viewport positioning (implemented; reviewed 2026-09-23):** `positionInlineEditor()` inside `editLabel()` repositions the active input and preview when the visible viewport changes. It uses valid `visualViewport` dimensions and offsets in CSS pixels, with normal viewport fallback. It re-reads the target rectangle when available and retains the last valid rectangle as fallback. Preferred width follows input length, constrained to visible space with approximately 8px margins where possible.
- **Input and preview accessibility:** positioning prioritizes keeping the input accessible. After width/content changes, final geometry is measured; the preview prefers below the input, moves above when that space is more suitable, and has its height constrained to available space while retaining scrolling. Extremely small viewports may clip the preview to prioritize the input.
- **Geometry-only updates:** viewport callbacks schedule positioning through one coalesced `requestAnimationFrame` queue. They do not call `showFullLabel()`, regenerate preview content, parse equations, render the drawing, change model/label coordinates, camera/viewBox, or history, focus the input, change its value or selection, or save/cancel editing. Positioning also runs after creation and final preview generation, with another pass scheduled after initial focus.
- **Lifecycle:** window resize and visual viewport resize/scroll listeners exist only during active editing. When editing actually finishes, listeners are removed and any queued frame is canceled before overlays are removed. Validation rejection that keeps editing active also keeps these listeners active.
- **Exceptions:** this is an editing overlay, not a tool-option flyout. Its width follows input length and viewport space. Equation presentation and numerical solving are different functions; mathematical layout does not imply that every displayed expression can be evaluated.

## Ω mathematical symbol palette

- **Purpose:** insert operators, Equation templates, relations, and Greek characters into an active text field.
- **Source:** `assets/tablet.js`; equation interpretation/layout in `assets/calculator.js` and `assets/app.js`.
- **Elements:** `#mathSymbols`, `#mathSymbolsPanel`, `symbolGroups`.
- **Reuse points:** `rememberMathInput()`, `positionMathSymbols()`, `closeMathSymbols()`.
- **State:** tracks the target input and selection range. The button toggles panel visibility, `.active`, and `aria-expanded`. Symbol insertion restores focus, inserts/wraps text, positions the caret, and dispatches an input event.
- **Exceptions:** selecting a symbol does not close the palette. There is no shared outside-click, hover-away, or dedicated Escape dismissal. It closes through Ω or its close button. Pointer-down handling deliberately preserves the label editor focus. Its text button and inline panel styling are separate from standard masked icons and the shared secondary panel. Symbol insertion is not remembered as a tool default.

## File controls, preview dialog, and status

- **Purpose:** create, open, save, export, and identify the current drawing.
- **Sources:** `assets/tablet.js`, `assets/app.js`, `assets/app.css`, `index.html`; local Word capability through `Word-Bridge.ps1`.
- **Reuse points:** `updateFileStatus()`, `finishDocumentEdit()`, `allowReplaceDocument()`, `openDocument()`, `loadDocument()`, `saveDocument()`, `newDocument()`, `previewDrawing()`, `listCandidates()`, `download()`, `exportSVG()`.
- **State:** file handle/name, saved text, busy state, selected candidate, and preview version are tracked separately. `#fileStatus` reports name and unsaved state. The open dialog allows choosing a folder/files and inspecting a preview before confirmation.
- **Exceptions:** file and edit `details` menus and `commandMenu()` still exist but are hidden; their command buttons are moved into visible `.action-group` containers. Word insertion is capability-dependent. Native browser file-picker availability affects save/open behavior. The old line-style dropdown is hidden; selected straight objects can be changed through drawing-style icons.

## Multi-step command controls and modal dialogs

| Component | Purpose and state | Existing functions | Exceptions |
| --- | --- | --- | --- |
| Copy/Paste | Capture a selection, pick a copy base point, then choose a paste destination. Clipboard and pending copy state are separate from drawing data. | `copySelection()`, `pasteObjects()`, `placeClipboard()` in `tablet.js` | No secondary option panel. Repeated Paste retains the base point. |
| Mirror | Select objects, define a two-point axis, choose whether to retain originals. `mirrorSelecting` supplements the normal mode. | `startMirrorAxis()`, `mirroredObjects()`, `completeMirror()` in `tablet.js` | Button can activate before selection; Enter advances to axis picking. A native dialog asks Keep/Delete/Cancel. Click-again exits. |
| Section extract | Define a cut, name cut points, select/drag an extracted group while preserving source objects. | `finishSection()`, `nameSectionCuts()`, `paintSection()` in `tablet.js` | Current point-count workflow uses two points for an open cut and three or more for a closed region; Enter advances. Point naming uses a native dialog. It is not the generic Hatch options panel. |

Modal dialogs use local creation and handlers rather than a shared dialog factory. Their confirmation/cancellation behavior is specific to each workflow; hover-away dismissal does not apply.

## Installation and update UI

- **Purpose:** expose PWA installation, offline readiness, and an explicit application-cache refresh page.
- **Sources:** `index.html`, `assets/tablet.js`, `sw.js`, `index.updated.html`.
- **State:** the install button starts hidden and is shown when an installation prompt is available; installed state hides it again. Service-worker readiness adds the offline indicator. The update page has its own progress/error message and temporarily disabled action button.
- **Reuse points:** existing install event handlers and update-page click handler; there is no general reusable installation component.
- **Exceptions:** these controls depend on browser capability and hosting context. The update page is separate from the drawing UI, and its cache operations are not toolbar drawing actions.

## Object foreground color

- **Purpose:** change the foreground of selected drawing objects through the compact **Màu** control in the view toolbar.
- **Sources:** `assets/app.js` (validation, SVG foreground/text/markers and history integration), `assets/tablet.js` (selection, native picker and edit grouping).
- **Reuse points:** `validObjectColor()`, `objectColor()`, `selectedColorObjects()`, `applyObjectColor()`, `finishObjectColorEdit()`, `syncObjectColorControls()`.
- **Data:** optional `strokeColor`, a six-digit `#RRGGBB` string. Missing values retain default rendering. There is no reset/default control; selecting black stores `#000000` as an ordinary explicit color. JSON remains version 1. Copy/paste and mirror retain the property.
- **Coverage:** bar, thin, dashed, curve, support, hinge, force, moment, udl, dim, text, positive, negative, diagramM, diagramQ, diagramN, hatch, rigidRegion, linkBar and weld. Foreground includes visible strokes, labels, Equation glyphs/rules and arrowheads. White symbol interiors, selection feedback, hit areas and temporary guides are not recolored.
- **Selection/state:** disabled without eligible selection; applies to one selected object or all eligible selected objects. Mixed foregrounds display **Nhiều màu**. The control edits properties rather than activating a drawing mode or changing tool defaults.
- **Picker:** native arbitrary color selection with seven `datalist` suggestions where the browser supports them: black, red, blue, green, orange, purple and gray. Native picker presentation is browser-dependent.
- **History:** continuous input events form one undo operation. Change/blur, selection changes, other pointer actions and history checkpoints end the edit group. Undo restores individual previous colors; returning to the starting state removes the no-op history entry and restores the redo branch.
- **Exceptions:** rigidRegion uses foreground only for its outline; fill mode/color/opacity and hatch settings remain independent. Standalone hatch uses foreground for visible hatch strokes. SVG export includes foreground and color-specific markers; PNG uses the existing SVG rasterization path. No calculator or equation-layout changes are involved.
- **Validation:** automated Edge and emulated touch checks exist in `tests/object-color.cjs`; physical Android native-picker behavior remains unverified.

## Scope of this inventory

The descriptions above come from static inspection of current source. They record existing behavior, not a claim that every component follows identical UI rules. No runtime code, data model, interaction policy, or recommended redesign is introduced by this document.
