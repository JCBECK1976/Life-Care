# ADR 0007: `docs/plan.json` is the single source of the plan

- **Status:** Accepted
- **Date:** 12 Nov 2026 (v2.15.0)

## Context
Plan status was spread across HANDOVER entries, backlog files and chat. The admin wanted the plan visible in the app's Tracker, kept current without app releases.

## Decision
- `docs/plan.json` on `main` holds every item: id, title, category, phase, status, priority, token estimate, version, notes.
- Each main deploy publishes it as `/Life-Care/plan.json`, including doc-only commits.
- Opening the admin Tracker loads it and updates its items by id. Plan fields are overwritten; the admin's own notes are kept; feedback entries are untouched.
- The Coder and Architect update it whenever an item starts or finishes (rule in CLAUDE.md and MIGRATION_BRIEF).

## Alternatives rejected
Keeping the plan in the Tracker database only (no history, not reviewable); keeping it in the backlog markdown (not machine-readable).

## Consequences
- One place to read the plan, and live status without a release.
- An invalid file stops the prod deploy, so the live app stays as it was.
- The backlog files remain the approved record.
