# ADR 0011 — Accounts, tiers, energy and the AI proxy as a reusable "Companion platform"

- **Status:** Accepted (JC approved, 13 Nov 2026 22:46, via the Architect). Designed and built locally 14 Nov 2026; not live.
- **Context:** Lifecare Companion needs individual accounts, households, tiers, a server-side energy ledger, an EU AI proxy and payments before pilot users. The parent brand, CompanionApps.studio, plans more Companion apps, which would need the same pieces.
- **Decision:**
  - Build these pieces once, as a platform keyed by `appId` (`lifecare` first): `apps/{appId}/…` paths in the database, and per-app configuration for tiers, energy prices and AI.
  - App-specific data stays separate per app. Platform admins are listed once (`platform/admins`).
  - **Don't over-engineer:** build only the seams a second app would need (the `appId` in paths and config). No multi-app user interface, no shared cross-app wallet.
  - The hard rule from the Architect (13 Nov 22:40) applies to every app: an admin cannot read users' health data; it is enforced in rules and functions.
- **Alternatives rejected:**
  - Lifecare-only paths: simpler today, but a second app would need a data migration.
  - A separate Firebase project per app: duplicates billing, functions and admin for a two-person team.
- **Consequences:** every server function takes `appId` (default `lifecare`); the rules template repeats per `appId`; design in [docs/design/ACCOUNTS_TIERS_ENERGY.md](../design/ACCOUNTS_TIERS_ENERGY.md).
