# Validation status and policy

## Section-group N/Q/M visibility — 2026-09-24

`tests/section-visibility.cjs` passes on headless Edge with emulated touch. Coverage includes one extraction crossing multiple members, all-action hiding/re-enabling per group, re-selection through remaining geometry when all forces are hidden, partial and mixed selection, unique group targeting, inter/intra-group indeterminate states, normalization, missing/deleted actions, one bulk Undo/Redo checkpoint and no-op history, single-group preferences versus unchanged bulk preferences, startup storage validation and creation defaults. Hidden actions retain labels/formulas/vectors/signs, survive JSON/copy/mirror, and produce no SVG hit group or primary move handle. Tests inspect clean SVG for all hidden components and actual PNG pixels, plus the shared clean-render/crop input consumed by Word. A normal touch checkbox tap is emulated; real Android and Word COM insertion were not tested.

Passed commands:

- `node tests/section-visibility.cjs`
- `node tests/multi-selection.cjs`
- `node tests/rigid-transform-snap.cjs`
- `node tests/rigid-region.cjs`
- `node tests/link-bar.cjs`
- `node tests/weld.cjs`
- `node tests/multiple-joints.cjs`
- `node tests/copy-base.cjs`
- `node tests/mirror.cjs`
- `node tests/object-color.cjs`
- `node tests/inline-editor-viewport.cjs`
- `node tests/text-placement.cjs`
- `node tests/label-expression.cjs`
- `node tests/line-editing.cjs`
- `node tests/section.cjs`
- `node --check assets/app.js`
- `node --check assets/tablet.js`

The earlier `section.cjs` failure recorded below is now superseded: its UI sequence was updated to Enter, confirm K1, then place the extraction; label/export expectations now reflect existing subscripted names. Existing geometry assertions remain. Production section geometry was not changed to satisfy the old workflow. No failures remain in this run; unrelated historical suites were not modified.

Visibility is sectionGroup-level and never deletes force data. Old JSON without the optional flag remains all-visible. Single-group editing updates future creation preferences; bulk editing does not. Physical Android checkbox/touch/browser and file/export acceptance is still pending. No `sectionCutId`, packaging, deployment or service-worker change was introduced.

## Desktop multi-selection — 2026-09-24

`tests/multi-selection.cjs` passes in headless Edge. It covers mouse Ctrl toggles and primary selection, normal clicks, 4 CSS-pixel click/group-drag discrimination, empty click and marquee, section-group versus per-drawable Ctrl priority, mixed drawable types, hidden multi-selection handles, shared Escape/right-click cancellation, right-button chording during group/endpoint/rigid point/rotation/pivot drags, editor cancel rather than save, selection restoration and filtering rolled-back IDs, current section Enter/naming/extraction cancellation, scoped context menus, Ctrl+Alt pan, command selection consumers, and emulated tap/pinch rollback. Selection-only actions do not add history.

Passed commands: `node tests/multi-selection.cjs`, `node tests/rigid-transform-snap.cjs`, `node tests/rigid-region.cjs`, `node tests/link-bar.cjs`, `node tests/weld.cjs`, `node tests/multiple-joints.cjs`, `node tests/copy-base.cjs`, `node tests/mirror.cjs`, `node tests/object-color.cjs`, `node tests/inline-editor-viewport.cjs`, `node tests/text-placement.cjs`, `node tests/label-expression.cjs`, `node tests/line-editing.cjs`, `node --check assets/app.js`, and `node --check assets/tablet.js`.

`node tests/section.cjs` fails at line 28 (`2 !== 8`): its UI sequence expects extraction after two points without the current Enter/naming steps. Later expectations also use unsubscripted N/Q/M labels. The test remains unchanged; the focused new suite exercises current section creation/cancellation. This stale-workflow classification follows the inspected existing event path, not a historical Git checkout comparison (this folder has no Git repository).

During development, the link-bar test exposed stale deleted selection IDs suppressing handles; the effective-selection query now filters IDs against current items, and the unchanged test passes. No final failure remains in the new focused test. Physical Android touch/browser acceptance is still required; emulation is not full Android validation. No packaging, deployment, service-worker change or N/Q/M visibility implementation was performed.

