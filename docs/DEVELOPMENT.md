# Development and validation

No framework or build step is required at runtime. Deferred classic scripts allow direct file opening in supported desktop workflows; the Android target uses deployed HTTPS/Web/PWA, not a source folder opened from the OneDrive app. app.js owns drawing state; tablet.js adds touch, camera and PWA integration within the same application.

## Shared feature workflow

Use the architecture in [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md):

```text
Shared feature implementation
|-- desktop interaction/capability
`-- touch/web interaction/capability
```

Keep engineering and document behavior shared. Add capability-specific adapters only where necessary, using feature detection where practical. Evaluate new shared features for Windows mouse/keyboard and Android touch use; equivalent outcomes do not require identical interactions. Preserve existing Windows workflows and avoid platform forks.

Use the verification policy in [VALIDATION.md](VALIDATION.md). Record automated, emulated, Windows, and physical Android evidence separately; desktop test success alone is insufficient to declare a feature fully cross-platform validated.

## Run and test

- Preview: `python tools/serve.py --bind 127.0.0.1` (18766). Omit --bind for LAN access.
- Word bridge: `powershell -NoProfile -STA -File Word-Bridge.ps1`. For HTTP tests without opening a browser, add `-Port 18767 -NoBrowser`.
- Test dependency: `npm install --prefix .test-tools playwright --no-audit --no-fund` (Microsoft Edge required).
- With preview running: `node tests/browser.cjs`.
- Compatibility checks with preview running: `node tests/compatibility.cjs`.
- With the test Word bridge on port 18767: `node tests/bridge.cjs`.

Tests cover startup, persistence, zoom without model changes, clean SVG/PNG, offline reload/editing, portrait/landscape/mobile overflow, emulated touch pinch rollback, drawing after pinch, panning, label editing, library persistence, mocked Word requests, and denial of private server paths. Screenshots are under tests/.

Actual Word COM insertion and physical Android hardware still require manual acceptance testing. The mock does not modify Word documents.

## Package and update

The same source produces/serves both deployment targets:

```text
Source (Windows development; synchronized through OneDrive)
|-- Windows desktop workflow, including optional Windows integrations
`-- packaged static HTTPS/Web/PWA deployment for Android/browser use
```

Deploy the static package to an independent HTTPS host. The deployed web application must not require the Windows development PC to remain running. A local preview/LAN server is a development option, not that production deployment. Synchronizing source through OneDrive does not publish a new web release.

`powershell -NoProfile -File tools/package-web.ps1` creates dist/KetCauStudio-web.zip. Publish only its contents to an HTTPS static host. It contains no references, backups, test tools or Word code.

Increment CACHE in sw.js when publishing changed web assets. A new worker downloads the full shell and waits until old app tabs close. It does not force reload an open drawing. API responses and Word tokens are never cached.

Draft/library keys are retained. Storage is specific to the URL origin; JSON is portable. No cloud sync or server-side drawing storage is included.

For classroom use, access portable teaching JSON through the browser's file APIs or import/download fallbacks. OneDrive provider availability and write-back must be tested on the actual tablet; importing file contents alone does not confer overwrite access. Prepare the deployed PWA and required documents before offline use. PWA shell caching does not itself make OneDrive documents available offline. Before a production/tablet release, complete the applicable physical-device checks in VALIDATION.md and record unresolved limitations.

The viewBox camera never changes model coordinates. SVG/PNG export resets to 1100 x 720; Word computes its own crop. Touch snapshots state before the first finger and restores it on the second finger, then blocks editor events until all fingers lift. This prevents first-touch edits from leaking into a pinch.

### PWA release check

For every deployed app-shell HTML/CSS/JS change, update `KETCAU_APP_VERSION` in assets/tablet.js and increment the single `CACHE` constant in sw.js (currently shell-v6). Keep each release cache name unique. Publish the complete static package together; a failed required asset prevents the new worker from installing.

Open the installed app online. If an update is waiting, save the drawing, close **all** app windows/tabs for this site, then reopen. No automatic reload or skipWaiting is used. Verify the version in the small header status and the offline-ready message, then close and reopen in Airplane mode before class. The status checks the active shell cache; it does not certify OneDrive files are available offline. Physical Android validation is still required.
