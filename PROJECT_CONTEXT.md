# KetCauStudio Context

## Current Development Goal

Improve KetCauStudio into a complete structural engineering application.

## Official Usage Targets and Architecture

KetCauStudio has one shared source codebase and two official usage targets:

1. Windows PC, currently used in practice; existing behavior must remain compatible.
2. Android tablet through deployed HTTPS/Web/PWA, required for actual classroom use. Browser/responsive/touch emulation has covered several interactions, but physical Android validation is still required before declaring full Android support.

The target architecture is confirmed; that is not a claim that all platform behavior has been validated. Detailed verification status is recorded in [docs/VALIDATION.md](docs/VALIDATION.md).

| Shared core | Platform capabilities and integrations |
| --- | --- |
| Engineering/calculation logic, drawing/model logic, equation system, JSON document format, rendering, SVG/PNG export, and common UI/application behavior | Windows: Word Bridge, Word COM, Windows launchers, and other Windows-only integrations. |
| The same core serves both targets wherever technically possible. | Web/Android-specific or enhanced: touch interaction, pinch zoom, virtual keyboard/IME handling, PWA lifecycle, browser file APIs and fallbacks. These capabilities may also be available on other devices. |

Do not create separate PC and tablet source trees, duplicate engineering/business logic, or introduce platform-specific document formats. Isolate necessary platform behavior in capabilities/adapters and prefer capability detection over user-agent/device detection. This describes the development boundary, not a requirement to rewrite existing modules.

Development/source files remain synchronized through OneDrive on Windows. Android runs the deployed application rather than the source tree from a OneDrive Android folder. Teaching drawings remain portable JSON files that can be opened later on Windows. OneDrive file-provider read/write behavior on Android, including same-file overwrite, remains subject to physical validation; source synchronization is not deployment or built-in application cloud synchronization.

## Current Features

- Structural drawing
- Load visualization
- Support representation
- Engineering diagrams
- Calculation modules

## User Expectation

The software should behave like professional engineering software.

Priority:
1. Correct engineering logic
2. Stable operation
3. Clean interface
4. Easy maintenance

## Development Style

Prefer:
- Incremental improvement
- Reusing existing code
- Avoid unnecessary rewrite