## linkBar and weld validation — 2026-09-24

Added `tests/link-bar.cjs` and `tests/weld.cjs` using headless Edge mouse and emulated touch/Pointer Events. Coverage includes creation without chaining, hit testing, independent link endpoints, equal-delta body translation, weld center movement, short-link handles, degeneracy and bounds validation, discrete external snaps and self exclusion, drawing-only isolation from `deformJoint()`, cancel/mode-change/Escape/pinch rollback, Undo/Redo and unchanged individual gestures. Integration checks cover JSON v1 compatibility/validation, color, copy, three mirror axes, clean SVG and actual PNG pixels, including an edited oblique link.

The existing object-color fixture now supplies linkBar endpoints and verifies 20 supported drawable types; existing color assertions remain intact.

Passed commands:

- `node tests/link-bar.cjs`
- `node tests/weld.cjs`
- `node tests/rigid-transform-snap.cjs`
- `node tests/rigid-region.cjs`
- `node tests/copy-base.cjs`
- `node tests/mirror.cjs`
- `node tests/construction-snap.cjs`
- `node tests/endpoint-hint.cjs`
- `node tests/multiple-joints.cjs`
- `node tests/line-editing.cjs`
- `node tests/object-color.cjs`
- `node --check assets/app.js`
- `node --check assets/tablet.js`

No failures remained in this focused run. Previously documented unrelated legacy tests were not investigated or weakened. Touch evidence is emulated, not physical Android acceptance: real touch selection/drag, pinch cancellation, browser gestures and file/export behavior still require tablet testing. No package, deployment or service-worker version change was made.

## Cross-platform validation policy

Windows PC is currently used in practice; future changes must preserve existing Windows behavior. Android through HTTPS/Web/PWA is an official, required classroom target, but full physical Android support has not yet been validated. Existing browser/touch emulation results are useful evidence, not a substitute for physical-device acceptance.

For shared changes, where relevant:

1. Run applicable automated regression tests.
2. Verify Windows mouse/keyboard behavior and compatibility.
3. Verify responsive layout and touch behavior.
4. For Android-sensitive browser, IME, file-provider, or PWA behavior, record whether checks were emulated or performed on physical hardware, along with the device/browser, tested release, outcome, and remaining limitations.

Desktop passes alone do not establish full cross-platform validation. Physical Android validation is required when changes affect tablet-sensitive behavior and before a production/tablet release. It is not required for every trivial internal change; select checks according to the change's impact. The dated records below remain historical results, not assertions that every current feature has been retested.

## rigidRegion rotation/snapping continuation — 24/09/2026

Verified the implementation already present in the working tree; no production code or tests changed in this continuation. Confirmed whole-region grid alignment, mode-change rollback, feedback clearing and whole-move bounds validation are present.

Passed (Edge headless):

- `node tests/rigid-transform-snap.cjs`
- `node tests/rigid-region.cjs`
- `node tests/copy-base.cjs`
- `node tests/mirror.cjs`
- `node tests/construction-snap.cjs`
- `node tests/endpoint-hint.cjs`
- `node tests/multiple-joints.cjs`
- `node tests/line-editing.cjs`
- `node --check assets/app.js`
- `node --check assets/tablet.js`

Transform coverage includes mouse rotation, arbitrary/own-point pivot snapping, rotated point editing, hinge/support/control targets, contact off/on and persistence, discrete/contact/grid priority, self exclusion, bounds, feedback cleanup, snapshot-based rotation, mode/Escape/pointer cancellation, Undo/Redo, old/new JSON, copy and mirror across three axes including oblique, clean SVG and an actual rotated PNG pixel. CDP touch emulation passed completed rotate/pivot/point/whole-move gestures plus touchCancel and transition-to-pinch rollback for each: one model Undo for completed model edits, zero for pivot movement, no lingering gesture/hint state.

Existing tests that did not pass, kept unchanged:

