# ADR 0003: Nightly Build refresh from real data

- **Status:** Accepted (live 13 Nov 2026)
- **Date:** 12 Nov 2026 (prepared), 13 Nov 2026 (live)

## Context
The Architect checks every change on `/build/`. Its data copy goes stale, and test edits accumulate in it.

## Decision
- A scheduled GitHub Actions workflow copies the real data root into Build's data root each night, after the nightly backup.
- It copies only the known household's data. Once other users exist, their data is not copied into test areas without consent: the job refuses.

## Alternatives rejected
Manual re-seeding (stale, forgotten); synthetic test data only (misses real-data edge cases).

## Consequences
- Build always starts close to reality, and test edits are wiped nightly.
- Build is a full copy of real personal data, so it gets the same protection as prod.
