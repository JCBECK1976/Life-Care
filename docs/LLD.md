# Lifecare Companion™ — Low-Level Design (LLD)

Version 1, 13 Nov 2026 (prod v2.15.1). Public document. It describes **how the code is organised, what data it keeps and how it calls the AI**. It replaces `TECHNICAL_REFERENCE.md`, which is kept as a pointer and as the historical reference for older details. The high-level view is in [HLD.md](HLD.md). Decisions are in [adr/](adr/). Security architecture, access-control specifics and the threat model are in the private SAD, not here.

## 1. Runtime and build
- **Stack:**
  - Vite 5 and React 18, built into one bundle.
  - Firebase compat SDK: Realtime Database and Authentication (Google sign-in).
  - Hosted as static files on GitHub Pages.
- **Environment:** each build gets three values at build time: the environment (`VITE_APP_ENV`: `prod` / `beta` / `build`), its data root (`VITE_DATA_ROOT`) and version details.
  - The version string is set in one place, `src/constants/version.js` (`APP_VERSION_BASE`).
  - Beta shows `-beta.N`; Build shows `-build.<sha>`.
- **`vite.config.js` plugins:**
  - Copies `APP_GUIDE.md` next to `index.html`; Help fetches it.
  - Publishes `docs/plan.json` as `plan.json` when present (the prod build fails if it isn't valid).
  - Adds `noindex` and a title prefix on build and beta.
  - Generates the installable-app manifest and a network-only service worker per environment. The service worker caches nothing, except images shared into the app from other Android apps until they are picked up.
- **Deploy:**
  - `scripts/build-pages.sh` builds all three branches into one Pages artifact.
  - `scripts/check-pages.mjs` checks it: prod/beta never refer to the Build data copy; required files are present.
  - `.github/workflows/deploy.yml`: only main's run deploys.

## 2. Modules
| Path | Responsibility |
|---|---|
| `src/main.jsx` | Mounts the app inside the top-level error boundary; registers the service worker in builds. |
| `src/App.jsx` | `Dashboard`: shared state, data loading (dashboard first, then everything else in parallel), `saveData`, per-person settings, the cross-section AI handlers (Home feedback, eating day/week feedback, thread replies, Chat, Help, body-composition screenshot reading, RAG recalculation, Google Health sync), header, navigation, footer. **Large: read by line ranges only.** |
| `src/sections/` | One component per tab: `Home`, `Body`, `BodyBalance`, `Exercise`, `Eating`, `Shop`, `Health`, `Settings` (admin sections since v2.15.0), `Data` (admin data tools: Download backup, Restore, Data viewer). Each receives what it needs from `Dashboard` as a `ctx` prop. |
| `src/components/` | Shared UI: `AuthGate` (sign-in gate), `OpenForm` (the Open pattern: read-only → Edit/Save, Remove/Delete inside), `HistoryRows`, `MeasureSnap` (measurement photo reading), `NoFoodPanel`, `Tracker`, `AiUsageCard`, `ContactEmailCard`, `ChatPanel`, `HelpPanel`, `FeedbackForm`, `PrivacyPolicy`, `PrivacyNote`, `ReviewItemOverlay`, `SharePicker`, `PersonTabs`, `EnvBadge`, `ErrorBoundary`, `LoadingScreen`, `charts`. |
| `src/lib/storage.js` | `sGet` / `sSet`: read and write one key under the data root. Values are mostly JSON strings. Errors are swallowed (treated as "no data"). |
| `src/lib/firebase.js` | Firebase initialisation; `DATA_ROOT`; development and tests switch to the local emulator. |
| `src/lib/api.js` | AI helpers: API key loading, error mapping (`handleApiError`, `aiErrorMsg`), the fetch wrapper that sends each reply's token counts to the usage ledger, Companion Energy status. |
| `src/lib/aiUsage.js` | The AI usage ledger (`featureOf`, `costOf`, transactional add, list prices). |
| `src/lib/image.js` | `readImageForAI`: every photo is shrunk (long edge ≤ 1568 px, JPEG 0.85) before sending. |
| `src/lib/children.js`, `meals.js`, `eatPhase.js` | Eating model: parents/children, weekday view ↔ children, snapshots, eaten vs planned. |
| `src/lib/rag.js` | Portion-based RAG bands and frequency allowance (rules in code). |
| `src/lib/nutrition.js`, `snap.js` | Nutrition recalculation and plausibility; photo portion checks and the "no food" rule. |
| `src/lib/bodyBalance.js`, `bodyPhotoCheck.js`, `measureReading.js` | Body balance prompt and parsing; body-photo recognition flags; measurement reading from a photo. |
| `src/lib/exercise.js` | Exercise types, per-set weights and reps, progression status; week helpers (`findWeekIdx`, `previousEntry`, `latestEntry`) used by the Log form and the overwrite check; Companion feedback per week (`attachCompanion`, `setCompanionDecision`). |
| `src/lib/chat.js`, `aiContext.js` | Conversation ordering (latest exchange first); mood, profile and journal context for prompts. |
| `src/lib/backup.js` | Parse a backup or console export; counts; restore targets. Writes nothing itself. |
| `src/lib/tracker.js`, `plan.js` | Tracker entries; plan loading and upsert (`syncPlan`, `planEntry`, `phaseTotals`). |
| `src/lib/contact.js`, `debugLog.js` | Feedback email setting; safe Debug Mode summaries. |
| `src/lib/safety.js` | v2.15.2: `MEDICATION_RULE`, added by the `api.js` fetch wrapper to the system prompt of every Messages API request (first block in a block-list system prompt, so Help's cached prefix stays identical). |
| `src/constants/` | Version, styles (button standard), themes, tone rules, defaults, food and exercise constants, the admin Documentation list (`docsIndex.js`). |
| `scripts/automation/` | Nightly backup, Build refresh, post-deploy smoke test (run by GitHub Actions). |

## 3. Data (Realtime Database)
One root per environment: `data` (prod and beta) or `data_build` (Build). Most values are **JSON strings under flat keys**, so a save rewrites that whole key. Keys are sanitised (`. # $ / [ ]` → `_`).

| Key | Shape (summary) |
|---|---|
| `dashboard:data` | `{ config: { week, session, trainingStart, lastUpdate }, <person>: { profile, exercises: { <day>: [ { name, current, reps, status, prog: [ { wk, w, r, sets: [ {w, r} ], companion?: { verdict, recommendation, at, decision?: accepted|rejected, decisionNote? }, fullRange, goodForm, note } ] } ] }, body: { weight: [ {wk, v, date?, source?} ], bodyFat, muscleMass, … }, measurements: { <part>: [ {wk, v, date?} ] }, healthLog, bloods, progressPhotos: [ … ], bodyPhotos: [ … ], activity: [ … ] } }` |
| `custom_breakfasts`, `custom_lunches`, `custom_meals`, `custom_snacks`, `custom_desserts`, `custom_drinks` | Food lists (**parents**): `[ { id, name, kcal, protein, fat, satFat, addedSugar, carbs, fibre, salt, rating, ragFreq, band, itemType, ingredients, suitability } ]` |
| `eat_children:<person>:<Sunday YYYY-MM-DD>` | `{ v, children: { "c_<date>_<slot>": { parentId, date, weekday, slot, snapshot, portion, variations, nutrition, rating, ragFreq, band, parentBand, tracked, source, notes } }, empty: [ "<weekday>:<slot>" ], notes }` |
| `mealplan:…`, `meal_tracking:<person>`, `portion_overrides:<person>` | Older eating formats, converted to children once when a week is opened. |
| `meal_defaults`, `shop_defaults`, `supermarket_pref` | Eating and shopping preferences. |
| `feedback_results`, `feedback_history`, `eat_feedback`, `session_feedback_all`, `body_feedback`, `meas_feedback`, `health_feedback`, `health_fb_<person>` | AI feedback per person/section, with conversation threads. |
| `qa_history`, `help_history` | Chat and Help conversations per person. |
| `user_colour_<p>`, `user_mood_<p>`, `daily_mood_<p>`, `journal_<p>`, `wellbeing_flags_<p>`, `rag_health_hash_<p>` | Per-person settings and entries. |
| `custom_exercises`, `custom_meas_types`, `custom_med_names`, `custom_blood_tests` | User-added types. |
| `companion_energy` | `{ initial, balance, spent, pct, depleted, needsCalibration, calibratedAt, ledgerAtCalibration, keyStatus, lastCheck }` |
| `ai_usage` | `{ total: { n, in, out, cw, cr, cost }, days: { "YYYY-MM-DD": { "<feature>": { n, in, out, cw, cr, cost } } } }`, kept 120 days. **Counts only, never content.** |
| `tracker/<id>` (object node) | Feedback/admin entry: `{ id, created, updated, version, env, account (masked), person, kind, text, category, status, priority, note, ref, source }`. Plan entry `tracker/plan_<id>`: plus `planId, title, phase, tokenPct, version, planNotes, order` (plan fields overwritten on sync; `note` kept). |
| `feedback_email` | Admin setting: where Send Feedback emails go (empty = Tracker only). |
| Admin configuration keys | Service settings kept by the admin; not listed in this public document. |

**Structured photo results (photos themselves are never stored):**
- `progressPhotos[]` (Body balance): `{ date, week, pose, scores: { <region>: 1–5 }, notes, flags, summary }`. Regions are defined in `bodyBalance.js`.
- `bodyPhotos[]` (Body Type Photos): `{ date, name, type }` plus the analysis text. Kept to the last 20.
- Measurement and portion photo checks keep only the values the person confirms.

**Writes:**
- `saveData` writes the whole `dashboard:data`.
- Children are written per week document.
- `ai_usage` uses a transaction.
- Tracker entries are written per entry.
- Every change must stay readable by the released prod version ([ADR 0002](adr/0002-shared-database-backward-compatible-changes.md)).

## 4. AI call map
- **Common settings:**
  - Every request carries the medication safety rule (`safety.js`), except the daily energy ping, which sends no data.
  - Every call goes from the browser to the Anthropic Messages API with model `claude-sonnet-4-6`.
  - Each request has a `max_tokens` cap set per feature.
  - Every reply passes through the fetch wrapper, which records token counts in the ledger.
- **Photos:** shrunk first and never stored. Photo replies carry recognition flags (`isFood`; `readable` / `matchesPart`; `isPerson` / `isFullBody` / `matchesPose`). A failed check disables Confirm/Save and nothing is saved.

| Where | Calls |
|---|---|
| `App.jsx` | Home check-in feedback; eating day and week feedback (eaten vs planned); thread replies; Chat (person's data as context); Help (app guide as a **cached** system prompt); body-composition screenshot reading; RAG re-rating; daily energy ping (at most once a day). |
| `sections/Eating.jsx` | Food lookup and classification; bulk paste add; recipe totals; Update Item recalculation; 📷 Snap and portion photo checks (first check at temperature 0; Re-check is an independent deep dive); Help Me with What to Eat; Food Checker; meal suggestions. |
| `sections/Exercise.jsx` | Exercise guides; warm-up/cool-down; session feedback and replies. |
| `sections/Body.jsx`, `BodyBalance.jsx`, `components/MeasureSnap.jsx` | Body and measurement feedback; Body balance check (structured scores); measurement reading from a photo. |
| `sections/Home.jsx` | Body Type Photos analysis; Home helpers. |
| `sections/Health.jsx`, `Shop.jsx` | Health feedback and document reading; shopping photo and list helpers. |

Replies are parsed defensively. Cut-off or unreadable replies are reported to the person, never shown as if complete. Ratings come from code (`rag.js`), never from the AI.

## 5. Patterns to keep
- **Open pattern:** saved things open read-only. Edit → Save/Cancel; Remove (take out of a week/meal/history) or Delete (permanently delete a list item/type) sit inside the form. Buttons follow the shared colours in `styles.js`.
- **Person safety:** per-person loads ignore stale results after a person switch.
- **Eating:** screens read the children; the parent lists change only through Update Lists.
- **No secrets in code:** settings that vary are admin settings in the database; credentials for automation are GitHub secrets ([ADR 0008](adr/0008-automation-via-github-secrets.md)).
- **Docs:** every user-visible change updates `APP_GUIDE.md` (read live by Help).

## 6. Tests
See [TEST_STRATEGY.md](TEST_STRATEGY.md).
- **How they run:** Playwright with the local Firebase emulator (seeded from a backup kept outside the repo) and a mocked AI (`tests/mock-ai.js` plus per-test mocks).
- **Per version:** each version has its own spec (`tests/v2xx.spec.js`), plus feature specs (eating, exercise, backup, people, pwa, env-build, visual).
- **Pure helpers** (`rag`, `children`, `plan`, `measureReading`, `bodyPhotoCheck`, `debugLog`) are tested directly.
- **Prod compatibility:** checked on demand against the released version.
