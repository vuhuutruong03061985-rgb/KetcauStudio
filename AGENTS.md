# KetCauStudio - Project Instructions

## Project Overview

KetCauStudio is a structural engineering software.

Purpose:
- Create structural engineering drawing tools.
- Support structural diagram creation and technical documentation.
- Generate technical drawings and reports.
- Provide Windows desktop and tablet/PWA workflows.

Main technology:
- HTML/CSS/JavaScript drawing interface.
- Visual Basic .NET integration.
- Windows desktop workflow.
- Local file and browser storage.

Current limitation:
- No automatic structural solver for reactions or internal forces.
- Calculation and equation features must preserve existing engineering logic.

---

# Development Rules

## Before changing code

Always:

1. Analyze the existing code structure.
2. Identify related files.
3. Explain the planned changes.
4. Confirm before changing architecture or rewriting major modules.

Do not rewrite large parts of the project without approval.

Prefer:
- Minimal changes.
- Reusing existing architecture.
- Maintaining backward compatibility.

## Cross-platform development

- Maintain one source codebase for Windows PC and Android tablet via HTTPS/Web/PWA; do not create separate PC/tablet source trees.
- Keep calculations, drawing/model, equations, JSON format, rendering, export, and common application logic shared wherever technically possible. Do not duplicate engineering/business logic or document formats.
- Isolate necessary platform differences as capabilities/adapters; prefer capability detection over device/user-agent detection.
- Evaluate shared features for Windows mouse/keyboard and Android touch use; interaction mechanisms may differ. Preserve existing Windows compatibility.
- Follow docs/VALIDATION.md: desktop test passes alone do not establish cross-platform validation. Record emulated versus physical evidence; require physical Android checks for tablet-sensitive changes and before a production/tablet release, not every trivial internal change.
- See PROJECT_CONTEXT.md for architecture/status and docs/DEVELOPMENT.md for release workflow.

---

# Coding Principles

- Preserve existing functionality.
- Avoid unnecessary dependencies.
- Keep code simple and maintainable.
- Follow existing naming conventions.
- Add comments for complex engineering logic.
- Avoid changing unrelated files.

---

# Engineering Logic Rules

This software is used for structural engineering.

When modifying calculation or drawing logic:

- Do not change formulas without explanation.
- Verify units carefully.
- Maintain engineering terminology.
- Keep calculation results consistent.
- Preserve existing engineering conventions.

Do not modify engineering symbols or calculation methods without understanding their current purpose.

---

# Data Compatibility Rules

KetCauStudio uses saved drawing data and templates.

When modifying data-related features:

- Preserve existing JSON compatibility.
- Do not break old drawings.
- Do not change saved data structures without migration planning.
- Keep import/export behavior stable.

---

# UI Rules

When modifying interface:

- Maintain a clean engineering software style.
- Prioritize accuracy and usability.
- Avoid unnecessary animations.
- Keep layouts suitable for technical users.
- Preserve existing workflows unless improvement is required.

---

# Debugging Workflow

When fixing bugs:

1. Reproduce the issue.
2. Find the root cause.
3. Explain the cause.
4. Apply the smallest appropriate fix.
5. Test again.

Do not only patch symptoms.

After modifications:

- Run relevant tests when available.
- Check compatibility with existing features.
- Report failed tests clearly.

---

# Documentation Usage

Read documentation only when relevant.

Use:

## docs/DEVELOPMENT.md

For:
- Runtime architecture.
- Development workflow.
- Running commands.
- Testing procedures.
- Build/package process.

## docs/VALIDATION.md

For:
- Validation requirements.
- Expected behavior checks.

## docs/file-library.md

For:
- File organization.
- Data and library management.

## HUONG-DAN.md

For:
- User-facing behavior only.

Do not scan all documentation files by default unless required by the task.

---

# Important File Organization

## index.html

Main application entry point.

## assets/

Contains:
- Drawing engine code.
- Interface resources.
- CSS.
- Tablet/PWA related files.

## tools/

Contains:
- Utility scripts.
- Local servers.
- Packaging tools.

## data/

Contains:
- Templates.
- Engineering data.

## tests/

Contains:
- Automated validation scripts.
- Browser compatibility tests.

## Word-Bridge.ps1

Windows Word integration.

## archive/

Old versions and backups.

Do not modify archive files unless specifically requested.

---

# Change Scope

Before editing:

State clearly:

- Which files will be changed.
- Why each file needs modification.
- Possible side effects.

Prefer targeted fixes over broad refactoring.

---

# Testing Requirements

When applicable, validate changes using existing project tests.

Examples:

- Browser behavior tests.
- Compatibility tests.
- Word bridge tests.

Do not remove or bypass existing tests to make changes pass.
## UI Design Rules

For any UI changes, read:
docs/UI_DESIGN_RULES.md

All new tools must follow existing UI patterns.
Do not create new button behaviors without confirmation.
