# ADR 0002: Beta and prod share the real database; data changes are backward compatible only (expand/contract)

- **Status:** Accepted
- **Date:** 5 Nov 2026

## Context
JC must test new versions on his real data, on his phone, before release. A separate beta database would need syncing and could drift from reality.

## Decision
- Beta and prod read and write the same real data root.
- Every data change must be **backward compatible** with the released prod version: **expand/contract**.
  - **Expand:** add new keys or fields; prod ignores what it doesn't know.
  - **Contract:** remove or reshape old keys only after the release that no longer needs them.
- Migrations convert data lazily, only when it is opened, and keep it readable by the released version until then.
- Before each beta promotion, the released prod version is run against the new data shapes (prod-compatibility test).

## Alternatives rejected
A separate beta database (sync burden, unrealistic tests); beta on a copy (doesn't test the real migration path).

## Consequences
- JC tests with real data, and no syncing is needed.
- Some cleanups wait a release.
- A beta bug can write to real data, which is why changes are checked on Build first and backups run nightly.
