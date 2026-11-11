# Lifecare Companion™ — High-Level Design (HLD)

Draft 1, 12 Nov 2026 (v2.14.0). Public document. It describes **what the system is made of and how the parts work together**. Security architecture, threat model, access control detail and data-protection assessment are in the private SAD and DPIA (vault), not here. The low-level design is [`TECHNICAL_REFERENCE.md`](../TECHNICAL_REFERENCE.md).

## 1. Purpose and scope
Lifecare Companion is a personal **wellness** companion (not a medical device) for a household. It brings together exercise logs, eating plans and food ratings, body composition and measurements, health notes, mood and journal. An AI "Companion" turns that data into feedback, answers questions and checks photos.
Current users: JC and Becks. The design anticipates more users (Steps 3–5 in `MIGRATION_BRIEF.md`), but nothing here assumes them yet.

## 2. System context
```
 Phone / desktop browser (installable PWA)
   │  React app (static files)            ── GitHub Pages: /Life-Care/ (prod) · /beta/ · /build/
   │
   ├── Google sign-in ─────────────────── Firebase Authentication
   ├── reads / writes data ───────────── Firebase Realtime Database (one data root per environment)
   ├── AI requests ────────────────────── Anthropic Messages API (claude-sonnet-4-6)
   └── product search ─────────────────── Open Food Facts (public, no personal data sent)
 GitHub Actions: build + deploy all three environments; (prepared) backups, Build refresh, smoke tests, tagging
```
There is **no application server**: the app is static files; data lives in Firebase; AI calls go from the app to Anthropic.

## 3. Environments and release flow
| Environment | URL path | Data root | Who |
|---|---|---|---|
| Build | `/Life-Care/build/` | `data_build` (a copy of real data, refreshed nightly once automation is on) | Architect checks every change |
| Beta | `/Life-Care/beta/` | `data` (real data, shared with prod) | JC tests before release |
| Prod | `/Life-Care/` | `data` | JC and Becks, daily |

- Source changes go **build → beta → main** by pull request; only main's workflow deploys, and every deploy rebuilds all three environments (`scripts/build-pages.sh`).
- The data root is written into each bundle at build time (`VITE_DATA_ROOT`), and a check (`scripts/check-pages.mjs`) stops a prod/beta bundle that refers to the build copy.
- Because beta and prod share real data, every change must be **backward compatible** with the released prod version (a prod-compatibility test runs the released version against new data shapes before a beta PR).
- Versions: `v2.X.0` feature/layout, `v2.X.Y` fix; beta shows `-beta.N`, build `-build.<sha>`. See [CHANGELOG](CHANGELOG.md).

## 4. Application structure
- **Vite + React 18**, one bundle. `src/App.jsx` holds shared state and loads data; each tab is a section component (`src/sections/`: Home, Body, Exercise, Eating, Shop, Health, Settings, Data tools). Shared UI is in `src/components/` (e.g. `OpenForm`, `HistoryRows`, `MeasureSnap`, `Tracker`), logic in `src/lib/`.
- **The Open pattern** is the standard for anything saved: a row with key data and **Open** → a read-only form → Edit/Save, with Remove (take out of a week/meal/history) or Delete (permanently delete a list item or type) inside the form. Button colours are standard across the app.
- **Start-up:** after sign-in the app loads the dashboard record, then reads all other keys **in parallel** (since v2.14.0) and the current and four past eating weeks.
- A minimal service worker makes the app installable and receives images shared from other apps (Android share target). It does not cache the app.

## 5. Data model (Realtime Database)
Each environment has one root (`data` or `data_build`). Values are mostly JSON strings under flat keys.

| Area | Keys (examples) | Content |
|---|---|---|
| People and their records | `dashboard:data` | Per person: profile, exercises by day (with weekly progress entries and per-set weights/reps), body composition history, tape measurements, health profile, body balance results. Plus shared config (training start, week). |
| Food lists (parents) | `custom_breakfasts`, `custom_lunches`, `custom_meals`, `custom_snacks`, `custom_desserts`, `custom_drinks` | The household's food items with nutrition, rating (RAG), type and ingredients. |
| Eating (children) | `eat_children:<person>:<Sunday>` | One document per person per week: dated **child** selections. |
| Feedback and chats | `feedback_results`, `eat_feedback`, `session_feedback_all`, `body_feedback`, `qa_history`, `help_history`, … | AI feedback and conversation threads. |
| Personal settings | `user_colour_<person>`, `user_mood_<person>`, `journal_<person>`, … | Per-person preferences and entries. |
| AI usage | `ai_usage` | Token **counts** per day and feature, plus a running cost total. No content. |
| Tracker | `tracker/<id>` | Feedback, Defect and Feature entries (text only). |