| Command | Observed failure / interpretation |
| --- | --- |
| `node tests/intersection-snap.cjs` | Intersection coordinate and hint assertions pass, then expects an immediately created force after one click. Current load placement awaits direction/confirmation, so it reads the previous line's origin `[200,400]` instead of `[350,300]`. Stale workflow expectation. |
| `node tests/snap-controls.cjs` | Attempts to click the hidden `#snapSettings summary`; current UI uses the snap button/flyout. Stale locator. |
| `node tests/curve-midpoint.cjs` | Exact SVG string expects integer coordinates; actual endpoints differ by about 0.00003. Stops before its later legacy copy assumption. |
| `node tests/drawing-bounds.cjs` | Exact coordinate comparison differs by at most about 0.000061. |
| `node tests/joint-shift.cjs` | Exact comparison: `500.0000303663394` versus `500`. |
| `node tests/new-interactions.cjs` | Previously reported exact comparison: `200.0000151831697` versus `200`. |

All four floating-point failures reproduced in read-only, in-memory control runs using the prior `point()` query sequence, with identical mismatches. This supports unrelated numeric test brittleness, not a new rigidRegion regression; it is not a historical Git checkout comparison. An additional in-memory Playwright check passed current two-stage force placement at an intersection, midpoint/endpoint toggles and disabled snapping with contact off. Existing test assertions were not weakened.

Limitations: physical Android rotation/pivot/pinch, browser cancellation and hardware touch targets remain unvalidated. The pivot is transient and may reset with selection; centroid means mean control point, not spline area centroid. Contact is point-on-geometry, not an orientation/tangency constraint. Single-region control-point alignment does not replace generic multi-selection movement. Validation bounds control points, not every spline overshoot. No packaging, deployment or service-worker version change.

## Object color verification — 23/09/2026

### Engineering value-label classification — 23/09/2026

Fixed automatic solver inference for numeric engineering value declarations. `tests/engineering-labels.cjs` covers P/q/L/E/A/I/α/M, custom unit names, compound units, superscript powers and scientific notation; no waiting suffix or solver metadata, unchanged reopening, copy and SVG text. Arithmetic, direct equations and explicit solver requests with missing data remain covered.

Passed commands: `node tests/engineering-labels.cjs`, `node tests/equations.cjs`, `node tests/equation-dependencies.cjs`, `node tests/equation-units.cjs`, `node tests/label-expression.cjs`, `node tests/text-placement.cjs`, `node tests/object-color.cjs`, `node tests/equation-layout.cjs`, `node tests/math-symbols.cjs`, `node tests/inline-editor-viewport.cjs`, `node tests/copy-base.cjs`, `node --check assets/calculator.js`, `node --check assets/app.js`.

With `python tools/serve.py --bind 127.0.0.1`, `node tests/label-copy.cjs` now passes its previously failing label assertions naturally, then fails at line 20 (6 objects versus 9) because it assumes immediate Ctrl+C/Ctrl+V copying without the current base/destination selection. No expected outputs were changed. `node tests/calculator.cjs` times out on the removed `#calculatorPanel>summary` UI; arithmetic coverage passes through the current inline-editor tests. These stale workflows were not modified.

The classification describes intent, not unit validity/conversion: arbitrary unit-shaped names are allowed. Ambiguous `x=2y` requires explicit multiplication or a solver command for solving. Existing saved erroneous solver formulas are not silently rewritten; replace their label with the intended declaration. Physical Android validation is still outstanding; no deployment/cache change was made.

### Subsequent Text placement verification — 23/09/2026

`tests/text-placement.cjs` first reproduced the missing editor before the placement fix, then passed with the shared Text-placement completion calling the existing editor. Coverage includes TT/700ms expiry, L/D/C/K shortcuts, exactly one created Text, immediate editor/focus/typing, confirm, unchanged confirmation, cancel retaining the object, separate creation/edit Undo and Redo, default/custom color preservation, and unchanged generic Alt+S editing for Text, P/M/q, dimensions and diagram labels. Both mouse and toolbar/touch-emulated placement passed.

