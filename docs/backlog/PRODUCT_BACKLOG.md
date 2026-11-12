# Lifecare Companion™ — Product backlog

**How features are captured and recorded**
- **New ideas go into the in-app Tracker** (Settings → 📝 Tracker, admin only, from v2.14.0). Send Feedback entries arrive as *Feedback / New*; the admin re-categorises them as **Feature** and can also **+ Add** a Feature directly.
- **This file is the planned and approved record:** a feature gets an F-number (or a step/item number) here once JC approves it. The Tracker entry's "Link / ref" then holds that number.
- **Live status is in [`docs/plan.json`](../plan.json)** (from 12 Nov), shown in the Tracker; this file keeps the approved record.
- Defects are kept separately in [DEFECTS.md](DEFECTS.md). Detail and decisions for each item are in the dated `HANDOVER.md` Session Log entries.

## Done (for reference)
| ID | Feature | Shipped |
|---|---|---|
| F1 | "Open" pattern for Progress weeks (read-only → Edit/Save, delete inside the form) | v2.8.0 |
| F2 | Body balance check from progress photos (analyse-and-discard, never stored) | v2.12.0 |
| F3 | 📷 Snap to track food on the go | v2.6.5 |
| F4 | Post-upload OK message + "Check me" badge | v2.6.3 |
| F5 | "Open" for food list items and meal selections (portion + changes; Delete only from Update Lists) | v2.8.0 |
| F6 | Eating Feedback knows eaten vs planned | v2.9.0 |
| F7 | Optional description for photo checks; assumed size shown | v2.6.2 |
| F8 | Share to Lifecare Companion (Android) | v2.11.0 |
| F9 | Open pattern for My Body Weigh In and Measurements history | v2.13.0 |
| F10 | Measurement 📷 Snap (AI reads the value; Confirm fills it) | v2.13.0 |
| C1 | Eating week starts on Sunday (as exercise) | v2.6.4 |
| 1b | Efficiency pass items 1–4, 8, 9 (photo shrink, parallel loads, Help caching, logo, daily energy ping, AI usage ledger) | v2.14.0 |
| T | Feedback, Defect & Feature Tracker | v2.14.0 |

## Planned / approved, not built
| ID | Item | Notes |
|---|---|---|
| P2 | Automation: encrypted nightly backups, Build refresh, smoke tests, auto-tag | Prepared on build (12 Nov), **inactive until JC adds the secrets** (HANDOVER) |
| P2b | Emulator seeded from the vault backup; GitHub Actions Node update | After the secrets |
| P3 | Documents: SAD + threat model, DPIA, SDD/runbooks, ADRs (private, Architect); privacy notice, terms, intended use, accessibility, payments statements (public) | HLD and test strategy drafted 12 Nov |
| 1b-5 | Service worker caches the app shell (faster repeat opens) | Deferred: needs JC's decision on staleness/offline |
| 1b-6 | On-device copy of the last data for an instant start | Deferred: privacy/staleness decision |
| 1b-7 | Code-split the bundle | Deferred |
| S1 | Sign-in on a new device must "just work": several methods (Google, email link, Apple), PIN hint, release test on 4 platforms | Before any user other than JC and Becks (7 Nov) |
| Steps 2–6 | Firebase security hardening, remove hard-coded data, onboarding, multi-user data model, … | `MIGRATION_BRIEF.md` / HANDOVER §3 |

## Ideas (not approved)
- In-app "Install app" button (Chrome's install prompt) instead of the menu route (4 Nov).
- Admin-only technical Q&A chat over the private docs (never credentials) (6 Nov).
- Chat prompt caching (small saving; would restructure the Chat prompt) (12 Nov).