**Parent / child eating model (v2.6.5).** A food list item is the **parent**. Choosing it for a meal creates a **child** for that date and slot, with its own snapshot of the parent's nutrition, its own portion (factor, photo-checked values or AI-recalculated "changes"), its own nutrition and its own rating. Editing or deleting a parent never changes past meals; changing a meal never changes the parent. Week and frequency rules ("already 3 times this week") count children. Rating rules (D11) are code (`src/lib/rag.js`), not AI.

## 6. AI flows
All AI calls use the Anthropic Messages API with `claude-sonnet-4-6`.

| Flow | Input | Output | Notes |
|---|---|---|---|
| Feedback (Home check-in, session, eating day/week, body, measurements, health) | The person's relevant data and recent conversation | Structured feedback (JSON) + a conversation thread | Eating feedback knows eaten vs planned. Replies that are cut off or unreadable are reported, never silently shown. |
| Chat and Help | Question + context (Chat: the person's data; Help: the app guide) | Answer | Help's guide is sent as a **cached** system prompt. |
| Food rating and recalculation | Item name/ingredients, portion, changes | Nutrition values | Ratings then come from rules in code. Recalculations are checked for plausibility. |
| Photo checks (📷 Snap, Food Checker, Help Me Eat, measurement Snap, Body Type Photos, Body balance) | A photo, **shrunk before sending** (≤ 1568 px), optional description | Values, assessment or structured scores | **Images are analysed and then discarded: never stored**, not in the database, not in backups. Only the result is kept. A Re-check is an independent second look. |
| Energy check | A minimal request, at most once a day | OK / error | Drives the Companion Energy status. |

Every reply's token counts go to the **AI usage ledger**; Companion Energy is the ledger's spend since the admin last set the balance to 100%.

## 7. Feedback, Defect & Feature tracker
💬 Send Feedback saves an entry (time, version, environment, masked account, person, text; *Feedback / New*) and opens an email as before. The admin triages entries in Settings → 📝 Tracker (re-categorise, status, priority, note, ref) and can add Defects and Features directly. Approved items get IDs in [backlog/](backlog/), which is the planned record.

## 8. Privacy principles
- **Minimum data:** only what the features need. Photos are never stored; the AI usage ledger and the tracker hold no images; the tracker stores a masked account.
- **Purpose:** the data is used only to give the household feedback and guidance; it is not shared or sold.
- **Processors:** Firebase (Google) stores data and handles sign-in; Anthropic processes AI requests; GitHub hosts the static app and the private, encrypted backups.
- **Separation:** test changes run on the Build copy; pilot users' data will not be copied into test areas without consent (the Build refresh refuses).
- **Backups:** full snapshots, encrypted before they leave the runner, stored only in a private repository; never in this public repository (`.gitignore` blocks backup/export file names).
- **Wellness, not medical:** the Companion never gives medical advice; health data adds context to feedback only.
The full assessment is the DPIA (private).

## 9. Quality, operations and constraints
- Tests and checks: see [TEST_STRATEGY.md](TEST_STRATEGY.md).
- Releases only after JC has tested beta; rollback = revert the release merge on main.
- Automation (prepared, inactive until secrets are added): nightly encrypted backup to the vault, nightly Build refresh, post-deploy smoke test, release tagging.
- Constraints: one bundle (no code splitting yet); no offline data; Realtime Database values are mostly JSON strings (one key per area), so a save writes the whole area.

## 10. Related documents
`TECHNICAL_REFERENCE.md` (LLD) · `APP_GUIDE.md` (user guide, read live by Help) · [CHANGELOG](CHANGELOG.md) · [backlog](backlog/) · `MIGRATION_BRIEF.md` · private: SAD (incl. threat model), DPIA, SDD.