Passed: `node tests/text-placement.cjs`, `node tests/inline-editor-viewport.cjs`, `node tests/equation-layout.cjs`, `node tests/equations.cjs`, `node tests/math-symbols.cjs`, `node tests/object-color.cjs`, `node tests/label-expression.cjs`, and `node --check assets/app.js`.

`node tests/drawing-shortcuts.cjs` times out at its obsolete `[data-mode="select"]` locator (line 18), before placing Text; current Select uses `resetView`. The test was not modified. Its earlier shortcut checks execute; the new focused test covers the relevant current workflow. The previously recorded new-interactions/label-copy failures were not rerun for this change.

Physical Android keyboard opening/IME, Back and touch/browser focus behavior still require device validation. Emulated touch success is not full Android acceptance. No shortcut dispatcher, generic editor, service-worker version, packaging or deployment was changed.

The existing implementation was verified without changing production code or tests. Automated browser checks used Microsoft Edge headless; touch and tablet layouts were emulated, not physically validated on Android.

Passed commands:

- `node --check assets/app.js`
- `node --check assets/tablet.js`
- `node tests/object-color.cjs`
- `node tests/rigid-region.cjs`
- `node tests/copy-base.cjs`
- `node tests/mirror.cjs`
- `node tests/line-editing.cjs`
- `node tests/equation-layout.cjs`
- `node tests/equations.cjs`
- `node tests/math-symbols.cjs`
- `node tests/inline-editor-viewport.cjs`

Color coverage includes all 18 supported drawable types; default appearance and reset; single/multiple selection; mixed prior colors restored by one Undo; continuous picker edit grouping, redo and no-op edits; six-digit color validation and JSON import; copy independence and mirror preservation; Equation glyphs/rules and independent arrowhead colors; rigidRegion outline/fill independence and deformation in Hatch/Color/None; clean SVG; and actual PNG raster pixels (colored and default black strokes). Touch emulation covers selection/reset, picker input events, and portrait/landscape layouts. Native color-dialog interaction itself is not automated.

Remaining unrelated/stale test failures (tests were not changed):

- `node tests/new-interactions.cjs`: strict coordinate comparison expects `200`, receives `200.0000151831697` at the continuous-drawing assertion.
- With `python tools/serve.py --bind 127.0.0.1` running, `node tests/label-copy.cjs`: expects literal `P = 45 kN`, receives `P=45 kN-->Chờ dữ kiện` from the current Equation label workflow. It stops before its copy assertions; those also assume the older immediate offset-paste workflow. Current base-point copy behavior passes `tests/copy-base.cjs`.

Both failures reproduced in in-memory control runs with the color toolbar removed and its synchronization disabled. This supports classifying them as unrelated to the color UI, rather than new color regressions. No Git baseline is available in this working folder, so this is not a historical checkout comparison. An initial control harness removed the toolbar without disabling synchronization and failed on missing controls; that harness result is not an application defect.

Physical Android checks remain required for native color picker/suggestions, dismissal/Back, touch multiselection and undo/redo, rotation with the picker open, and JSON/SVG/PNG file-provider/export behavior. These automated passes do not establish full Android compatibility. No packaging, deployment or service-worker cache/version change was performed.

## Kiểm tra ngày 13/09/2026

Đã đạt:

- Kiểm tra cú pháp JavaScript và PowerShell.
- Edge: khởi động, tự lưu/khôi phục, thư viện mẫu, xuất SVG sạch, PNG 3300 × 2160.
- Service worker: tải lại khi mất mạng và tiếp tục thêm đối tượng.
- Giả lập cảm ứng: thu/phóng hai ngón, khôi phục thao tác ngón đầu, tiếp tục vẽ sau thu/phóng, kéo trang không đổi dữ liệu.
- Giao diện dọc/ngang tablet và màn hình nhỏ không tràn ngang.
- Sửa nhãn và hoàn tất hatch bằng nút trên màn hình; hoàn tác hatch.
- Mở trực tiếp index.html, nhập JSON cũ, từ chối JSON lỗi mà không mất bản vẽ.
- HTTP không bảo mật như mạng Wi-Fi: vẫn tạo đối tượng khi crypto.randomUUID không có.
- API Word giả lập: ảnh PNG và header token đúng.
- Máy chủ PowerShell thực ở cổng thử 18767: phục vụ HTML/CSS/JS/manifest/icon; token không cache; chặn đường dẫn riêng, token sai và PNG sai trước khi truy cập Word.

