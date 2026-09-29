# KetCauStudio UI Design Rules

## 1. Purpose and scope

[UI_COMPONENTS.md](UI_COMPONENTS.md) describes the current implementation, including reusable functions and exceptions. This document describes guidelines for future development.

Preserve existing workflows and documented exceptions unless the requested task explicitly includes changing them. These guidelines do not authorize retroactive standardization, architectural rewrites, or unrelated UI changes. Follow [AGENTS.md](../AGENTS.md) for change scope and confirmation requirements.

Future goals must not be implemented unless explicitly requested. A difference between an existing component and a future goal is not, by itself, a bug to fix.

## 2. Button appearance and state presentation

For new standard toolbar icons, reuse `.icon-button` and the existing decoration system:

- Inactive appearance: light background and raised shadow.
- Active appearance: highlighted background, inset shadow, and downward translation.
- Keep visual state and applicable accessibility attributes synchronized through the component's existing state handlers.

Define what the visual state represents for each control: a drawing mode, an enabled setting, a remembered choice, or an open palette. It does not universally mean that a drawing tool is active.

Use `aria-pressed` for applicable toggle/selection states and `aria-expanded` for panel visibility. Do not substitute one meaning for the other. Immediate commands such as Save, Export, Undo, and Redo do not require a persistent selected state.

Preserve existing exceptions: support choices use direct SVG and their own styling; Section assigns its icon mask directly; Ω is a text button outside the shared icon styling. This guideline does not require converting those controls.

## 3. Tool activation state

Keep tool activation distinct from button appearance and panel visibility. Reuse `setMode()`, `activateSelection()`, and the relevant component handlers where appropriate; do not introduce a competing mode mechanism merely to style a button.

Preserve current activation semantics:

- Ordinary drawing modes remain selected during their workflow; clicking the same tool is not a universal off toggle.
- Grid and snapping are independent setting toggles. Grid snapping also requires the grid to be visible.
- Pan has an explicit toggle and temporary Alt+Ctrl activation.
- Label editing has a persistent mode.
- Section and Mirror have explicit click-again exit behavior.
- Copy/Paste use point-picking workflows without the ordinary `data-mode` button mechanism.
- Support type may remain remembered, but its choice is highlighted/pressed only while Support drawing mode is active.

Opening or closing a panel must not implicitly change these semantics. Preserve existing cancellation and Escape handling for the affected workflow rather than assuming a universal close or reset action.

## 4. Panel visibility and dismissal

Track panel visibility separately from tool activation and remembered options. Closing a settings panel does not necessarily disable its tool; opening a palette does not necessarily activate a drawing mode.

For new options comparable to the shared secondary panel, reuse `chooseToolOptions()`, `positionSecondaryTools()`, `rememberToolOption()`, `closeSecondaryTools()`, and `autoHideSecondary()` where applicable.

Preserve the shared panel pattern:

- Float near the parent tool, constrain the panel to the viewport, and avoid changing toolbar layout.
- Update and remember supported defaults when an option is selected; keep the panel open after selection.
- Dismiss on outside pointer-down, window blur, or the existing delayed pointer-away behavior.
- Exclude touch pointer movement from hover dismissal and retain the separate Escape handler.

Do not apply that pattern indiscriminately to all floating interfaces. Anchoring, persistence, focus handling, and dismissal depend on the workflow in Section 5. Do not require every choice to be persisted or every panel to close after selection.

Reuse the closest existing panel styling and positioning implementation. Existing panels have different implementations; there is no universal popup component. Preserve persistent sidebar controls such as support choices.

## 5. Tool-specific workflows and exceptions

| Component | Behavior to preserve during future development |
| --- | --- |
| Shared tool options, including Hatch | Remember supported defaults and remain open after selection. Closing options does not itself end the drawing mode. |
| Snapping flyout | Keep enablement separate from visibility; allow multiple changes without closing. Preserve current hover, keyboard, scroll, and shared auto-hide handling. Closing the flyout does not disable snapping. |
| P, M, and q placement | Use canvas placement and an angle editor near the interaction point. Preserve pointer/Shift direction selection and mode-change cancellation. Do not replace placement clicks with generic outside-click dismissal. |
| Support/link choices | Remain visible in the sidebar. A choice can edit a selected support or activate placement; its highlight requires active Support drawing mode and a matching support value. |
| Inline label/Equation editor | Preserve source expressions, preview updates, save/cancel behavior, validation, and input focus. It is an editing overlay, not a tool-option flyout. |
| Ω symbol palette | Preserve the target input and selection during insertion. Remain open after insertion; close through Ω or the close button. Do not add outside-click, hover-away, or dedicated Escape dismissal as incidental cleanup. Symbol insertion is not a remembered tool default. |
| Copy/Paste | Preserve selection capture, copy base-point selection, destination selection, and repeated Paste using the retained base point. |
| Mirror | Preserve selection, axis definition, and the Keep/Delete/Cancel dialog. |
| Section extract | Preserve cut definition, naming, and extracted-group placement without modifying source objects. |
| File controls and modal dialogs | Preserve preview, confirmation/cancellation, and browser/Word capability-dependent behavior. Do not apply hover-away dismissal to modal workflows. |

Consult [UI_COMPONENTS.md](UI_COMPONENTS.md) for the complete inventory, source files, and component-specific reuse points. The table above does not replace those details.

## 6. Icon and layout guidelines

For new standard icons, reuse `toolIconPaths` and `decorateToolIcons()`. Match the existing 24px icon presentation, stroke weight, and visual style. Preserve minimum 44px button targets, accessible names, and shortcut tooltips where shortcuts exist.

Reuse engineering-symbol rendering for support choices rather than forcing those symbols into standard icon geometry. Preserve responsive toolbar wrapping, sidebar organization, and tablet usability. Avoid unrelated visual styles and unnecessary animation.

## 7. Integrating or changing a tool

Before implementation, identify:

1. The closest existing component and its source files.
2. Its button appearance and the meaning of its visual state.
3. Its activation, continuation, and cancellation behavior.
4. Its panel visibility, anchoring, persistence, and dismissal behavior.
5. Its keyboard, pointer, touch, and focus handling.
6. Reusable functions, CSS, and documented exceptions that must remain intact.

Prefer targeted reuse within the existing architecture. Do not create new button behaviors without confirmation as required by AGENTS.md; an already explicit user request supplies the scope for that behavior change.

For authorized implementation changes, validate the affected workflow and relevant existing tests, including state transitions and focus/touch behavior when applicable. Do not alter unrelated components to make their behavior uniform.

## 8. Future goals requiring an explicit request

Potential future work includes:

- Aligning exceptional button styling with standard toolbar styling where appropriate.
- Consolidating styling for comparable floating panels.
- Aligning dismissal and keyboard behavior where the workflows permit it.

These are possible future goals, not current implementation requirements. Do not implement them unless explicitly requested. Any such task must define its scope and preserve repeated selection, text-editor focus, engineering-symbol meaning, and touch usage, or explicitly specify the intended changes to those workflows.

Automatic closure after every option selection is not a universal goal: snapping supports multiple choices, and Ω supports repeated insertion.
