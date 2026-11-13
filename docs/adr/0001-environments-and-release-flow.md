# ADR 0001: Environments and release flow (build → beta → prod, hotfix route)

- **Status:** Accepted
- **Date:** 4–5 Nov 2026 (v2.1.0); hotfix route used for v2.6.0

## Context
The app is used daily by two people. Changes made by an AI coder need checking by the Architect, and testing by JC on a phone, before they reach daily use. GitHub Pages serves one site per repository.

## Decision
- Three environments, built from three branches into one Pages site:
  - **Build:** `build` → `/Life-Care/build/`, with its own copy of the data.
  - **Beta:** `beta` → `/Life-Care/beta/`, on the real data.
  - **Prod:** `main` → `/Life-Care/`, on the real data.
- The data root and environment name are fixed into each bundle at build time.
- **Normal flow:** source changes are committed to `build` → the Architect checks `/build/` → PR `build → beta` (merge commit) → JC tests `/beta/` → PR `beta → main` (the release, tagged automatically).
- Doc-only commits go straight to `main`.
- **Hotfix route:** for an urgent prod fix while beta holds unreleased work, branch from `main`, fix, check, PR to `main`, then merge the fix back into `beta` and `build`.
- Only main's workflow deploys. Every deploy rebuilds all three environments.
- **Failures:** a prod build failure stops the deploy; a beta or build failure leaves that environment out and is reported.

## Alternatives rejected
Separate repositories or hosting per environment (more to manage, and Pages serves one site per repo); runtime environment detection (a test bundle could reach real data by mistake).

## Consequences
- Nothing reaches daily use without a check by the Architect and a test by JC.
- Versions are visible per environment: `v2.X.Y`, `-beta.N`, `-build.<sha>`.
- **Rollback:** revert the release merge on `main`; the previous release redeploys.
- Every deploy takes a few minutes, because all three environments are rebuilt.