Các lệnh và điều kiện chạy nằm trong DEVELOPMENT.md. Ảnh desktop.png và tablet.png trong tests/ ghi nhận giao diện đã kiểm tra.

Chưa kiểm tra trên tablet Android vật lý hoặc chèn ảnh thật vào Word. Chưa triển khai HTTPS công khai. Dữ liệu chưa đồng bộ tự động giữa thiết bị.

## Kiểm tra trình sửa nhãn/Equation theo viewport — 23/09/2026

Đã thêm `tests/inline-editor-viewport.cjs` và chạy hồi quy bằng Playwright với Microsoft Edge headless. Kết quả này bổ sung cho bản ghi lịch sử phía trên, không xác nhận lại toàn bộ các tính năng đã ghi ngày 13/09/2026.

Phạm vi đã đạt:

- Trình sửa ở gần cuối màn hình vẫn truy cập được sau khi thu nhỏ viewport; chuyển kích thước dọc/ngang 800 × 1280 → 1280 × 800 → 800 × 1280.
- Preview nhãn chữ, Equation SVG, kết quả tính toán, thông báo lỗi và nội dung dài xuống dòng.
- Đường xử lý `visualViewport` của trình duyệt, sự kiện resize/scroll với kích thước và offset giả lập, và fallback khi không có `visualViewport`.
- Repositioning bảo toàn dữ liệu/tọa độ đối tượng và nhãn, camera/viewBox, lịch sử, giá trị input, focus, caret/vùng chọn và nội dung preview.
- Chèn ký hiệu từ Ω sau khi viewport thay đổi.
- Mở/đóng trình sửa nhiều lần, dọn listeners và frame đang chờ; giữ trình sửa và listeners hoạt động khi validation từ chối hoàn tất do giới hạn độ dài phương trình.
- Dùng hình chữ nhật hợp lệ gần nhất khi phần tử đích không còn trong DOM.

Các lệnh đã chạy và đạt:

- `node tests/inline-editor-viewport.cjs`
- `node tests/equation-layout.cjs`
- `node tests/equations.cjs`
- `node tests/math-symbols.cjs`

### Giới hạn: vẫn cần kiểm tra trên Android vật lý

Kiểm thử tự động trên Edge và các sự kiện giả lập không xác nhận đầy đủ khả năng tương thích Android. Vẫn phải kiểm tra trên thiết bị thật:

- Hành vi bàn phím ảo.
- IME/composition khi nhập văn bản.
- Đóng bàn phím và nút Back của Android.
- Hành vi `visualViewport` thực tế.
- Xoay màn hình khi bàn phím đang mở.
- Tương tác cảm ứng, pinch và trình duyệt thực tế.

### Phạm vi nghiệm thu Android cho lớp học — chưa xác nhận trên thiết bị thật

Ngoài các kiểm tra bàn phím/IME/viewport ở trên, vẫn cần ghi nhận kết quả Android vật lý cho:

- Vẽ và chọn bằng cảm ứng; kéo đối tượng, pan và pinch.
- Chuyển dọc/ngang, kể cả khi đang chỉnh sửa.
- Trình sửa Equation và bảng ký hiệu Ω.
- Open JSON, Save và Save As.
- OneDrive Android file provider: chọn/đọc JSON, lưu tệp mới, quyền ghi đè cùng tệp nếu được hỗ trợ, và mở lại kết quả trên Windows sau đồng bộ.
- Xuất PNG/SVG.
- Cài đặt PWA, cập nhật service worker, khởi động và sử dụng ngoại tuyến.

Chưa có kết quả Android vật lý được ghi nhận cho các mục này. Các mục tiêu kiến trúc và kết quả giả lập không phải là tuyên bố tương thích Android đầy đủ.
