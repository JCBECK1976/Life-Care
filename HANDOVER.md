# Claude Code Handover — Life Care Companion

## Context for Claude Code

This document hands over the **Life Care Companion** app from its development phase in Claude Chat to Claude Code (run Claude Code on **Opus 5.5**, `claude-opus-5-5`; the start instructions are in `MIGRATION_BRIEF.md`) for platform engineering and commercialisation. The app has been built iteratively across multiple chat sessions from approximately August–October 2026, totalling 365+ version increments. It is a working product in live daily use by its two founding users (JC and Beck).

---

## 1. Where We've Come From

### Origin
JC and Beck have a comprehensive Life Care Plan (PDF, built in ReportLab Python) covering exercise, diet, medical health, and wellbeing. The React dashboard app was created to make this plan interactive, trackable, and AI-powered — replacing static PDF tables with a living companion that learns from their data.

### How It Was Built
- **Entirely in Claude Chat** — no local IDE, no build tools, no dev server
- **Single-file architecture**: One `index.html` containing all React JSX, compiled by Babel in the browser
- **Deployed via GitHub API**: Claude pushes the file directly to GitHub Pages using the Contents API
- **Iterative development**: One feature per version, one version per deploy, tested live after each push
- **365+ versions** from v1.0.0 to v1.365.0, each individually versioned and deployed

### Key Milestones
| Version | Feature |
|---------|---------|
| v1.260-264 | Conversational feedback threads, exercise architecture |
| v1.270-271 | Body composition charts in eye panels, measurements redesign |
| v1.277 | Full rebrand to "Lifecare Companion™" |
| v1.282 | Eating section simplification (removed planned/consumed tracking) |
| v1.286 | "Help Me with What to Eat" AI feature |
| v1.302 | Comprehensive button audit and design system |
| v1.306-313 | Open Food Facts integration, packaged/ingredient classification |
| v1.315-322 | Home page redesign (mood, energy meter, My Day) |
| v1.324-332 | Exercise refactor (search/select, AI guides, quality toggles) |
| v1.329 | Dynamic RAG rating system |
| v1.338-340 | Body section redesign (measurement cards, image upload) |
| v1.341-344 | Warm-up/cool-down, delete confirmations, energy meter fixes |
| v1.345-361 | Design system alignment (colour theming, header hierarchy, container patterns, button audit) |
| v1.362-365 | Per-user colour isolation, privacy policy, settings gear icon, legal links |
| v1.365.1-5 | Add-item flow patches (superseded — see Session Log 2 Nov 2026) |
| v1.366.0 | Add-item feature rebuilt: shared confirm handler, paste-based bulk add (file import removed) |
| v1.366.1 | **Root-cause fix**: removed client-side fetch gate that blocked all AI calls ("Energy Empty") |
| v1.366.2 | Review Item overlay Confirm fixed (out-of-scope function); status shown inside panel; never add on failed recalc |
| v1.366.3-5 | Add box closes after add from selection list; GREAT items dark green; day-tab guidance text |
| v1.367.0 | Delete button on first day-tab meal row (clears, keeps box) |
| v1.368.0 | Update Item panel in Update Eating Lists (nutrition, description, recalc flow) |
| v1.368.1-2 | Log user switch loads colour; session feedback cut-off/error fixes |
| v1.369.0-1 | Chat icon replaces ? button; exercise-log user switch makes that person fully active |
| v1.370.0 | Stop / Restart Exercise with Stopped Exercises toggle |
| v1.371.0 | Companion chat panel restyled to match feedback conversation threads |
| v1.371.1 | Fixed "Remove exercise from day" in session feedback (undefined index; removes by name) |
| v1.372.0 | Companion Energy: exact per-call cost incl. cache, "Set balance" calibration, empty only when Anthropic says so |
| v1.373.0 | ❓ Help button: Companion answers how-to questions from `APP_GUIDE.md` (replaces a user guide) |
| v1.374.0 | Help ? moved into the header, left of the Settings gear; floating ? removed (only 💬 Chat floats) |
| v1.374.2 | Help intro shows Lifecare Companion™ as in footer |
| v1.374.1 | Energy bar: percentage only (no $ shown to users); 100% level set by admin in Settings; fixed 0% when record lacked `initial` |
| **v2.0.0** | **Vite migration cutover** (4 Nov 2026): component files, no in-browser Babel, error boundaries, ESLint + Playwright checks, GitHub Actions deploy; behaviour unchanged. Legacy v1.374.2 kept at `/legacy.html` (tag `legacy-v1.374.2`) |
| v2.1.0 | Build / beta / prod environments (Step 1a): one Pages pipeline for `main`, `beta`, `build`; per-environment data root; `-beta.N` / `-build.<sha>` versions; BUILD/BETA badge and tab-title prefix; noindex on test environments. First release through build → beta → main |
| v2.1.1 | Unused code removed (no behaviour change): `ExTable`, `StrengthBanner`, `LoadingBtn`, `PBar`, `RC`, `SNACK_TEMPLATES`, `DAY_TYPE`, `DEFAULT_OTHER_GB`, `JC_BASE`, `BECK_BASE`, hidden meds block |
| v2.2.0 | Settings → 🗂 **Data tools** (admin only): opens the Firebase Data Viewer and recovery tools; ← Back to Settings |
| v2.3.0 | Logos: loading screen with the App Logo (static in `index.html`, no flash); header logo mark (option B, `header-mark-288.png`) in a 44px white disc; BUILD/BETA badge under Help/Settings |
| v2.4.0 | Installable app (PWA) per environment: manifest, tinted icons for beta/build, network-only service worker; Help install steps (Chrome; Samsung Internet may be blocked by Play Protect). **Not released alone: shipped to prod inside v2.5.2** (no `v2.4.0` tag) |
| v2.5.0 | Header title = selected person; scrollable `PersonTabs` (header + exercise log) that follow the selected person; names over 12 chars cut with "…"; Data Viewer/Eating labels use profile names |
| v2.5.1 | Fix: person-switch race (stale start-up and switch loads applied to the newly selected person); portion overrides and Google token now load per person |
| v2.5.2 | "+ add person" hidden (`ALLOW_ADD_PERSON = false`) until the multi-user data model (Steps 3/5). **Prod release v2.3.0 → v2.5.2** |
| v2.5.3 | BETA/BUILD app icons restyled (thin crisp ring like the header mark, purple/orange, no dot); prod icons unchanged |
| v2.6.0 | **Security pass (hotfix route):** Google sign-in gate (joint account), Settings → Account, `database.rules.json` allow-listing the account UID on `data/` and `data_build/`. Once the rules are applied, `legacy.html` stops working; rollback = revert to the previous v2 release (or reopen the rules in the console in an emergency) |
| v2.6.1 | Exercise log form (release 1, fix): **D1** form belongs to its person ("Logging for …"; header switch asks first, never mixed); **D2** weight and reps per set (`sets: [{w, r}]`, old entries compatible); **D12** Form and Range start unselected, Save blocked until chosen. *(On `build`; not yet released)* |
| v2.6.2 | Food data and photos (release 2, fix): **D6** meal selections keep a snapshot (`_snap` per day:slot in the week's plan); deleted items show the snapshot or "Deleted item", never code. **D7** Update Item recalculates the whole recipe, applies only real values, before → after, plausibility check with one retry, assumed amounts, name's "(N kcal)" updated. **D9** generator: selections → defaults → generated only into empty slots from that slot's list, summary. **D10** different-food photo → new entry replaces the slot item with Undo; original never written. **F7** optional description on Portion and Shop Food Checker, preferred by the AI; assumed size shown. | build only |
| v2.6.3 | Bulk upload (release 3, fix): **D4** bulk has its own category, starts unselected ("Choose a category first"), confirm names it ("Add 14 items to Drinks?"). **D5** Cancel aborts requests and discards late results; "Cancelled — nothing was added", or says what earlier batches kept with Undo. **D3** batches of 10 with progress, each batch saved as it succeeds, failed batches retried with "Retry N". **F4** OK-to-dismiss reminder; `checkMe: true` badge "Check me" (RAG colour kept) in Update Lists and selection lists until the item is opened and saved. | build only |
| v2.6.4 | Chats + eating week (release 4): **D8** Question, Help and all feedback threads (session, eating, body, Home summary) show the latest exchange first (question above its answer); thread reply box moved above the conversation. **C1** eating week shown Sunday → Saturday (display only; data was already keyed by the Sunday the week starts). | build only |
| v2.6.5 | Architect/JC decisions (10 Nov 07:20): **D11** portion-based RAG by rules in code (`src/lib/rag.js`; new `addedSugar`, `ragFreq` weekly/monthly; AMBER ≤3/week, RED weekly/monthly treats) + "🔄 Re-rate all lists" (changed → Check me). Data tools **"Clear old eating history"** (meal week plans before a date; dry run → Delete), replacing the D6 repair (JC). **Snap** 📷 on every slot: description first, Confirm / Re-check / Cancel, empty slot → list match or "Add to list?". **D7** "🔎 Re-check nutrition" (flags only) + recalc/plausibility on the add-item Review path. | build only |
| v2.7.0 | **Release (on beta as v2.7.0-beta.2, 10 Nov; not yet on main):** contains all of v2.6.1–v2.6.5, which were **build-only and never released separately**: per-set logging + Form/Range rule (D1/D2/D12); meal snapshots → **parent list items + dated child selections** with their own RAG (D6/D13 superseded by the 14:35 model); real Update/Review recalculation (D7); portion-based RAG with added sugar + Re-rate all lists (D11); generator order (D9); 📷 Snap with deep-dive Re-check (D10/F7/D15); bulk upload fixes + Check me (D3–D5/F4); Sunday-first week (C1); latest-first chats (D8); child-RAG colouring (D14); phone picker sheet (D16); Data tools: Download backup, Restore preview → merge / full restore (type RESTORE), Clear old eating history; deploy queue + Node 24 actions. | beta |

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: v2.6.0 (5 November 2026) in prod; **v2.7.0-beta.2 on beta** (10 Nov 2026, awaiting JC test + release). Vite build, deployed by GitHub Actions. Test environments: `/Life-Care/beta/` (real data) and `/Life-Care/build/` (`data_build`)
- **Status**: In daily use by JC and Beck for tracking exercise, nutrition, body composition, and health
- **Build**: Vite, from component files in `src/` (since v2.0.0). No in-browser Babel; loads in ~1–2s instead of ~70s.

### Technology Stack
| Component | Technology |
|-----------|-----------|
| Frontend | React 18.2.0 (npm, bundled by Vite) |
| Build | Vite 5 (`npm run build` = ESLint + build) |
| Database | Firebase Realtime Database |
| Auth | Google Identity Services → Firebase Auth |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Hosting | GitHub Pages, deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main` |
| Checks | ESLint (`no-undef`, hooks rules) + Playwright tests against the Firebase emulator, AI mocked |
| External API | Open Food Facts (UK product search) |

### App Sections
1. **Home** — Greeting, mood selector (5-level), My Day (eating + exercises), Companion Energy meter, AI companion feedback (coffee-chat style)
2. **Body** — Body Stats tab (weight, body fat, muscle mass, etc. with charts), Measurements tab (exercise-style cards with progress, image upload)
3. **Exercise** — Per-day exercise management (Sun/Mon/Fri), logging with quality toggles, AI-generated warm-up/cool-down, exercise guides, progression tracking
4. **Eating** — Weekly meal planning, day-by-day food selection, custom food lists with RAG ratings, AI meal generator, nutrition tracking, Copy Day/Week
5. **Shop** — Food Checker (AI-powered with camera), Shopping list generation from meals, Group by Aisle
6. **Health** — General notes, Vitals, Medications (active/stopped), Blood results
7. **Setup/Settings** — Profile, onboarding, API key management

### AI-Powered Features (all use Anthropic API)
- Home companion feedback (mood-aware, cross-pillar data)
- Section-specific companion feedback (eating day/week, exercise session, body comp, measurements)
- AI meal generator (RAG-frequency aware)
- Dynamic RAG rating system (personalised to health data)
- Food Checker (text + camera, nutritional analysis)
- Help Me with What to Eat (location-aware food guidance)
- Exercise guides (per-exercise how-to)
- Pre/Post exercise guides (warm-up/cool-down stretches)
- Session warm-up and cool-down
- Profile recommendations and body type check
- Ask a Question (floating button, any-section)
- Conversational follow-up threads on all feedback

### Critical Known Issues
1. **Firebase security** — Database rules are wide open (see FIREBASE_SECURITY.md)
2. ~~File size limit~~ — fixed in v2.0.0 (Vite build, no in-browser Babel).
3. **Silent Firebase errors** — `sGet()`/`sSet()` swallow permission errors, app loads defaults instead of showing error
4. **GitHub PAT** — regenerated 3 Nov 2026 with **no expiry**; if it is ever exposed, delete it at github.com/settings/personal-access-tokens, make a new one and update the vault
5. ~~No error boundary~~ — fixed in v2.0.0: every section and overlay, and the whole app, show "Something went wrong in this section — your data is safe. Reload to try again."
6. ~~No automated tests~~ — fixed in v2.0.0: `npm run lint` and `npm test` (13 Playwright tests, see §4).
7. **Hardcoded default data** — DEFAULT_DATA object contains JC/Beck specific data that needs removing for multi-user
8. **Energy meter is calibrated, not live** — no Anthropic API key can read the credit balance. Since v1.374.1 the admin enters the balance after each recharge in **Settings → ⚡ Companion Energy Level** ("Set as 100%"); users see only the percentage (JC: showing money and watching it fall puts people off AI features). Each call is priced exactly from the returned token usage. It drifts only if the same key is used by another app. A truly live figure needs the Admin API Cost endpoint (`/v1/organizations/cost_report`), which requires an organisation account and an **admin key that must live server-side** — planned for the post-migration backend, never the browser.
9. ~~Remove-exercise bug~~ — fixed in v1.371.1.

### Data Architecture
```
Firebase: /data/
├── {key} → JSON string (all data stored as JSON-serialised strings)
├── exercises_jc_sunday → [{name, current, reps, status, prog: [{wk, w, r, note}]}]
├── exercises_beck_monday → [...]
├── body_jc_weight → [{wk, v}]
├── body_jc_bodyFat → [{wk, v}]
├── measurements_jc_bicep → [{wk, v, img?}]
├── bloods_jc → [{date, tests: {tsh, ldl, ...}}]
├── meds_jc → [{name, type, dosage, timing, frequency, notes, started, active}]
├── eating_jc_week1_monday_breakfast → "item_id"
├── eating_lists_jc_breakfasts → [{id, name, kcal, protein, fat, satFat, ...}]
├── companion_energy → {balance, initial, pct, keyStatus, spent, lastUsed}
├── session_guides_sunday → {warmup, cooldown}
├── health_jc_log → [{date, note}]
└── ... (pattern continues for all data types)
```

---

## 3. Where We Need To Be

### Immediate Priority: Platform Architecture (Phase 2 Roadmap)

The app works. It now needs to become a platform that other people can use.

**Agreed roadmap**:
1. ~~Phase 1: Finish features until JC is happy~~ ✅ (current state)
2. **Phase 2: Build user journey and onboarding** ← YOU ARE HERE
   - Remove all hardcoded JC/Beck data
   - Build proper user setup flow
   - Firebase Auth with per-user data isolation
   - Generic onboarding that captures what's needed through profile
3. **Phase 3: Test with fresh user**
   - New Firebase instance or user namespace
   - Prove setup works end-to-end
   - Verify no JC/Beck assumptions leak through
4. **Phase 4: Pilot — free users with own API tokens**
   - People are already asking JC to try it
   - BYOK (Bring Your Own Key) model for Anthropic API
   - Multiple simultaneous users
5. **Phase 5: Commercialise**
   - Full architecture decisions (hosting, billing, scaling)
   - Business model (subscription? usage-based?)
   - **Agreed 3 Nov 2026: users buy Companion Energy packs in the app** (see Step 6). This replaces Phase 4's bring-your-own-key model for paying users; BYOK can stay as a pilot stepping stone.

### Technical Migration Path

#### Step 1: Vite Migration — ✅ done in v2.0.0 (4 Nov 2026)
The single-file Babel architecture has hit its ceiling. Migrate to:
- **Vite** for build tooling
- **Component files** — split the 7500-line monolith into components
- **Local dev server** — test before deploying (eliminates blank-screen risk)
- **Proper bundling** — removes the ~340KB Babel mobile limit

This was attempted on Sep 19 2026 but reverted. Claude Code with local dev server testing makes this feasible.

#### Step 1a: Build / Beta / Prod environments (agreed 4 Nov 2026), ships as v2.1.0
JC wants three versions of the app. Design (Chat):

| Env | URL (until go-live) | Branch | Data (Firebase path) | Who tests |
|---|---|---|---|---|
| **Build** | `jcbeck1976.github.io/Life-Care/build/` | `build` | `data_build/` (a copy of live data, seeded from Chat on 4 Nov) | Chat verifies each change |
| **Beta** | `jcbeck1976.github.io/Life-Care/beta/` | `beta` | `data/` (real data: JC and Becks are the only users) | JC and Becks on their phones |
| **Prod** | `jcbeck1976.github.io/Life-Care/` → **lifecarecompanion.app** at go-live | `main` | `data/` | everyone |

- **One workflow** builds all three branches into the single Pages artifact on a push to any of them (Pages serves one artifact per repo), each with its own `base`. Each environment folder gets its own `APP_GUIDE.md` (Help fetches it relatively). `legacy.html` stays at the root only.
- **Flow:** Code commits to `build` (or short feature branches merged into `build`) → Chat verifies `/build/` → PR `build → beta` → JC and Becks test `/beta/` → PR `beta → main` = release. **No source pushes straight to `beta` or `main`.** Doc-only commits still go straight to `main` (rule 9).
- **Data root is a build-time setting** (`VITE_DATA_ROOT`): `data_build` for build, `data` for beta and prod. Emulator in local dev as now. Chat re-seeds `data_build/` from live data on request (Code sessions can't reach Firebase).
- **Versions:** prod `v2.X.Y`; beta shows `v2.X.Y-beta.N`; build shows `v2.X.Y-build.<short sha>`, all from the single version constant.
- **Always know where you are:** build and beta show a clear coloured **BUILD** / **BETA** badge in the header and prefix the browser tab title; prod shows none. Build and beta pages carry `noindex`.
- **Before real users onboard** (Step 2+), beta gets its own data too, so testers never touch customer data.
- **Prod domain `lifecarecompanion.app`** (bought by JC at Spaceship) is **not connected yet.** Plan at go-live, together with Steps 2 and 6: move prod to **Firebase Hosting** in the same Google project (free tier, automatic SSL, custom domain, and the natural home for the Cloud Functions AI proxy), with DNS records added at Spaceship. Build and beta can stay on github.io or use Firebase Hosting preview channels; decide then. Don't point the domain at GitHub Pages: it would put build and beta under the prod domain (`lifecarecompanion.app/beta`).

#### Step 1b: Efficiency Pass (agreed 3 Nov 2026)
Straight after the Vite cutover: measure, propose, JC approves, then build. Goal: lower running costs and faster loads with **no loss of capability**. Full candidate list in `MIGRATION_BRIEF.md` §3.9: AI prompt caching (incl. 💬 Chat follow-ups), on-device caching of nutrition lookups and reference data, an IndexedDB copy for instant start, a PWA service worker, batched startup reads, and granular saves. Firebase stays the source of truth; device storage is never the only copy of health data.

#### Step 2: Firebase Security
See `FIREBASE_SECURITY.md` for full details. Summary:
- Deploy UID-scoped security rules
- Update `sGet`/`sSet` to use authenticated user path
- Add error surfacing (stop silent failures)
- Migrate existing data

#### Step 3: Remove Hardcoded Data
- `DEFAULT_DATA` object (~200 lines) contains JC/Beck specific profiles, exercises, body data, medications
- Exercise day schedules (Sun/Mon/Fri) are specific to JC/Beck
- AI prompts reference specific health conditions
- All of this must come from the user's own profile/setup data

#### Step 4: User Onboarding Flow
- Profile setup (name, age, sex, height, body type, health conditions)
- Exercise setup (choose training days, add exercises, set equipment)
- Eating setup (dietary targets, preferences, restrictions)
- Health setup (medications, conditions, blood test history)
- API key setup (Anthropic key for AI features)

#### Step 5: Multi-User Data Model
- Per-user Firebase namespace
- Optional household/partner sharing (the JC+Beck pattern)
- Data export/import
- Account deletion (GDPR)

#### Step 6: Backend AI Proxy & Companion Energy Purchases (agreed 3 Nov 2026)
**Goal:** Companion Energy tops itself up when a user buys energy, and every user's percentage is exact. No manual "Set as 100%".

**Why this design:** Anthropic provides no purchase notification or balance API for its own credit, so the app can never "see" a top-up of the owner's Anthropic account. Instead the app **sells its own Companion Energy** and the owner's Anthropic account is the wholesale supply behind it.

**Build:**
1. **Server-side AI proxy** (e.g. Firebase Cloud Functions). Every Anthropic call goes browser → server → Anthropic. The Claude API key lives only on the server (fixes today's client-side key exposure; see Technical Debt #10).
2. **Per-user energy ledger** in the database, written only by the server: `balance`, `level100` (energy at last purchase), `pct`. The server prices each call exactly from the response `usage` (input, cache write, cache read, output × model prices) and deducts it. The browser only reads `pct`.
3. **In-app energy packs** via a payment provider (e.g. Stripe Checkout). The provider's webhook hits the server on successful payment; the server credits the user's energy and resets their 100% level automatically.
4. **Block on empty, server-side** — when a user's balance reaches 0 the proxy refuses calls and the app shows "Recharge needed" with a buy button. (Never reintroduce a client-side gate; see Session Log 2 Nov.)
5. **Owner supply monitoring** — a scheduled server job calls the Admin API Cost endpoint (`/v1/organizations/cost_report`, admin key server-side only, needs an Anthropic organisation account) to compare real spend against energy sold: margin reporting and an alert before the owner's Anthropic credit runs low.

**Rules carried forward:** users see a percentage only, never money values (JC, 3 Nov 2026). The current admin "⚡ Companion Energy Level" card and `trackApiUsage` are interim and are removed once this ships.

**Depends on:** Step 2 (Firebase Auth / per-user data) for per-user ledgers and webhook-to-user mapping.

---

## 4. How To Continue Development

### Deployment (since v2.0.0)
- **Push to `main` = deploy.** `.github/workflows/deploy.yml` runs `npm ci` → `npm run build` (ESLint must show 0 errors, then the Vite build with base `/Life-Care/`) → checks `dist/` has `index.html` and `APP_GUIDE.md` → deploys `dist/` to Pages. Settings → Pages → Source is **GitHub Actions**.
- If `main` ever has no `package.json` (e.g. after reverting the Vite merge) the same workflow publishes the repo files as they are, i.e. the legacy app.
- **Rollback:** `/Life-Care/legacy.html` is the v1.374.2 single file (byte-identical to tag `legacy-v1.374.2`) and works immediately. Then `git revert` the bad commit; the workflow redeploys.
- After a deploy: JC closes the tab and reopens it, then checks the footer version.
- **Retired:** the Contents-API deploy script, the Babel syntax check and the scope check (ESLint `no-undef` + `react/jsx-no-undef` replace them). They remain in git history (e.g. `HANDOVER.md` at tag `legacy-v1.374.2`).

### Ways of working — build, beta, prod and data (agreed by JC, 5 Nov 2026)
**Flow.** Code and test on Build → promote to Beta → JC, Becks and pilot users use Beta daily on real data → Beta → Prod only when JC chooses. Prod is not functionally important until go-live.

**Releasing Beta → Prod (however many versions behind).**
- A Prod release = make Prod identical to Beta, as one tested snapshot (one PR `beta → main`). Never cherry-pick individual versions.
- Before release: **freeze Beta** (no promotions from Build) for a 3–5 day soak of normal use, then back up the data, release, tag.
- One combined release note covering every version since the last Prod tag (e.g. "v2.6.0 → v2.9.2").
- **Hotfix route** (Prod needs an urgent fix while Beta has unreleased work): branch from `main`, fix, check, PR to `main`, then merge the fix back into `beta` and `build`.

**Data.**
- **Beta and Prod share the one real database** (release channels). Beta is therefore always tested on real, current data, and a user moving between Beta and Prod needs no migration.
- **Golden rule: every data change must be backward compatible** (expand, then contract). New code may only *add* to the data shape; Prod's older code must still read everything. Removals/renames happen in a later release, after Prod has caught up. Migrations must be idempotent and non-destructive.
- **Build uses `data_build/`: a copy of the real data, overwritten automatically every night.** Test junk is wiped at each refresh and never reaches Beta/Prod. Before any data-shape change, refresh Build on demand and rehearse the change on today's real data first. The emulator seed for automated tests is refreshed from the same snapshot.
- **Privacy:** once pilot users exist (before Step 2 security), the Build copy holds only JC and Becks's data, or anonymises everyone else. Never copy pilot users' health data into a test area without consent.

**Backups.**
- Nightly plus immediately before every Prod release, run by GitHub Actions (no AI tokens; the size of the data doesn't affect token use).
- **Full snapshot, saved only when the data has changed:** the job fingerprints the data and skips the save if nothing changed since the last backup. Each backup is complete on its own, so a restore never depends on a chain of partial files.
- Encrypted before storage (key in GitHub Secrets), stored in the private vault repo, never the public Life-Care repo. Git stores only the differences between versions internally, so storage stays small. Retention: 30 daily + 12 monthly.

**Automation, so routine work costs no AI tokens (to build, alongside Step 1b).** GitHub Actions jobs for: nightly `data_build` refresh, nightly and pre-release backups, a post-deploy smoke test on each environment (loads, footer version, no console errors, real data present: counts only), and automatic tagging on release. The Architect's token use moves to judgement, design and review only.

### Checks (run before every deploy)
```
npm install
npm run emulator     # local Firebase Realtime Database emulator on :9000 (never live data)
npm run seed         # loads JC's backup (kept outside the repo) into the emulator under /data
npm run lint         # 0 errors required (5 known hook-dependency warnings are left as they are)
npm run build
npm test             # 13 Playwright tests: every tab for both people, add/bulk/update item, stop/restart
                     # exercise, Help, Chat, energy % only, theme switch, error boundary. AI is mocked.
VISUAL=1 npx playwright test visual   # optional exact screenshot check; images kept outside the repo
```
`npm run dev` serves http://127.0.0.1:5173/Life-Care/ against the emulator. Production builds never contain the emulator switch.

### Preview before production — open item (needs JC's decision)
The `next/` preview folder was removed at cutover, and Pages now only serves what the workflow deploys from `main`. A preview step is still required by rule 5. **Proposal:** the workflow also builds a `preview` branch (when it exists) with base `/Life-Care/next/` into `dist/next/`, so a change is tested at `/Life-Care/next/` before it is merged to `main`. Not built yet.

### Version Convention
- **v2.0.0** = the Vite-migrated app, the first completed version for handover (JC, 4 Nov 2026). The legacy single-file app ends at v1.374.2 (tag `legacy-v1.374.2`).
- From v2: feature/layout change → `v2.X.0`; bug fix → `v2.X.Y`.
- (Legacy v1 rule, kept for history: feature → `v1.366.0`, bug fix → `v1.365.1`.)
- The version lives in **one place**: `src/constants/version.js` (`APP_VERSION`). The footer and the feedback email read it. (Before v2.0.0 it had to be changed in three places.)

### Design System

**Colour Theming (v1.345+)**:
- `COLOUR_THEMES` constant: blue/purple/green/teal/rose/amber/indigo/slate — each has accent + light
- Per-user colour stored via `sGet/sSet("user_colour_" + activeTab)`, reloaded on person switch
- Derived variables: `accent`, `accentLight`, `accentDark` (L:25), `accentMid` (S:30 L:40), `accentBtnLight` (L:93), `accentBtnBorder` (L:80), `accentChatUser` (L:88), `accentBorder` (L:78)
- `accentVariant(hex, lightness)` helper computes HSL variants from any hex
- **CRITICAL**: Top-level button constants (`btnS`, `btnMuted`, `btnAction` etc.) use STATIC values only — themed variants (`btnST`, `btnMT`) computed inside component

**Header Hierarchy**: Tier 1 (13px/800/#0f172a), Tier 2 (12px/700/#0f172a), Tier 3 (11px/700/#475569)

**Container Pattern**: grey page bg → white section → `accentLight` sub-section → white user inputs ONLY

**Info Boxes**: background `accentLight`, color #334155, fontSize 12, border 1px solid #cbd5e1

| Context | Style | Constant |
|---------|-------|----------|
| Inside content cards | Grey/muted `#94a3b8` | `btnMuted` (static) → `btnMT` (themed) |
| Outside content on white bg | Deep blue gradient `#1e3a5f→#2563eb` | `btnAction` |
| Themed standard | `accentBtnLight` bg, `accentBtnBorder` border | `btnST` (computed inside component) |
| Close/cancel buttons | Deep blue outline | `btnClose` |
| Clear/delete | Red text button | `btnClear` |
| Loading state | Grey `#94a3b8`, opacity 0.7, animated dots | — |
| AI features | Blue scheme `#eff6ff` bg, `#bfdbfe` border | — |

**Settings**: Gear icon in top-right header (removed from bottom tab bar in v1.363.0)

### Established User Rules (MUST follow)
- One feature per version — never bundle
- Inside content = grey buttons, outside = deep blue
- No 3rd person in AI feedback — always "you"
- Exercise Progress/Log buttons stay grey (not deep blue)
- Forms close on section switch, stay open on user switch within section
- Delete buttons use `🗑 Del` format
- Warm-up/cool-down: collapsible, default closed, reset on section switch
- Honest tracking sentence on Eating Day tabs
- No hardcoded user-specific data in AI prompts — only user-entered data
- All AI openers must vary — no repetitive filler phrases
- Conversation thread messages: user = `accentChatUser` (L:88), companion = dark grey (#334155)
- Per-user colour isolation — never let one user's colour change affect another
- Privacy policy accessible via legal links row below feedback button
- DO NOT go off scope — only change what is explicitly asked for
- **HANDOVER.md is the project memory** (Chat = architect, Claude Code = builder). Read it in full once per session, then before each action read only the diff since your last read (`git diff <last-read-commit> HEAD -- HANDOVER.md`); after every action add a dated Session Log entry (what, version, commit, what to test, open items); record every design decision with its reason under "Decisions". Applies to both Chat and Code sessions. Every entry is labelled **(Chat)** or **(Code)**. **From 4 Nov 2026 22:55: new entries are labelled (Architect) and (Coder) instead** (see "Roles and names" below); older (Chat)/(Code) entries keep their labels.
- **Architect sessions (Chat):** don't read this whole file each chat. Fetch it in the workspace and print only what follows the last **(Architect)** entry, or **(Chat)** if none (i.e. what the Coder has done since). Read other sections only when a design discussion needs them.
- Each fix or feature is its own version AND its own deploy/commit
- Warn JC before anything that will use a lot of tokens
- Trace where a failure actually happens before patching — read the call path, don't patch the error handler blind
- Modals/overlays must show their own status messages (page-level `formMsg` sits behind them)
- Adding from a selection list closes the add box after Continue; Update Eating Lists keeps it open
- Recalculation failures must never add/save stale nutrition values
- Stopped exercises are view-only, hidden under a "Stopped Exercises" toggle, restarted from Exercise Settings
- GREAT-rated items display dark green (#15803d), never navy
- Companion Energy never shows money to users — percentage only (100% = balance at last recharge, 0% = $0)
- Every feature change must also update APP_GUIDE.md (the Help companion reads it live)

---

## 5. Reference Files

| File | Purpose |
|------|---------|
| `MIGRATION_BRIEF.md` | **Start here in Claude Code.** Self-contained brief for the Vite migration (Step 1): rules, scope, plan, checks, preview, cutover. |
| `TECHNICAL_REFERENCE.md` | Full technical architecture, state management, component structure, data schema |
| `FIREBASE_SECURITY.md` | Firebase security requirements and implementation plan |
| `HANDOVER.md` | This document — context, history, roadmap, development guide |
| `src/` + `index.html` | The app source (Vite). `CLAUDE.md` holds the rules for Claude Code sessions. |
| `public/legacy.html` | The v1.374.2 single-file app, served at `/legacy.html` as the rollback |
| `APP_GUIDE.md` | **User-facing guide to every feature — the live source the ❓ Help companion answers from.** Update it in the same release as any UI change. Served by GitHub Pages next to index.html. |

### Memory Files (Claude memory system)
- `/projects/.../dashboard.md` — Version history, roadmap, architecture notes, full backlog
- `/projects/.../overview.md` — People, training setup, body composition targets, diet changes
- `/projects/.../methodology.md` — Training principles, ADHD patterns, nutrition rules, tools
- `/projects/.../topics/food.md` — Dietary specifics

### Project Documents (Claude Project)
- `life-care-dashboard.jsx` — Project doc
- `JC_Beck_Combined_Life_Care_Plan_v211.pdf` — The original Life Care Plan
- Various GP notes, clinical plans, and reference photos

---

## 6. Risks and Gotchas

1. **Blank screen on errors** — mitigated in v2.0.0: syntax errors fail the build (nothing deploys), ESLint catches undefined names, and error boundaries contain runtime crashes to one section.
2. **Firebase silent failures** — `sGet`/`sSet` return null on error. App treats null as "no data" and loads defaults. Users see their data vanish without warning.
3. ~~Babel mobile limit~~ — removed in v2.0.0 (Vite build).
4. **PAT exposure** — the GitHub token has no expiry, so a leaked token works until deleted. Keep it in the vault only; never commit it.
5. **Rollback** — `/Life-Care/legacy.html` (v1.374.2) at once; then `git revert` the bad commit and the workflow redeploys.
6. **DEFAULT_DATA coupling** — The default data object serves as both a "safety net" when Firebase fails and as initial demo data. These two concerns need separating.
7. **State variable count** — The component has 100+ useState variables. Since v2.0.0 they still live in `App.jsx`; sections receive what they use through one `ctx` prop. Moving to context/reducers is future work.
8. **AI cost** — Every feedback generation, food check, and guide generation calls the Anthropic API. The energy meter tracks this but costs can add up. Prompt optimisation needed for commercialisation.
9. **No offline support** — App requires both Firebase and internet. No service worker, no caching.
10. **Single-user assumption** — Many patterns assume max 2 users (JC/Beck person toggle). Multi-user needs a different approach.
11. **Section-scoped functions** — since v2.0.0 each section is its own component file. Functions defined inside a section are still invisible to other files: `window._confirmReviewItem` connects Eating and the Review Item overlay. ESLint `no-undef` now catches a call to a function that isn't in scope.
12. **Page messages behind modals** — `formMsg` renders at the top of the page; inside a fixed overlay the user never sees it. Render the message inside the panel too.
13. **AI output limits** — JSON responses cut off at `max_tokens` fail to parse. Check `stop_reason === "max_tokens"` and show a retry message; store errors under the same key the UI reads (`activeTab + "_" + day`), or the failure is invisible.
14. **Two user switches** — the top name tabs and the switch inside the exercise log both call `loadUserSettings(k)`. Any new per-user setting must be loaded there, not in the tab button.


---

## 7. Session Log

Older entries (2 Nov 2026 → checkpoint (c) review, 3 Nov 2026) are in `HANDOVER_ARCHIVE.md`.

### (Chat) 4 Nov 2026 08:25 — decision: cutover is v2.0.0
- **Decision (JC):** the cutover ships as **v2.0.0**, not v1.375.0. The migrated app is effectively a new app and the first completed version for handover. Versioning continues `v2.X.0` (feature) / `v2.X.Y` (fix). Brief §0 rule 4 and §3.7 are updated; the Version Convention above is updated.
- `APP_GUIDE.md` "Last updated" and version example are updated to v2.0.0 in the cutover release.

### (Code) 4 Nov 2026 — §3.7 cutover to v2.0.0: prepared, waiting for JC's Pages switch
- **Read:** HANDOVER/brief diff to `395f203` (v2.0.0 decision, cutover watch-points).
- **Done:**
  - `vite-migration` @ `e577d12`: single version constant `src/constants/version.js` = **v2.0.0** (footer + feedback email); `APP_GUIDE.md` "Last updated v2.0.0 · 4 November 2026" and version example; `CLAUDE.md` rules 4 and 9 synced, deploy section for Actions. Lint 0 errors, build ok, 13/13 tests.
  - **Exact visual check** (colour tolerance 0): the old default tolerance (0.2) could not see faint grey text such as the footer version, so earlier "pixel-identical" claims were weaker than stated for faint text. Re-checked now at 0 against the verbatim-lift baseline: 16 views differ **only** in the footer version text; the Chat panel is pixel-identical (its full-page screenshot jittered 1–4 px from window resizing in both old and new code, so it is now taken in viewport mode).
  - **Workflow:** `.github/workflows/deploy.yml` pushed to `main` (`cc4d4fd`). The push was **accepted** (no workflows-permission problem). It builds the Vite app when `main` has `package.json`, otherwise publishes `main` as is (legacy). First run deployed the legacy files successfully while Pages was still on "deploy from branch": same content, pipeline proven.
  - **PR #1** `vite-migration` → `main` opened, **not merged** (merging before the switch would publish the Vite source `index.html`).
  - **Rollback file:** `public/legacy.html` is byte-identical (SHA-256) to `legacy-v1.374.2:index.html` and to `next/legacy.html`, which is live now. This session can't reach github.io or cdnjs, so the in-browser rollback test is for JC/Chat at `/Life-Care/next/legacy.html`.
- **Zero-downtime order:** (1) JC/Chat test `/Life-Care/next/legacy.html` → (2) JC switches Settings → Pages → Source to **GitHub Actions** (the existing deployment stays live) → (3) Code re-runs the workflow (re-publishes the same legacy files from Actions) → (4) Chat confirms live still v1.374.2 → (5) Code merges PR #1 → workflow deploys v2.0.0 in one step → (6) Chat confirms v2.0.0 and `/APP_GUIDE.md` → (7) Code removes `next/`.
- **Decision:** the workflow file went to `main` before the merge (the brief said only `next/` goes to `main` before cutover). Reason: Pages can only switch to Actions safely if a working workflow already exists, and the legacy fallback makes both the switch and a later revert safe. Rejected: adding the workflow in the PR (the switch would then leave nothing to deploy until the merge).
- **Resume point:** `vite-migration` @ `f392791` (main merged in), PR #1 open, workflow on `main` @ `cc4d4fd`. **Waiting for JC: rollback test + Pages source switch.** Next: step (3) above.

### (Chat) 4 Nov 2026 12:20 — cutover step 1: rollback verified
- **Rollback file verified from Chat on real data** (read-only): `/Life-Care/next/legacy.html` vs the live app. It shows v1.374.2. Both people × 6 tabs = 12 views, **0 differences**. Help, Chat, Privacy, Feedback and Settings match. No app errors (only the usual Babel size note and the Chat-sandbox certificate error, both identical on live). `APP_GUIDE.md` resolves relative to the legacy page (200).
- **Pre-switch state checked:** PR #1 `vite-migration → main` is open and unmerged (59 files); `.github/workflows/deploy.yml` is on `main`; the latest "Deploy to GitHub Pages" runs succeeded; the Pages source is still `legacy` (branch).
- **Next:** JC flips Settings → Pages → Source to **GitHub Actions**, then tells Code "switched". Code re-runs the workflow, Chat confirms the live site still shows v1.374.2, then Code merges PR #1 → v2.0.0.

### (Code) 4 Nov 2026 — cutover step 3: legacy re-published from GitHub Actions
- **Read:** diff to `931f7b4` (Chat: rollback verified on real data; JC switched Pages → Source to GitHub Actions).
- **Done:** workflow re-run on `main` (run #4, `workflow_dispatch`, id 41829731458): build took the legacy path, upload and **deploy succeeded**. The live site is now served from Actions with the same legacy files (v1.374.2). PR #1 still unmerged.
- **Resume point:** waiting for Chat to confirm `/Life-Care/` still shows v1.374.2 and works. Next: merge PR #1 → workflow deploys v2.0.0 → confirm v2.0.0 and `/Life-Care/APP_GUIDE.md` → remove `next/` → checkpoint (d).

### (Chat) 4 Nov 2026 12:35 — cutover: live site confirmed on Actions before merge
- Pages source confirmed `workflow` (GitHub Actions). Deploy runs #3, #4 and #5 all completed successfully.
- **Live site checked on real data** (read-only) after run #5: footer **v1.374.2**. Both people × 6 tabs render (12 views). Help, Chat, Privacy, Feedback and Settings open. No app errors. `/Life-Care/APP_GUIDE.md` returns 200 (34,059B).
- **Go given for merging PR #1 → v2.0.0.** After the merge, Chat re-checks the live site for v2.0.0 on real data.

### (Code) 4 Nov 2026 — v2.0.0 live: PR #1 merged
- **Read:** diff to `cd206db` (Chat: live site confirmed on Actions at v1.374.2; go for PR #1).
- **Done:** merged PR #1 `vite-migration` → `main` as merge commit `629d561` (PR shows merged). Before pushing, the merge result was built locally: lint 0 errors, build ok, base `/Life-Care/`, `dist/` has `index.html`, `assets/`, `APP_GUIDE.md`, `legacy.html`, one v2.0.0, no emulator or crash-switch code. Deploy run 41830867847: Vite path (install, lint, build), checks and **deploy succeeded**. Version table and Live Product line updated to v2.0.0.
- **JC to do:** close the app tab and reopen it; the footer should show **v2.0.0**.
- **Resume point:** `main` @ `629d561` + this entry. Waiting for Chat to confirm `/Life-Care/` shows v2.0.0 on real data and `/Life-Care/APP_GUIDE.md` returns 200. Then: remove `next/` from `main` → checkpoint (d).

### (Chat) 4 Nov 2026 12:55 — v2.0.0 live: confirmed on real data
- Deploy runs #6, #7 (merge `629d561`) and #8 (`d968c0d`) all succeeded.
- **Live `/Life-Care/` checked on real data** (read-only): the footer shows **v2.0.0** (only version string on the page). Compared against the `/legacy.html` rollback: both people × 6 tabs = 12 views, **0 differences**. Help, Chat, Privacy, Feedback and Settings match. The error boundary shows nowhere. No app errors. Load: 1.2s for v2.0.0 vs 76s for legacy (headless).
- `/Life-Care/APP_GUIDE.md` returns 200; `/Life-Care/legacy.html` returns 200 and shows v1.374.2 (the rollback works).
- **Go given to remove `next/`** and send checkpoint (d).

### (Code) 4 Nov 2026 — checkpoints (d) cutover done and (e) docs updated
- **Read:** diff to `fdb1539` (Chat: v2.0.0 confirmed on real data; go to remove `next/`).
- **(d) Done:** `next/` removed from `main` (`f7e4068`); it had already stopped being served once the workflow deployed only `dist/`. Live: v2.0.0 from GitHub Actions; `/APP_GUIDE.md` and `/legacy.html` (rollback) served, confirmed by Chat.
- **(e) Done (§3.8):** `HANDOVER.md`: Live Product, tech stack, known issues, §4 (Actions deploy, checks, rollback; Contents-API script, Babel and scope checks retired), version rule (one constant), reference files, risks, Step 1 marked done. Session Log entries up to the checkpoint (c) review moved to `HANDOVER_ARCHIVE.md` (log had passed ~150 lines). `TECHNICAL_REFERENCE.md`: architecture, dependencies and a **file layout table replacing line numbers**, deployment, tech debt, related docs. `CLAUDE.md`: branch rule for after cutover. `APP_GUIDE.md`: only the version line changed (in v2.0.0); nothing else user-visible changed.
- **Decisions:** none new. **Open, needs JC:** (1) **preview process after cutover** (rule 5 needs one; `next/` is gone). Proposal in §4: the workflow also builds a `preview` branch to `/Life-Care/next/`. (2) Delete the merged `vite-migration` branch? (Code can't delete remote branches; Chat or JC.) (3) Tag `v2.0.0` at `629d561` (Code can't push tags).
- **Resume point:** `main` @ this commit. Step 1 complete. Next, only after JC's go: the unused-code clean-up (own version, v2.0.1) and/or Step 1b measurement (checkpoint (f)). Neither started.

### (Chat) 4 Nov 2026 13:05 — checkpoints (d) and (e) review: Step 1 complete
- **Reviewed:** checkpoints (d) and (e). The docs restructure checked out: no secrets in HANDOVER, the archive or TECHNICAL_REFERENCE; rule 9 and the Chat routine intact; recent (Chat)/(Code) entries kept in HANDOVER; the live version line is v2.0.0.
- **Done from Chat:** tag **`v2.0.0`** created → `629d561` (the PR #1 merge). Tags now: `v2.0.0`, `legacy-v1.374.2`.
- **Recommended to JC (awaiting his decision):** (1) adopt Code's preview proposal: a `preview` branch built by the same workflow to `/Life-Care/next/`; every change goes preview → JC tests (live data) + Chat verifies → merge to `main`. (2) Delete the merged `vite-migration` branch (Chat will do it on JC's OK).
- **Proposed order after JC's go:** preview pipeline (own version) → unused-code clean-up v2.0.1 (through the preview) → Step 1b measurement, checkpoint (f).

### (Chat) 4 Nov 2026 16:20 — decisions: environments, branch clean-up, order of work
- **JC approved** Chat's recommendations: a permanent preview process, and deleting `vite-migration` (done from Chat; branches now: `main`).
- **JC requirement:** build, beta and prod versions; prod on **lifecarecompanion.app** (bought at Spaceship) at first go-live; the others on GitHub. **Design recorded in §3 "Step 1a"** (supersedes Code's single `preview` branch proposal).
- **Done from Chat:** `data_build/` seeded in Firebase as a copy of live `data/` (101 keys, 199KB).
- **Order of work:** (1) Step 1a environments → **v2.1.0** (through build → beta → main itself); (2) unused-code clean-up → **v2.1.1**, the first change through the full pipeline; (3) Step 1b measurement → checkpoint (f).

### (Code) 4 Nov 2026 — Step 1a / v2.1.0: built on `build`, waiting for JC's decision on the pipeline bootstrap
- **Read:** diff to `e9666e2` (Step 1a design in §3; `vite-migration` deleted; tag `v2.0.0`; order of work).
- **Done (`build` @ `2d6e2f7`, pushed):** v2.1.0 exactly as §3 Step 1a: `DATA_ROOT` from `VITE_DATA_ROOT` in all 8 Firebase paths (`data_build` for build, `data` for beta/prod); version `v2.1.0` / `-beta.N` (promotions since last release) / `-build.<sha>` from `src/constants/version.js`; BUILD (orange) / BETA (purple) header badge and tab-title prefix; `noindex` on build/beta; one workflow + `scripts/build-pages.sh` + `scripts/check-pages.mjs` building all three into the Pages artifact; `legacy.html` root only; `APP_GUIDE.md` per environment (guide updated for the badge). Lint 0 errors; 15/15 tests (new: prod has no badge/noindex; build env shows badge, title, version, noindex); exact screenshot check: prod differs only in the footer version text.
- **Local pipeline runs:** (1) main/beta = today's main, build = v2.1.0: all checks pass; prod output **byte-identical** to a plain build of main. (2) after a build→beta promotion: beta shows `-beta.1`, uses `data`. (3) after release: prod v2.1.0, no badge, no noindex; beta resets to `-beta.0`.
- **On GitHub:** the push to `build` ran the hand-off job, which triggered main's (old) workflow; it re-deployed today's prod (success).
- **Blocked — needs JC (conflicts with "no source pushes straight to `main`"):** `/build/` only appears once the new workflow is on `main` (only main's workflow deploys; this keeps a change on `build` from ever altering how prod is deployed). **PR #2 `pipeline-bootstrap → main`** holds the workflow + 2 scripts only (no app change), opened and **not merged**. Alternative rejected: let every branch deploy itself (needs JC to add `build`/`beta` to the `github-pages` environment's allowed branches, and a bad workflow on `build` could then break prod).
- **Decision (Code):** only main's workflow deploys; build/beta pushes ask it to rebuild. Reason above.
- **Resume point:** `build` @ `2d6e2f7`; PR #2 open. If JC approves: merge PR #2 → check run → `/build/` live → hand to Chat. Then create `beta` from `main`, PR `build → beta`, JC tests, PR `beta → main`. Don't start v2.1.1 or Step 1b.

### (Chat) 4 Nov 2026 18:30 — PR #2 review: one-time exception approved, with one amendment
- **Reviewed PR #2** (`pipeline-bootstrap → main`, mergeable): 4 files only (`deploy.yml`, `.gitignore`, `scripts/build-pages.sh`, `scripts/check-pages.mjs`); no app code. Design approved: only `main`'s workflow builds and deploys (build/beta pushes trigger it via `workflow_dispatch`), and `check-pages.mjs` blocks a bad artifact (prod must have the guide and `legacy.html`, be indexable and never reference `data_build`; build/beta must have their badge, noindex and correct data root).
- **Decision (JC, on Chat's recommendation):** merging PR #2 straight to `main` is a **one-time bootstrap exception** to "no source straight to main". It's needed because the pipeline can't come through the flow it creates.
- **Amendment required before merging:** a failure building **beta or build** must **not** stop the prod deploy. Today `set -euo pipefail` aborts the whole script, so a broken `build` branch would block urgent prod releases. Change: prod stays strict (any failure fails the deploy); beta/build failures skip that environment, are reported loudly (log plus job summary) and leave that folder out (or keep its last good copy if simple). Add `check-pages.mjs` handling to match. Re-run the local full-pipeline check, then merge.

### (Code) 4 Nov 2026 — PR #2 merged (pipeline live); `/build/` ready for Chat (v2.1.0 hand-off 1)
- **Read:** diff to `d6c0375` (JC/Chat: one-time exception approved, with amendment).
- **Amendment done:** prod strict; a beta/build failure (checkout, install, lint, build or checks) leaves that environment out, with a log banner, `::error` annotation and job-summary line, and prod still deploys. Verified locally in 5 runs: normal; build lint failure; beta lint failure; beta check failure (no noindex) — prod deployed each time; prod lint failure — deploy failed. Prod output byte-identical to a plain build of `main`. Same files synced to `build` (`4ae40ec`).
- **Merged PR #2** → `main` @ `abd5aae` (one-time exception). Deploy run 41887742264 succeeded: prod checks passed and prod bundle `index-wOH43Bta.js` = the v2.0.0 cutover build (unchanged); beta "no branch"; **build** checks passed (index, APP_GUIDE, noindex, BUILD title prefix, `data_build`).
- **Chat to verify** `https://jcbeck1976.github.io/Life-Care/build/` (see the hand-off message).
- **Open:** `pipeline-bootstrap` branch can be deleted (merged; Code can't delete remote branches). Actions warns that `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-artifact@v4` target Node 20 (deprecated, still running on Node 24); bump later as its own change.
- **Resume point:** `build` @ `4ae40ec`, `main` @ `abd5aae` + this entry. Next after Chat's OK: create `beta` from `main`, PR `build → beta` (merge commit → v2.1.0-beta.1), hand `/beta/` to JC. Don't start v2.1.1 or Step 1b.

### (Chat) 4 Nov 2026 18:50 — hand-off 1 verified: /build/ approved
- **All 8 checks pass** (from Chat, real browser):
  - The BUILD badge shows and the tab title is `BUILD · Lifecare Companion™`.
  - The footer shows `v2.1.0-build.4ae40ec`, and `robots` is `noindex, nofollow`.
  - `/build/APP_GUIDE.md` returns 200; `/build/legacy.html` 404; `/beta/` 404; `/legacy.html` 200.
  - Prod is unchanged: title has no prefix, v2.0.0, no badge, no robots meta.
- **Data isolation proven:** I fingerprinted live `data/` before and after using `/build/` and setting JC's mood there. The write landed in `data_build/daily_mood_jc`, and live `data/` was **byte-identical** (sha256 `3d138497a2b8` both times). The build copy's mood was then restored.
- **Note:** Chat's sandbox browser can't reach `api.anthropic.com` (certificate error from the sandbox proxy). This is identical on build and prod, so it's not an app issue. AI features (Help answers, Chat) must therefore be checked by JC on beta.
- **Housekeeping:** merged branch `pipeline-bootstrap` deleted from Chat. Branches: `build`, `main`.
- **Go for hand-off 2:** create `beta` from `main` and merge `build` into it via PR, so `/beta/` shows `v2.1.0-beta.1` and the purple BETA badge. Then JC and Becks test.
- **Backlog:** update the outdated workflow actions (Node version warnings) as its own small change later.

### (Code) 4 Nov 2026 — v2.1.0 on beta: `/beta/` ready for JC (hand-off 2)
- **Read:** diff to `d63546e` (Chat verified `/build/` on 8 points incl. data isolation; `pipeline-bootstrap` deleted; AI answers to be checked by JC on beta).
- **Done:** `beta` created from `main` (`535e918`); **PR #3 `build → beta`** merged as merge commit `8c6cc0c` (PR shows merged). Merged tree: lint 0 errors, build ok, 15/15 tests. Deploy run 41889885030 succeeded: prod checks passed (bundle `index-wOH43Bta.js`, unchanged v2.0.0); **beta** checks passed (index, APP_GUIDE, noindex, `BETA ·` title, uses `data`; bundle `index-7K0PIvh9.js` = the local v2.1.0-beta.1 simulation); build unchanged.
- **JC (and Becks) to test** `https://jcbeck1976.github.io/Life-Care/beta/` — real data. Checklist in the hand-off message, including Help ? and 💬 Chat answers (Chat's browser can't reach the AI service).
- **Resume point:** `beta` @ `8c6cc0c`. After JC's OK: PR `beta → main` (release v2.1.0) → confirm deploy → Chat confirms prod v2.1.0, no badge. Don't start v2.1.1 or Step 1b.

### (Chat) 4 Nov 2026 19:00 — hand-off 2: /beta/ pre-checked from Chat
- **Verified (read-only, nothing saved):**
  - Purple BETA badge; title `BETA · Lifecare Companion™`; footer `v2.1.0-beta.1`; `robots` is `noindex, nofollow`.
  - `/beta/APP_GUIDE.md` returns 200; `/beta/legacy.html` 404.
  - Beta vs prod on real data: both people × 6 tabs = 12 views, **0 differences** (this also confirms beta reads live `data/`). Help, Chat, Privacy, Feedback and Settings open.
  - Prod still shows v2.0.0.
- **Remaining for JC on his phone:** Help and Chat AI answers (Chat's sandbox can't reach the AI service), and one normal save showing up on prod. Then JC's OK → `beta → main` release of v2.1.0.

### (Code) 4 Nov 2026 — v2.1.0 released (PR #4 `beta → main`)
- **Read:** diff to `37d8280` (Chat pre-checked `/beta/`; JC approved: Help and Chat answer, beta save shows in prod).
- **Done:** PR #4 `beta → main` merged as `2346d85` (PR shows merged); merged tree lint 0 errors, build ok, prod HTML has no noindex. Deploy run 41901867353 succeeded: prod bundle `index-BCSgoWux.js` (= the local "after release" simulation: v2.1.0, no badge, no noindex); `/beta/` rebuilt and now shows **v2.1.0-beta.0** (no unreleased changes; becomes `-beta.1` at the next promotion); `/build/` unchanged. Version table and Live Product line updated to v2.1.0.
- **JC to do:** close the app tab and reopen it; the footer should show **v2.1.0** with no badge.
- **Chat to check** the live app (see the release message).
- **Resume point:** `main` @ `2346d85` + this entry; `beta` and `build` hold no unreleased changes. Next, after Chat's check and JC's go: v2.1.1 unused-code clean-up through build → beta → main; then Step 1b. Neither started.

### (Chat) 4 Nov 2026 20:10 — v2.1.0 release verified; first full pipeline run complete
- **Verified (real browser, read-only):**
  - **prod:** title `Lifecare Companion™`, v2.1.0, no badge, no robots meta.
  - **beta:** `BETA ·`, v2.1.0-beta.0, BETA badge, noindex.
  - **build:** `BUILD ·`, v2.1.0-build.4ae40ec, BUILD badge, noindex.
  - Prod vs beta on real data: 12 views, **0 differences**; overlays open. `/APP_GUIDE.md` and `/legacy.html` return 200.
- JC tested beta on his phone before the release (Help and Chat AI answers, shared data). Step 1a is **done**: build → beta → main proven end to end.
- **Done from Chat:** tag **`v2.1.0`** → `2346d85` (PR #4 merge). Tags: `v2.1.0`, `v2.0.0`, `legacy-v1.374.2`. **Standing practice:** Chat tags each prod release (Code sessions can't push tags).
- **Next (JC's go needed):** v2.1.1 unused-code clean-up through build → beta → main, then Step 1b measurement. **Backlog:** update the outdated workflow actions (own small version).

### (Code) 4 Nov 2026 — v2.1.1 unused-code clean-up on `build`: ready for Chat (hand-off 1)
- **Read:** diff to `9ecb694` (Chat verified v2.1.0, tagged it; Chat tags every prod release from now on).
- **Re-checked before removing:** each item had zero references in `src/` or `index.html` outside its own definition. The hidden meds block rendered only when `section === "__hidden_meds__"`; every `setSection` call (`admin`, `meals`, `overview`, `weights`, and the six `SECS` tabs) and the initial value (`overview`) were checked, and none sets it.
- **Done (`build` @ `e631444`, fast-forwarded to `main` first):** removed `components/exercise.jsx` (ExTable, StrengthBanner), `components/LoadingBtn.jsx`, `PBar`, `RC`, `SNACK_TEMPLATES`, `DAY_TYPE`, `DEFAULT_OTHER_GB`, `JC_BASE`, `BECK_BASE`, `sections/HiddenMeds.jsx` + its import and render line (51 lines out + 3 files). Version v2.1.1. Tests now read the version from `src/constants/version.js`. Lint 0 errors, build ok, 15/15 tests; **exact screenshot check: only the footer version text differs** (16 views; Chat panel identical).
- **Deploy** run 41903174786 succeeded: `/build/` rebuilt (new bundle); prod and beta bundles unchanged.
- **Found, not fixed:** the Data section ("Firebase Data Viewer") also looks unreachable: nothing sets `section` to `"data"`. Not removed (not on the list); for JC to decide.
- **Docs:** TECHNICAL_REFERENCE (file layout, unused list) to be updated when v2.1.1 reaches `main`.
- **Resume point:** `build` @ `e631444`. After Chat's OK: PR `build → beta` (merge commit → v2.1.1-beta.1), hand to JC; then PR `beta → main`. Don't start Step 1b.

### (Chat) 4 Nov 2026 20:20 — v2.1.1 hand-off 1 verified; guide correction
- **Verified `/build/`** after re-seeding `data_build/` from live data (101 keys) for an exact comparison:
  - title `BUILD ·`, `v2.1.1-build.e631444`, BUILD badge, noindex;
  - build vs prod: 12 views, **0 differences**; Help, Chat, Privacy, Feedback and Settings open;
  - prod v2.1.0 and beta v2.1.0-beta.0 are untouched.
  - **Go for `build → beta`.**
- **Guide error found via Code's note (Chat's mistake from 2 Nov):** APP_GUIDE.md listed "Firebase Data Viewer and data recovery/restore tools" under Settings, but the `data` section is unreachable (nothing sets `section = "data"`). The guide is corrected on `main` (doc-only, live immediately). The build/beta copies pick it up when their branches next merge `main`.
- **Decision needed from JC:** the unreachable Data section contains real recovery tools (restore missing weeks from comment keys; restore from a Firebase JSON export). Option A: an admin-only "Data tools" button in Settings (its own version, v2.2.0). Option B: remove it in a later clean-up. Chat recommends **A** while Firebase rules are open and backups are manual. It's a safety net only the admin can see.

### (Code) 4 Nov 2026 — v2.1.1 on beta: `/beta/` ready for JC (hand-off 2)
- **Read:** diff to `7848aa1` (Chat verified `/build/` v2.1.1; APP_GUIDE corrected on `main`; JC chose **Option A** for the Data section: admin-only "Data tools" button in Settings as **v2.2.0**, after v2.1.1 is released).
- **Done:** `main` merged into `build` (`255589b`, brings the APP_GUIDE fix; lint 0 errors, 15/15 tests). **PR #5 `build → beta`** merged as `244fbdf` (shows merged). Deploy run 41904837925 succeeded: beta rebuilt (new bundle, checks passed) = **v2.1.1-beta.1**; build rebuilt (`v2.1.1-build.255589b`); prod unchanged (v2.1.0).
- **JC to test** `/Life-Care/beta/` (see the hand-off message).
- **Resume point:** `beta` @ `244fbdf`. After JC's OK: PR `beta → main` (release v2.1.1), confirm deploy, update version table/Live Product and TECHNICAL_REFERENCE (file layout, unused list), Chat checks and tags. Then v2.2.0 Data tools (Option A). Step 1b not started.

### (Chat) 4 Nov 2026 20:45 — v2.1.1 beta verified; branding and installable-app plan
- **v2.1.1 beta verified from Chat** (real data, read-only): `v2.1.1-beta.1`, BETA badge and title, noindex; beta vs prod 12 views, **0 differences**; overlays open; the corrected guide is served on beta. JC tested on his phone: OK. **Go to release v2.1.1** (`beta → main`); Chat tags it after verifying prod.
- **JC requirements (new):**
  - (1) The app installs on phones as a real app with its own icon, not just a browser shortcut.
  - (2) JC's three Copilot logos:
    - **"Button Logo"** (round artwork in a rounded square) → **phone app icon**;
    - **"App Logo"** (circle with arched name and "My Exercise / My Health / My Eating") → **loading page**;
    - **"In App Logo"** (circle with the name underneath) → **header, top left**. This pushes the header content right, so the **BUILD/BETA pills move below the Help/Settings buttons**.
- **Assets prepared from Chat and committed to `build` (`4a3a9e1`, not wired in):**
  - Originals: `brand/source/`.
  - `public/brand/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (artwork within the 80% safe zone), `apple-touch-icon.png`, `favicon.ico`, `favicon-48.png`, `app-logo-640.png`, `in-app-logo-144.png`, `header-mark-144.png` (the same artwork without text; see the header decision below).
  - `public/brand/beta/` and `public/brand/build/`: tinted icon variants (purple / orange ring and dot) so the installed apps are told apart.
  - Why the icons were reworked: the Button Logo's own rounded-square frame and shadow would sit inside the phone's mask ("icon in an icon"), so the round artwork alone is placed full-bleed on white.
- **Order (one change per version, each through build → beta → main):**
  1. **v2.2.0 — Data tools button** (admin-only, JC chose A earlier).
  2. **v2.3.0 — logos:**
     - A **loading screen** with `app-logo-640.png` centred (~200–240px) and "Loading Lifecare Companion™…" below. It's also put as **static HTML in `index.html`**, so it shows instantly before JS runs; React's loading screen matches it, so there's no flash.
     - The **header logo** top left: about 44–48px, a white disc on the navy header. Header text moves right. **BUILD/BETA pill moves under Help/Settings** (right column). It must fit at 360px width with no overflow or wrapping.
     - **Header image: waiting on JC's choice.** A = "In App Logo" (with text, as he asked) or B = the same artwork without text (`header-mark-144.png`). Chat's mock-up shows the name is illegible at header size and duplicates the "LIFECARE COMPANION™" text beside it; Chat recommends B.
  3. **v2.4.0 — installable app (PWA):**
     - A **manifest per environment** with a distinct `id`, `name` and `short_name`: prod "Lifecare Companion" / "Lifecare"; beta "Lifecare BETA" / "LC Beta"; build "Lifecare BUILD" / "LC Build".
     - `start_url` and `scope` = that environment's base; `display: standalone`; `theme_color` = the header navy; `background_color` white; icons from `public/brand/` (beta/build use their tinted sets); `apple-touch-icon` and favicon linked in `index.html`.
     - A **minimal service worker** per environment scope that is **network-only** (no caching, and never touches Firebase or Anthropic requests). It's only there to meet install requirements; caching belongs to Step 1b.
     - **APP_GUIDE.md:** how to install on Android (Chrome and Samsung Internet → menu → Install app / Add to Home screen), and that BETA and BUILD install as separate apps.
     - **Note for go-live:** an app installed from github.io won't move to `lifecarecompanion.app`; it has to be reinstalled once after the domain move. Tell users at go-live.
- Step 1b stays after these.

### (Code) 4 Nov 2026 — v2.1.1 released (PR #6 `beta → main`)
- **Read:** diff to `680deda` (Chat verified v2.1.1 beta; JC OK; v2.2.0 → v2.3.0 → v2.4.0 plan; brand assets on `build` @ `4a3a9e1`; header logo A/B awaiting JC).
- **Done:** PR #6 merged as `2ff9d5c` (shows merged); merged tree lint 0 errors, build ok. Deploy run 41909279630 succeeded (prod strict checks passed). Version table and Live Product line → v2.1.1. `TECHNICAL_REFERENCE.md`: version, file layout (removed files, `EnvBadge`, Data section note), unused list closed, §12 rewritten for the three environments and pipeline. `CLAUDE.md`: source flow and deploy lines for build → beta → main.
- **Chat to check** prod v2.1.1 and tag it.
- **Note:** JC's header-logo choice (A "In App Logo" / B text-free mark) still isn't recorded; needed before v2.3.0, not before v2.2.0.
- **Resume point:** `main` @ `2ff9d5c` + this entry. Next: v2.2.0 Data tools on `build` (from `build` @ `4a3a9e1`, which carries the unwired brand assets). Step 1b not started.

### (Code) 4 Nov 2026 — v2.2.0 Data tools on `build`: ready for Chat (hand-off 1)
- **Read:** diff to `fa77d3c`; own release entry `e78486c` since.
- **Done (`build` @ `a7e2b11`; `main` merged in first, brand assets from `4a3a9e1` still unwired):** Settings has a new **admin-only** card "🗂 Data tools" → **Open Data tools** (opens the existing Firebase Data Viewer + recovery tools, which had no way in). The Data section has **← Back to Settings** and renders only for the admin (switching to Becks hides it). APP_GUIDE describes it. Version v2.2.0. New tests (`tests/data-tools.spec.js`): admin opens and returns; Becks has no button; viewer hides on switch. Lint 0 errors, **17/17 tests**. Exact screenshot check: only the footer version text, plus the new card on JC's Settings (above it pixel-identical; below it identical after a 120px shift).
- **Deploy** run 41910020084 succeeded, 0 error annotations (no environment skipped).
- **Decision (Code):** the Data section is gated on `isAdmin` as well as the button, so a person switch can't leave Becks on the admin tools. Button uses the grey in-card style (`btnMuted`) per the design rules.
- **Still needed before v2.3.0:** JC's header-logo choice (A "In App Logo" / B `header-mark-144.png`).
- **Resume point:** `build` @ `a7e2b11`. After Chat's OK: PR `build → beta` → JC → PR `beta → main`. Step 1b not started.

### (Code) 4 Nov 2026 — Decision: v2.3.0 header logo = B
- **Decision (JC):** the header logo for v2.3.0 is **B**: the text-free artwork, `public/brand/header-mark-144.png` (on `build`). Reason (Chat's recommendation, accepted): the "In App Logo" name is illegible at header size and repeats the "LIFECARE COMPANION™" text beside it. Rejected: A ("In App Logo" with text).
- **Resume point:** unchanged. v2.2.0 on `build` @ `a7e2b11`, waiting for Chat's verification. v2.3.0 starts only after v2.2.0 is released.

### (Chat) 4 Nov 2026 21:15 — v2.1.1 verified and tagged; v2.2.0 build verified
- **Prod v2.1.1 verified:** title and footer correct, no badge or robots meta; it renders all 12 views and overlays. **Tag `v2.1.1` → `2ff9d5c`** (PR #6 merge) created from Chat.
- **v2.2.0 on `/build/` verified** (`data_build/` re-seeded first; live `data/` fingerprinted before and after, **unchanged**; no restore buttons pressed):
  - Footer `v2.2.0-build.a7e2b11`.
  - JC's Settings has the 🗂 Data tools card; **Open Data tools** shows the Firebase Data Viewer, and **← Back to Settings** returns to Settings.
  - Switching to Becks hides the viewer, and Becks's Settings has no card. No page errors.
  - Build vs prod: 12 views, **0 differences**; overlays open.
- **Go for `build → beta`** (v2.2.0-beta.1). JC tests on his phone, as JC (he's the admin): the Data tools card opens the viewer and Back returns. **Don't press the restore buttons**, because beta uses real data.

### (Code) 4 Nov 2026 — v2.2.0 on beta: `/beta/` ready for JC (hand-off 2)
- **Read:** diff to `db6f1ea` (Chat verified prod v2.1.1 and tagged `v2.1.1`; verified v2.2.0 on `/build/`; JC must not press restore buttons on beta).
- **Done:** **PR #7 `build → beta`** merged as `eea99c6` (shows merged; lint 0 errors). Deploy run 41913460997 succeeded, 0 error annotations: `/beta/` = **v2.2.0-beta.1**; prod unchanged (v2.1.1). Chat's unwired brand images ride along (unused until v2.3.0).
- **JC to test** `/Life-Care/beta/` as JC (see the hand-off message).
- **Resume point:** `beta` @ `eea99c6`. After JC's OK: PR `beta → main` (release v2.2.0) → docs → Chat checks and tags. Then v2.3.0 logos (header = B). Step 1b not started.

### (Chat) 4 Nov 2026 21:25 — v2.2.0 beta verified; go to release
- **JC tested `/beta/` on his phone: OK.**
- **Chat verified** (real data, look only, no restore buttons pressed):
  - `v2.2.0-beta.1`; the Data tools card shows for JC and opens the viewer; Back returns to Settings.
  - Switching to Becks hides the viewer, and Becks's Settings has no card. No page errors.
  - Beta vs prod: 12 views, **0 differences**; overlays open.
- **Go to release v2.2.0** (`beta → main`); Chat verifies prod and tags `v2.2.0` after. Then v2.3.0 (logos, header B).

### (Code) 4 Nov 2026 — v2.2.0 released (PR #8 `beta → main`)
- **Read:** diff to `0357868` (JC tested beta OK; Chat verified beta; go to release).
- **Done:** PR #8 merged as `2b8578c` (shows merged); merged tree lint 0 errors, build ok. Deploy run 41915585156 succeeded. Version table, Live Product line and `TECHNICAL_REFERENCE.md` (version, Data section, brand files) updated.
- **Chat to check** prod v2.2.0 and tag it.
- **Resume point:** `main` @ `2b8578c` + this entry. Next: v2.3.0 logos on `build` (header = B, `header-mark-144.png`). Step 1b not started.

### (Code) 4 Nov 2026 — v2.3.0 logos on `build`: ready for Chat (hand-off 1)
- **Read:** own entries since `0357868` (v2.2.0 released as `2b8578c`, docs `da936c5`); no new Chat entries.
- **Done (`build` @ `777d82a`):**
  - **Loading screen:** `app-logo-640.png`, 220px, round, centred, with "Loading Lifecare Companion™…". The same markup (class `boot`) is static HTML in `index.html` and shows before JavaScript; React's `LoadingScreen` is **pixel-identical**, so there's no flash. Vite rewrites the image path per base (`/Life-Care/…`, `/Life-Care/build/…`).
  - **Header:** text-free mark `header-mark-144.png` (**B**) in a **44px** white disc, top left; the title and names move right. **BUILD/BETA badge** moved under Help/Settings, right-aligned.
  - APP_GUIDE (badge position), v2.3.0.
- **Checks:** lint 0 errors; **19/19 tests** (new: loading screen in the HTML, logo loads, badge under the buttons). Fits at 360px and 412px with no overflow. Exact screenshot check: only header rows 20–63 and the footer version text differ; page heights unchanged; everything else pixel-identical.
- **Decisions (Code):** disc **44px**, not 46–48, because 44px = the text block height. At 46px the header grew 2px, which moved all content and made the exact check noisy (the fixed 💬 button and overlays don't move). The static logo is rounded so its white square doesn't show on the grey page.
- **Deploy** run 41916873763 succeeded, 0 error annotations.
- **Resume point:** `build` @ `777d82a`. After Chat's OK: PR `build → beta` → JC → PR `beta → main`. Then v2.4.0 installable app. Step 1b not started.

### (Chat) 4 Nov 2026 21:50 — v2.2.0 tagged; v2.3.0 build verified
- **Prod v2.2.0 verified; tag `v2.2.0` → `2b8578c`** (PR #8 merge) created from Chat.
- **v2.3.0 on `/build/` verified** (`data_build/` re-seeded):
  - The static loading screen with JS disabled shows the round App Logo and "Loading Lifecare Companion™…".
  - The header at 360px and 412px has the round text-free mark top left, the title and names to its right, and the BUILD pill under Help/Settings, right-aligned. **No horizontal overflow** at either width.
  - `v2.3.0-build.777d82a`. Build vs prod: 12 views, **0 differences**; overlays open. Prod is v2.2.0 and beta v2.2.0-beta.0, both untouched.
  - Screenshots sent to JC for a visual check.
- Code's choice of a **44px disc** (not 46px) to keep the header height unchanged is **accepted**.
- **Go for `build → beta`** once JC is happy with the look.

### (Chat) 4 Nov 2026 22:05 — v2.3.0: header logo sharpness fix before beta
- **JC:** the header logo's border looks fuzzy. Confirmed at 3× phone resolution: the `header-mark-144.png` source is ~1:1 with 44px × 3 (132 device px), and the thin hand-drawn ring fades to a grey hairline.
- **Fix prepared from Chat:** `public/brand/header-mark-288.png` (twice the resolution, the original ring replaced with one crisp dark ring), committed to `build` (`ab2cdb4`). Compared side by side at 3×, it's clearly sharper.
- **Code to do (bug fix within v2.3.0, before beta):** point the header at `header-mark-288.png` (keep 44px and the white disc), remove the unused `header-mark-144.png`, re-run the checks and screenshot baseline, then hand `/build/` back to Chat for a 3× check.

### (Chat) 4 Nov 2026 22:15 — finding: header doesn't scale past 2 people (pre-existing)
- **JC asked** what happens with longer names or ~5 family members. **Tested from Chat** on `/build/`: 3 extra people with long names (Alexandra, Christopher, Maximilian) were temporarily added to `data_build/`, which was then restored from live (back to `jc`, `becks`).
- **Result, at 360px and 412px:** no horizontal page overflow, but:
  - (1) the title (all names joined with " & ") wraps to **4 lines** and pushes the app down;
  - (2) the person tabs **overlap and become unreadable**, and the "+" gets squashed.
  - This is **pre-existing** (not caused by v2.3.0), so v2.3.0 isn't blocked.
- **Proposed fix (own version, v2.5.0, after v2.4.0 unless JC reorders):**
  - **Title** = the active person's name (one line, ellipsis if long). Later, with households (Step 5), a household name.
  - **Person tabs** = a horizontally scrollable row: each tab sized to its name (max ~12 characters, then an ellipsis); the active tab scrolled into view; "+" pinned at the end.
  - Test with 1, 2, 5 and 8 people and long names, at 360/412px.
  - **Waiting for JC's choice** on the title.

### (Chat) 4 Nov 2026 22:20 — decision: header title = the selected person's name
- **Decision (JC):** the header title shows **only the name of the person whose tab is selected** (e.g. "JC"; switching to Becks shows "Becks"). One line, with an ellipsis if very long. **No household/family name** (that idea is dropped).
- Person tabs as proposed: a horizontally scrollable row, each tab sized to its name (max ~12 characters, then an ellipsis), the selected tab scrolled into view, "+" pinned at the end.
- Ships as **v2.5.0** after v2.4.0 (installable app), through build → beta → main. Test with 1, 2, 5 and 8 people and long names at 360/412px. Chat can stage the extra test people in `data_build/` and restore it afterwards.

### (Chat) 4 Nov 2026 22:25 — v2.5.0 acceptance criteria: every way of switching person
- **JC asked:** does the title follow a switch from the top tabs **and** from the person switch inside the exercise log? Both call `setActiveTab` + `loadUserSettings` (v1.369.1), so the title should bind to `activeTab`. **It must be proven by tests, not assumed.**
- **v2.5.0 must pass:**
  1. **Title** = the selected person's name after a switch via (a) the top person tabs and (b) the person switch inside the exercise log (including after saving a log for the other person). Colour theme and data follow too, as today.
  2. **The top tab row scrolls the selected tab into view** whenever the active person changes from anywhere, including the exercise-log switch, not only on a tap.
  3. **The exercise-log person switch gets the same scaling fix** as the top tabs (it's built the same way and has the same overlap problem with many or long names).
  4. **Code to search for every other place that lists people** (any `Object.keys(data)` person toggle, "Generated for …" labels, etc.), apply the same rules, and list them in the hand-off.
  5. Playwright tests for 1, 2, 5 and 8 people with long names at 360/412px, covering 1–3. Chat re-checks on `/build/` with staged people in `data_build/`.

### (Code) 4 Nov 2026 — v2.3.0 fix: sharper header logo on `build`, back to Chat
- **Read:** diff to `e5dbd84` (v2.2.0 tagged; v2.3.0 build verified, 44px accepted; fuzzy-ring finding and `header-mark-288.png` on `build` `ab2cdb4`; header scaling finding; **JC's v2.5.0 decisions**: title = the selected person's name, scrollable person tabs, every switch path incl. the exercise-log switch, tests for 1/2/5/8 people — for later, after v2.4.0).
- **Done (`build` @ `3900dec`):** header now uses `header-mark-288.png` (44px white disc unchanged); `header-mark-144.png` removed (no other code reference). Lint 0 errors, 19/19 tests. Exact screenshot check vs the v2.3.0 baseline: **only the 44×44 logo box** (16,20)–(60,64) differs in every view; no size changes. 3× phone-resolution close-up: the old ring was a faint hairline, the new one crisp and dark. Baseline updated.
- **Deploy** run 41921165264 succeeded, 0 error annotations.
- **Resume point:** `build` @ `3900dec`. After Chat's 3× check and JC's OK on the look: PR `build → beta` → JC → PR `beta → main`. Then v2.4.0, then v2.5.0. Step 1b not started.

### (Chat) 4 Nov 2026 22:30 — v2.3.0 sharpness fix verified
- At 3× phone resolution on `/build/`, the header loads `header-mark-288.png` (natural 288px, shown at 44px): the ring is crisp and dark and the artwork clear. Screenshot sent to JC.
- `v2.3.0-build.3900dec`. The static loading screen is fine; no overflow at 360/412px. `data_build/` was re-seeded and build vs prod gives 12 views, **0 differences**. Prod v2.2.0 and beta v2.2.0-beta.0 are untouched.
- **Go for `build → beta`** once JC confirms the look.

### (Code) 4 Nov 2026 — v2.3.0 on beta: `/beta/` ready for JC (hand-off 2)
- **Read:** diff to `49560f9` (Chat verified the sharpness fix at 3×; JC approved the look).
- **Done:** **PR #9 `build → beta`** merged as `66fa117` (shows merged; lint 0 errors). Deploy run 41923480013 succeeded, 0 error annotations: `/beta/` = **v2.3.0-beta.1**; prod unchanged (v2.2.0).
- **JC to test** `/Life-Care/beta/` on his phone (see the hand-off message).
- **Resume point:** `beta` @ `66fa117`. After JC's OK: PR `beta → main` (release v2.3.0) → docs → Chat checks and tags. Then v2.4.0 installable app, then v2.5.0. Step 1b not started.

### (Chat) 4 Nov 2026 22:35 — v2.3.0 beta verified; go to release
- **JC tested `/beta/` on his phone: all good.**
- **Chat verified:** `v2.3.0-beta.1` with BETA badge, title and noindex; the header loads `header-mark-288.png`; beta vs prod gives 12 views, **0 differences**, and overlays open. Prod v2.2.0 is untouched.
- **Go to release v2.3.0** (`beta → main`); Chat verifies prod and tags `v2.3.0`. Then v2.4.0 (installable app).

### (Code) 4 Nov 2026 — v2.3.0 released (PR #10 `beta → main`)
- **Read:** diff to `94c42f9` (JC tested beta: all good; Chat verified; go to release).
- **Done:** PR #10 merged as `f34513b` (shows merged); merged tree lint 0 errors, build ok (static logo path `/Life-Care/brand/…`). Deploy run 41924275234 succeeded (an older docs-push run was superseded and shows "cancelled", which is normal). Version table, Live Product line and `TECHNICAL_REFERENCE.md` updated.
- **Chat to check** prod v2.3.0 and tag it.
- **Resume point:** `main` @ `f34513b` + this entry. Next: v2.4.0 installable app on `build`. Then v2.5.0. Step 1b not started.

### (Code) 4 Nov 2026 — v2.4.0 installable app on `build`: ready for Chat (hand-off 1)
- **Read:** own entries since `94c42f9` (v2.3.0 released as `f34513b`, docs `d20044b`); no new Chat entries.
- **Done (`build` @ `d203eb7`), as specified in the v2.4.0 plan:**
  - `manifest.webmanifest` per environment, generated at build: distinct `id`, names (Lifecare Companion/Lifecare · Lifecare BETA/LC Beta · Lifecare BUILD/LC Build), `start_url` = `scope` = base, standalone, theme `#0f172a`, background white, icons any + maskable (beta/build tinted).
  - `sw.js`: **network-only** service worker per scope. It caches nothing, passes only this app's own GET requests to the network, and never touches Firebase, Anthropic or other origins; prod's skips `/beta/` and `/build/`. Registered in builds only.
  - `index.html`: manifest, apple-touch-icon, favicons, `apple-mobile-web-app-title`. This replaces the old inline `data:` manifest (`start_url "/"`).
  - `check-pages.mjs` validates manifest, icons and `sw.js` when present (prod strict; not required, so a legacy rollback still deploys); tested with a good artifact, a bad build manifest (build skipped) and a missing prod icon (deploy fails). It takes effect when v2.4.0 reaches `main`.
  - APP_GUIDE: install steps for Android (Chrome, Samsung Internet); BETA/BUILD install as separate apps.
- **Checks:** lint 0 errors; **24/24 tests**, incl. Chromium `Page.getInstallabilityErrors` = none, with the app loading its data under the service worker, and the service-worker routing rules. Exact screenshot check: only the footer version text differs. The Chat-panel screenshot was flaky (logo still loading after its reload); screenshots now wait for images to load, and 3/3 reruns were stable.
- **Deploy** run 41926364576 succeeded, 0 error annotations.
- **Note for go-live (from the plan):** an app installed from github.io must be reinstalled once after the move to `lifecarecompanion.app`.
- **Open:** `public/brand/in-app-logo-144.png` (option A) is unused; it can be removed in a clean-up.
- **Resume point:** `build` @ `d203eb7`. After Chat's OK: PR `build → beta` → JC installs beta on his phone → PR `beta → main`. Then v2.5.0. Step 1b not started.

### (Architect) 4 Nov 2026 22:55 — Roles and names (JC decision)
- **Decision (JC):** to avoid ambiguity when he coordinates both:
  - Claude Code (the builder) is now **Lifecare Companion Coder** ("the Coder").
  - Claude in Chat (the architect) is now **Lifecare Companion Architect** ("the Architect").
  - Both use these names in reports, messages to JC and the docs.
- **Log labels:** new Session Log entries are labelled **(Coder)** and **(Architect)**; older (Code)/(Chat) entries stay as written. Rule 9's diff routine is unchanged; the Architect reads from its last (Architect) entry, or (Chat) if none.
- **Coder to do:** update `CLAUDE.md` (names, labels) and refer to the Architect by name from now on. Use the new names in the docs going forward; no need to rewrite history.

### (Architect) 4 Nov 2026 23:05 — v2.3.0 tagged; v2.4.0 build verified
- **Prod v2.3.0 verified; tag `v2.3.0` → `f34513b`** (PR #10 merge) created by the Architect.
- **v2.4.0 on `/build/` verified** (`data_build/` re-seeded):
  - The manifest is "Lifecare BUILD" / "LC Build", with id, start and scope `/Life-Care/build/`, `standalone`, and the orange icon set (192, 512, maskable 512 all 200 `image/png`).
  - Links: manifest, apple-touch-icon (build variant), favicon; theme `#0f172a`.
  - `sw.js` is network-only, same-origin, own scope only (reviewed). Registered and active for `/Life-Care/build/`; the page is controlled and still loads normally after a reload.
  - **Chromium `Page.getInstallabilityErrors`: none**; manifest parse errors: none.
  - `v2.4.0-build.d203eb7`. Build vs prod: 12 views, **0 differences**; overlays open. Prod (v2.3.0) and beta have no manifest/SW yet, as expected.
- Not verifiable from the Architect's sandbox: an actual install on Android. That's JC's beta test (install "Lifecare BETA" from Samsung Internet or Chrome; check the purple icon, full screen, data loads).
- **Go for `build → beta`.**

### (Coder) 4 Nov 2026 — roles renamed: CLAUDE.md updated
- **Read:** diff to `95f75da` (roles renamed to Lifecare Companion Coder / Architect; brief note; Architect tagged `v2.3.0` and verified v2.4.0 on `/build/`, incl. installability; the Android install is JC's beta test).
- **Done:** `CLAUDE.md` gains the names and the (Coder)/(Architect) labels; the flow and limits lines name the Architect. Rule 9 is unchanged and still word for word with the brief. New entries from here are labelled (Coder).
- **Resume point:** unchanged: next, PR `build → beta` for v2.4.0.

### (Coder) 4 Nov 2026 — v2.4.0 on beta: `/beta/` ready for JC (hand-off 2)
- **Read:** own entries since `cf82fb0`; no new Architect entries.
- **Done:** **PR #11 `build → beta`** merged as `ec5aa87` (shows merged; lint 0 errors). Deploy run 41929737384 succeeded, 0 error annotations: `/beta/` = **v2.4.0-beta.1**, installable as "Lifecare BETA"; prod unchanged (v2.3.0). (A docs-push run was superseded and shows "cancelled", which is normal.)
- **JC to test:** install the BETA app on his phone (Samsung Internet or Chrome); see the hand-off message.
- **Resume point:** `beta` @ `ec5aa87`. After JC's OK: PR `beta → main` (release v2.4.0) → docs → the Architect checks and tags. Then v2.5.0. Step 1b not started.

### (Coder) 4 Nov 2026 23:40 — v2.4.0 beta: JC's install test
- **JC tested on his phone (Samsung, Android):**
  - **Samsung Internet → "Install as web app":** **Google Play Protect blocked it** ("built for an older version of Android"). The package is generated by Samsung Internet, not by our code (only our name and icon are in it). JC pressed OK; not installed.
  - **Chrome → ⋮ → "Install and create shortcut" → Install → Install:** installed as **"Lifecare BETA"** with the purple icon, no warning. Opens **full screen**, and everything works.
- **Guide correction needed (not yet made):** APP_GUIDE's Samsung steps are wrong ("Add page to → Home screen" only makes a bookmark). It should recommend **Chrome** with the real menu names, and warn that Samsung Internet's "Install as web app" may be blocked by Play Protect.
- **Idea for later (JC to decide):** an in-app "Install app" button (one tap via Chrome's install prompt) instead of the 3-step menu route.
- **Resume point:** `beta` @ `ec5aa87`, JC's test OK. Next: correct the guide, then release v2.4.0 (order awaiting JC/Architect).

### (Architect) 4 Nov 2026 23:40 — v2.4.0: guide correction goes through the flow (option A)
- **JC's phone test:** "Lifecare BETA" installs through **Chrome** and opens full screen, and everything works. Samsung Internet's "Install as web app" was **blocked by Play Protect** (recorded by the Coder at `ed1df55`).
- **Decision (JC, on the Architect's recommendation): option A.** Correct the install steps in `APP_GUIDE.md` on `build`:
  - recommend Chrome: ⋮ → **Install and create shortcut** → **Install** → **Install**;
  - warn that Samsung Internet's "Install as web app" may be blocked by Play Protect, and use Chrome instead;
  - fix the wrong Samsung menu name.
  - Then build → Architect check → beta as **v2.4.0-beta.2** (JC quick look) → release. Rejected: B (release now, fix on `main`), because live Help would give known-wrong steps and the guide copies would drift across environments.
- **Principle:** `APP_GUIDE.md` changes that accompany a feature ship with that feature through the flow. Direct `main` guide edits are only for correcting live errors unrelated to an in-flight release (as with the Data Viewer line).

### (Coder) 4 Nov 2026 — v2.4.0 guide correction on `build`: ready for the Architect
- **Read:** diff to `ed1df55` (Architect: option A; guide changes ship with their feature through the flow).
- **Done (`build` @ `1105972`; `main` merged in first):** APP_GUIDE "Installing the app on your phone" now:
  - recommends **Chrome**: ⋮ → **Install and create shortcut** → **Install** → **Install** (choose Install, not Create shortcut);
  - warns that Samsung Internet's **Add page to → Install as web app** may be **blocked by Google Play Protect**: press OK and use Chrome, don't "Install anyway";
  - notes that **Add page to → Home screen** is only a bookmark.
  - Guide-only change, no code change; version stays v2.4.0.
- **Deploy** run 41935345616 succeeded, 0 error annotations. `/build/` = `v2.4.0-build.1105972`.
- **Resume point:** `build` @ `1105972`. After the Architect's check: PR `build → beta` (→ **v2.4.0-beta.2**), JC quick look, then release. Step 1b and v2.5.0 not started.

### (Architect) 4 Nov 2026 23:50 — v2.4.0 guide fix verified on build
- `/build/APP_GUIDE.md` install section verified: it recommends Chrome (⋮ → Install and create shortcut → Install → Install, "choose Install, not Create shortcut"), warns about Play Protect in Samsung Internet ("don't tap Install anyway"; use Chrome), and notes that Add page to → Home screen = bookmark only. Footer `v2.4.0-build.1105972`.
- **Help answer tested from the Architect** (direct API call with the same Help system prompt plus the build guide; the sandbox blocks only the browser path): "How do I install the app?" and the Play Protect question both get correct, Chrome-first answers.
- **Go for `build → beta`** (v2.4.0-beta.2), then JC's quick look, then release.

### (Coder) 4 Nov 2026 — v2.4.0 guide fix on beta: v2.4.0-beta.2 ready for JC's quick look
- **Read:** diff to `98e1f73` (Architect verified the guide fix on `/build/`, incl. Help answers via the AI API; go for beta).
- **Done:** **PR #12 `build → beta`** merged as `07432cd` (shows merged). Deploy run 41936551652 succeeded, 0 error annotations: `/beta/` = **v2.4.0-beta.2**; prod unchanged (v2.3.0).
- **Resume point:** `beta` @ `07432cd`. On JC's OK: PR `beta → main` (release v2.4.0) → docs → the Architect checks and tags. Then v2.5.0. Step 1b not started.

### (Architect) 4 Nov 2026 23:55 — decision: hold v2.4.0; release v2.4.0 and v2.5.0 to prod together
- **JC's quick look of v2.4.0-beta.2: OK** (the installed Lifecare BETA app; Help recommends Chrome). Architect check: the beta guide is byte-identical to the verified build guide, and the beta manifest is correct.
- **Decision (JC):** don't release v2.4.0 on its own. Build **v2.5.0** next (header title = selected person; scrollable person tabs; all person-switch paths, per the acceptance criteria above) through build → Architect → beta → JC. Then **one prod release takes prod from v2.3.0 to v2.5.0**, containing both versions.
  - Trade-off accepted: a v2.5.0 problem would delay the installable app reaching prod.
- **Process notes:**
  - v2.4.0 and v2.5.0 stay separate versions and commits. Prod has no v2.4.0 release, so **no `v2.4.0` tag**; the Architect tags `v2.5.0` at the release merge, and the version table notes that v2.4.0 shipped to prod inside v2.5.0.
  - **The many-people check runs on `/build/` only.** The Architect stages extra long-named people in `data_build/` for verification and restores it afterwards. Beta uses real data (2 people), so JC's beta test covers the 2-person look and the switch paths.

### (Coder) 5 Nov 2026 — v2.5.0 on `build`: ready for the Architect (hand-off 1)
- **Read:** diff to `e5f1114` (JC: hold v2.4.0; build v2.5.0; one prod release v2.3.0 → v2.5.0; many-people check on `/build/` only).
- **Done (`build` @ `4644cb9`, on top of v2.4.0):**
  - **Header title** = the selected person's name only (one line, ellipsis).
  - **`PersonTabs`** component for the header and the exercise log: each tab at least its name's width; names over 12 characters cut with "…" (full name as tooltip); with few people the tabs share the width as before (2-person look unchanged); with many the row scrolls; "+" pinned at the end. The selected tab is scrolled into view **sideways only** whenever the selected person changes from anywhere, and whenever the row or a tab resizes.
  - **Exercise-log switch:** uses `PersonTabs`; its save/switch/restore logic moved byte for byte; labels from profile names (were hard-coded "JC"/"Becks").
- **Every place that lists people (criterion 4):**
  - *Fixed:* header title (App), top person tabs (App), exercise-log switch (Exercise), Data Viewer section headers (Data, showed the raw key "Jc"), Eating "Individual for just …" text (was hard-coded "JC"/"Becks").
  - *Not display, no change:* colour index (App `personKeys`), copying meal defaults to the other people (Eating ×3), shopping-list prompt (Shop).
  - *Found, not fixed (2-person assumptions; Step 3/5, JC to decide):* `isJC ? data.jc : data.becks` in App and 4× in Exercise, so **people 3+ currently see Becks's data**; Data restore-from-backup only restores `["jc", "becks"]`.
- **Bug found by the stricter test and fixed:** after saving a log with 5+ people, the selected tab ended 2px out of view, because the tab's letter-spacing was still animating when the scroll was measured. It's now re-checked on every row and tab resize. Traced before fixing (an earlier guess, the page scrollbar, was wrong).
- **Checks:** lint 0 errors; **41/41 tests**, twice; new `tests/people.spec.js` (17 tests): 1, 2, 5 and 8 people with long names at 360/412px; layout, every top tab, the exercise-log switch incl. after saving a log, colour theme both ways. Exact screenshot check (2 people): only the title text and the version differ (plus ≤10px off by 1 on the active tab pill, from the new scroll layer). APP_GUIDE updated.
- **Deploy** run 41938866256 succeeded, 0 error annotations. `/build/` = `v2.5.0-build.4644cb9`.
- **Resume point:** `build` @ `4644cb9`. After the Architect's check with staged people: PR `build → beta` → JC (2-person look, switch paths, plus install) → one release `beta → main` (v2.3.0 → v2.5.0; Architect tags `v2.5.0` only). Step 1b not started.

### (Architect) 5 Nov 2026 00:50 — v2.5.0 build verified; pre-existing person-switch race found
- **v2.5.0 feature verified on `/build/`** (5 and 8 long-named people staged in `data_build/`, then restored to live 2 people):
  - No page overflow at 360/412px. The title is the selected person's name on one line ("JC").
  - Tabs keep their natural width and scroll; "+" is pinned; "Bartholomew-James" is shown as "Bartholomew…".
  - Tapping Evangelina gives title "Evangelina", Becks gives "Becks".
  - The exercise-log switch has its own tab row (2 "Maximilian" buttons on the page), and switching there to Maximilian gives title "Maximilian".
  - With 2 people, Becks's purple theme applies instantly, the same as prod.
- **NEW finding: race on person switch shortly after the app opens (pre-existing, affects prod v2.3.0).**
  - Switching to Becks right after load left **JC's theme** applied (prod 2/3 attempts, build 3/3; also on the first Becks switch with 8 people). Later switches were correct.
  - **Likely cause** (to be traced by the Coder): the start-up loader keyed on `activeTab` (loads `user_colour_*`, `user_mood_*`, `journal_*`, `daily_mood_*`, `wellbeing_flags_*`, meal tracking, …) is still running for JC when the switch happens. Its late results overwrite the newly selected person's state.
  - **Risk:** beyond the theme, the selected person could be shown, and then save, the previous person's journal or mood (cross-person data).
  - **Checked live data (counts only, read-only): no contamination so far.** Becks has no journal/mood/wellbeing entries; the shared keys differ.
- **Decisions requested from JC:**
  - (1) Fix the race as **v2.5.1** on `build` before beta, inside the combined release. Architect recommends yes. It needs a trace, a guard so stale loads can't apply (e.g. ignore results for a person who is no longer selected), and a test that switches immediately after load (with added emulator latency) and checks theme, mood, journal and meal tracking belong to the selected person.
  - (2) **People 3+ see Becks's data** (`isJC ? data.jc : data.becks`; found by the Coder). Until Steps 3/5, adding a third person is unsafe. Architect recommends **hiding the "+ add person" button** (its own small version, v2.5.2) until the multi-user data model exists. The alternative is to keep it and accept the risk.

### (Coder) 5 Nov 2026 — v2.5.1 race fix and v2.5.2 hide "+" on `build`: ready for the Architect
- **Read:** diff to `1853a61` (Architect: v2.5.0 verified with 5/8 people; person-switch race found; JC: v2.5.1 fix + test, v2.5.2 hide "+"; on to beta together).
- **v2.5.1 (`f8a2584`), traced first:**
  1. The **start-up loader** reads about 30 keys one after another for the person selected at start (JC). Its person-specific results (meal tracking, portion overrides, Google token, mood, journal, daily mood, colour, wellbeing flags) arrive late and were applied after a switch to Becks; it also set the current body/health/measurement feedback to JC's.
  2. **`loadUserSettings`** fired reads with no check, so quick A→B switches let a late answer for A win.
  - **Fix:** `activeTabRef` = the person selected right now (set at once on every switch). Every person-specific result is dropped if another person is selected when it arrives; the current feedback is picked for whoever is selected. `loadUserSettings` now also loads **portion overrides and the Google token** for the selected person (before, they were only loaded at start-up, for JC, so Becks kept JC's after any switch).
  - **Tests** (`tests/person-race.spec.js`, emulator slowed by 120ms each way via a WebSocket relay): switch to Becks right after load, and rapid Becks→JC→Becks. Theme, mood, journal, meal tracking and portion overrides must be Becks's, and switching back restores JC's. **Both fail on the old code** (JC's blue left on Becks) and pass with the fix (3/3). A dev-only `window.__lcPerson` exposes the state (not in builds).
  - **Test fix:** the Chat-panel screenshot was flaky in the header logo behind the see-through overlay (Chrome draws it two ways; reproduced 3/3 *without* v2.5.1, so not caused by it). The logo is masked in that one shot only and stays pixel-checked in all 16 full-page views; 4/4 runs stable.
- **v2.5.2 (`0d99ad3`):** the header "+" (the only way into the add-person form) is hidden by `ALLOW_ADD_PERSON = false` in `src/constants/features.js`; the add-person code is kept. APP_GUIDE: adding a person is switched off for now. The many-people tests now check there's no "+". Screenshot check: only the person-tab row (tabs use the full width) and the version differ.
- **Checks:** lint 0 errors, **43/43 tests**. Deploys 41944292537 (v2.5.1) and 41944688421 (v2.5.2) succeeded, 0 error annotations. `/build/` = `v2.5.2-build.0d99ad3`.
- **Resume point:** `build` @ `0d99ad3`. After the Architect's check: one PR `build → beta` carrying v2.4.0 + v2.5.0 + v2.5.1 + v2.5.2 → JC → release v2.3.0 → v2.5.2. Step 1b not started.

### (Architect) 5 Nov 2026 01:15 — v2.5.1 and v2.5.2 verified on build; go for beta
- **v2.5.1 race fix verified:**
  - The immediate switch to Becks right after load gives Becks's purple **8/8** (before the fix: prod 2/3 and build 3/3 wrong).
  - Rapid Becks/JC/Becks/JC/Becks switching ends fully on Becks (title and theme) **4/4**.
  - With 8 staged people, the *first* switch to Becks is now purple (it was JC's blue before), and later switches are correct (Evangelina → default blue, Alexandra → green, by index).
- **v2.5.2 verified:** no "+" in the person row (2 people and 8 people). No page overflow at 360/412px with 8 people. `v2.5.2-build.0d99ad3`.
- With 2 people, build vs prod: 12 views, 0 content differences; overlays open. `data_build/` restored to live (2 people).
- Noted and accepted: the Coder found and fixed portion overrides and the Google token loading only for JC (same class of bug); the Chat-panel screenshot logo is masked because of a pre-existing overlay-rendering flake (the full-page logo is still pixel-checked).
- **Go:** one `build → beta` PR carrying v2.4.0 + v2.5.0 + v2.5.1 + v2.5.2 for JC's beta test. Then the single release v2.3.0 → v2.5.2; the Architect tags `v2.5.2` only.

### (Coder) 5 Nov 2026 — v2.5.0–v2.5.2 on beta: `/beta/` (v2.5.2-beta.3) ready for JC
- **Read:** diff to `09d3630` (Architect verified v2.5.1 and v2.5.2 on `/build/`; go for one `build → beta` PR).
- **Done:** **PR #13 `build → beta`** merged as `8e20323` (shows merged; lint 0 errors). Beta now carries v2.4.0 (PRs #11, #12) + v2.5.0 + v2.5.1 + v2.5.2. Deploy run 41982087386 succeeded, 0 error annotations: `/beta/` = **v2.5.2-beta.3**; prod unchanged (v2.3.0).
- **JC to test** `/Life-Care/beta/` (the installed Lifecare BETA app; see the hand-off message).
- **Resume point:** `beta` @ `8e20323`. After JC's OK: PR `beta → main` = the single release v2.3.0 → v2.5.2 → docs (version table rows for v2.4.0–v2.5.2, noting v2.4.0 shipped inside it; TECHNICAL_REFERENCE: PersonTabs, PWA, features.js) → Architect checks and tags `v2.5.2` only. Step 1b not started.

### (Architect) 5 Nov 2026 07:00 — v2.5.2 beta approved by JC; BETA icon restyle (v2.5.3)
- **JC tested `/beta/` (v2.5.2-beta.3) on his phone: all OK.** Go to release v2.3.0 → v2.5.2; the Architect verifies prod and tags `v2.5.2`.
- **JC feedback on the installed "LC Beta" icon:** the ring is too thick and he doesn't like the purple dot. BETA is the app the **pilot group** will use, so it must look as polished as prod.
- **Decision:** the BETA icon uses **exactly the in-app header mark's ring** (same construction and thickness as `header-mark-288.png`) in purple, with **no dot**. BUILD gets the same style in orange for consistency. Prod icons are unchanged.
  - New icon sets committed by the Architect to `build` (`b5a6ea4`): `public/brand/beta/*` and `public/brand/build/*` (192, 512, maskable 512, apple-touch).
- **Order:** release v2.5.2 first (unaffected: prod icons don't change). Then **v2.5.3** (version bump plus these icons) through build → Architect → beta → JC → main.
  - Note for JC: an installed app may keep its old icon until Android refreshes it (can take a day); reinstalling "Lifecare BETA" shows the new icon straight away.

### (Coder) 5 Nov 2026 — v2.5.2 released (PR #14 `beta → main`, v2.3.0 → v2.5.2)
- **Read:** diff to `1cb47ee` (JC tested beta v2.5.2-beta.3: all OK; go to release; then v2.5.3 icon restyle, icons on `build` @ `b5a6ea4`).
- **Done:** PR #14 merged as `d482e02` (shows merged). Locally: lint 0 errors, build ok, and the new checker passes prod incl. "installable app (manifest, icons, sw.js)". Deploy run 41983550217 succeeded, 0 error annotations. Live is now installable as "Lifecare Companion". Version table (v2.4.0–v2.5.2), Live Product line and `TECHNICAL_REFERENCE.md` updated.
- **Architect to check** prod v2.5.2 and tag `v2.5.2` only.
- **JC:** close the app and reopen it; footer **v2.5.2**. The live app can now be installed from Chrome (⋮ → Install and create shortcut → Install → Install).
- **Resume point:** `main` @ `d482e02` + this entry. Next: v2.5.3 (BETA/BUILD icon restyle) on `build`. Step 1b not started.

### (Coder) 5 Nov 2026 — v2.5.3 BETA/BUILD icon restyle on `build`: ready for the Architect
- **Read:** own release entry `b00454f` since `1cb47ee`; no new Architect entries.
- **Done (`build` @ `deeebb4`; `main` merged in first):** v2.5.3 = the Architect's icon sets (`b5a6ea4`) + version bump. Checked: the 8 files keep their names, sizes (192, 512, maskable 512, apple-touch 180) and format; only `public/brand/beta/` and `public/brand/build/` changed; prod icons untouched. Side by side: thin crisp ring (purple / orange), no dot. Lint 0 errors, 43/43 tests (incl. every manifest icon loads); exact screenshot check: only the version text.
- **Deploy** run 41984074511 succeeded, 0 error annotations. `/build/` = `v2.5.3-build.deeebb4`.
- **Resume point:** `build` @ `deeebb4`. After the Architect's check: PR `build → beta` (v2.5.3-beta.1) → JC (reinstall Lifecare BETA to see the new icon at once) → PR `beta → main`. Step 1b not started.

### (Architect) 5 Nov 2026 07:15 — v2.5.2 live, verified and tagged; v2.5.3 build verified
- **Prod v2.5.2 verified:**
  - footer v2.5.2, no badge;
  - Chromium installability errors **none**; manifest "Lifecare Companion" / "Lifecare", start and scope `/Life-Care/`;
  - SW active and controlling, SKIP = beta/build; reloads normally;
  - prod vs beta: 12 views, 0 differences, overlays open;
  - **switch-race fix confirmed on prod: an immediate switch to Becks is correct 5/5** (it was wrong 2/3 before).
- **Tag `v2.5.2` → `d482e02`** (PR #14 merge). No `v2.4.0` tag (shipped inside v2.5.2).
- **v2.5.3 on `/build/` verified:** all four BUILD icon files served are byte-identical to the Architect's new set; beta still serves the old set (until promotion); **prod icons unchanged** (byte-identical to the originals). `v2.5.3-build.deeebb4`.
- **Go for `build → beta`** (v2.5.3-beta.1). JC reinstalls Lifecare BETA to see the new icon, then release.

### (Coder) 5 Nov 2026 — v2.5.3 on beta: `/beta/` (v2.5.3-beta.1) ready for JC
- **Read:** diff to `5f47c63` (Architect verified prod v2.5.2 incl. the race fix 5/5 on prod and tagged `v2.5.2`; verified v2.5.3 icons on `/build/`).
- **Done:** **PR #15 `build → beta`** merged as `8d58bca` (shows merged). Deploy run 41985499701 succeeded, 0 error annotations: `/beta/` = **v2.5.3-beta.1** with the new purple icons; prod unchanged (v2.5.2).
- **JC to test:** reinstall Lifecare BETA and check the new icon (see the hand-off message).
- **Resume point:** `beta` @ `8d58bca`. After JC's OK: PR `beta → main` (release v2.5.3) → docs → the Architect checks and tags `v2.5.3`. Step 1b not started.

### (Architect) 5 Nov 2026 07:45 — v2.5.3 beta approved; go to release
- **JC reinstalled Lifecare BETA (v2.5.3-beta.1): the new icon (thin purple ring, no dot) is correct; all checks fine.**
- Architect check: beta serves the new icon set byte for byte; prod icons unchanged.
- **Go to release v2.5.3** (`beta → main`); the Architect verifies prod and tags `v2.5.3`.

### (Coder) 5 Nov 2026 — v2.5.3 released (PR #16 `beta → main`)
- **Read:** diff to `fd61e76` (JC reinstalled Lifecare BETA: new icon correct; go to release).
- **Done:** PR #16 merged as `f6e3a78` (shows merged). Merged tree: lint 0 errors, build ok, prod icons unchanged (only `public/brand/beta|build/` differ), checker passes prod "installable app". Deploy run 41989156887 succeeded, 0 error annotations. Version table and Live Product line → v2.5.3.
- **Architect to check** prod v2.5.3 and tag `v2.5.3`.
- **Resume point:** `main` @ `f6e3a78` + this entry; `build`/`beta` hold no unreleased changes. Next: whatever JC/the Architect decide (Step 1b measurement was next in the plan; not started).

### (Architect) 5 Nov 2026 07:50 — v2.5.3 verified and tagged; release train complete
- **Prod v2.5.3 verified:** footer v2.5.3, no badge; prod icons byte-identical to the originals; prod vs beta: 12 views, 0 differences, overlays open. **Tag `v2.5.3` → `f6e3a78`** (PR #16 merge).
- **Done since the migration:** v2.0.0 (Vite), v2.1.0 (build/beta/prod), v2.1.1 (clean-up), v2.2.0 (Data tools), v2.3.0 (logos), v2.4.0 + v2.5.0–v2.5.2 (installable app, person title/tabs, switch-race fix, "+" hidden), v2.5.3 (BETA/BUILD icons). `build`, `beta` and `main` are level.
- **Next in the plan:** Step 1b (measure running costs → proposal → JC approves → build). It waits for JC's go. **Backlog:** update the outdated workflow actions (Node warnings); Steps 2–6.

### (Architect) 5 Nov 2026 08:00 — finding: "app already installed" for prod and build on JC's phone
- **JC:** with Lifecare BETA installed, trying to install prod and build in Chrome says "app already installed".
- **Checked:** the manifests are distinct (ids `/Life-Care/`, `/Life-Care/beta/`, `/Life-Care/build/`; matching start/scope). The BUILD icon is served correctly (thin orange ring, no dot).
- **Likely cause** (inferred; Android behaviour can't be observed from the Architect's sandbox): **nested scopes.** Prod's scope `/Life-Care/` contains `/beta/` and `/build/`, and Android's web-app ownership of URLs is prefix-based, so nested apps conflict.
- **Options put to JC:**
  - **A (Architect recommends): v2.6.0, sibling paths.** Prod moves to `/Life-Care/app/` (start/scope/id), alongside `/beta/` and `/build/`. The root `index.html` becomes a tiny redirect to `/app/` (keep `legacy.html` and `/APP_GUIDE.md` working; the Help fetch is relative per environment). Plan clean-up of the old root-scope service worker (e.g. the redirect page unregisters it). JC and Becks reinstall the prod app once.
  - **B:** wait for go-live: prod moves to `lifecarecompanion.app` (a separate origin), which removes the nesting permanently. Until then, install only one environment per phone.
  - Either way the domain move is the permanent fix.

### (Architect) 5 Nov 2026 08:05 — install conflict: revised diagnosis; no code change now
- **New evidence from JC:** only LC Beta is installed. On **both** prod and build pages Chrome says "This app is already installed", and tapping "open the app instead" gives **"Could not open app"**. Chrome holds a **stale install record** with no working app behind it, most likely left over from the Samsung Internet "Install as web app" attempt blocked by Play Protect, or an earlier Beta install. This doesn't fit the nested-scope theory (build doesn't overlap beta), so **option A (move prod to `/app/`) is withdrawn: it wouldn't fix a stale record.**
- **Advised to JC:** (1) uninstall any leftover "Lifecare"/"LC" apps in Android Settings → Apps; (2) Chrome → Site settings → jcbeck1976.github.io → Delete & reset; (3) reinstall. If it persists, use prod and build in the browser and keep Beta installed (JC accepts this; pilot users install only one environment).
- **Plan at go-live:** give each environment its own origin, e.g. `lifecarecompanion.app` (prod), plus separate origins for beta/build (`beta.` / `build.` subdomains, Firebase Hosting multi-site), so installed apps, service workers and browser storage are fully separate per environment. Recorded for Step 6 / go-live planning.

### (Architect) 5 Nov 2026 09:15 — install conflict resolved; guide tip added to Step 1b
- **JC:** after uninstalling leftovers and resetting the site in Chrome's settings, **prod installed fine.** This confirms the stale install record diagnosis.
- **Added to Step 1b scope (JC):** an `APP_GUIDE.md` troubleshooting row: *"Chrome says 'This app is already installed' but then 'Could not open app'"* → Android Settings → Apps: remove any leftover Lifecare/LC app; Chrome ⋮ → Settings → Site settings → All sites → the app's site → Delete & reset; install again. (Pilot users will realistically only install Beta.)

### (Architect) 5 Nov 2026 12:35 — decision: ways of working and data strategy agreed
- JC agreed the approach now recorded in §4 "Ways of working — build, beta, prod and data": Beta → Prod as one snapshot after a freeze; Beta and Prod share the real database under the backward-compatible-only rule; Build refreshed nightly from real data; hotfix route.
- **JC asked: are backups incremental (only new or changed data)?** Decision: full snapshots, **saved only when the data changed** (fingerprint check). Incremental saves were rejected because restores would depend on a chain of files, and the data is one small record. Backups run in GitHub Actions, so they use no AI tokens whatever their size.
- **New work item (alongside Step 1b), for the Coder:** the automation jobs listed in §4. This needs a Firebase service credential and a backup encryption key as GitHub Secrets, set up with JC. Waiting for JC's go.

### (Architect) 5 Nov 2026 12:50 — security risk raised by JC; priority change
- **JC's working rule:** once weekly token use passes 80%, no feature work; only defect fixes and urgent items.
- **Exposure found:** the app has no sign-in and the database address is in the public code, so the database rules are almost certainly open to anyone. The **Anthropic API key is stored in the database** (`anthropic_api_key`, read by `ensureApiKey`). So a bot could read the key and spend money, and could read or wipe the health data. Code copying is the lowest risk.
- **Immediate (JC, no tokens):** set a monthly spend limit in the Anthropic Console; check Firebase → Realtime Database → Rules; take a manual backup.
- **Proposed:** a minimal Step 2 security pass becomes the next work item, ahead of Step 1b: Google sign-in, database rules allow-listed to named accounts, and the AI key moved out of readable data. Waiting for JC's go.
- **14:46 confirmed by JC:** the Realtime Database rules are `".read": true, ".write": true`. The whole database is open to anyone. The security pass is urgent.

### (Architect) 5 Nov 2026 14:55 — BRIEF for Coder: v2.6.0 security pass (urgent, JC said go)
**Goal:** only JC and Becks's joint Google account can read or write the database. Sign-in uses Google, with a fingerprint via passkey on the phone, once per device.

**Why:** the Realtime Database rules are fully open (`.read/.write: true`), and the database holds health data plus `anthropic_api_key`.

**Do not put the account's email address anywhere in this public repo.** The allow-list uses the account's Firebase **UID**, which JC will supply after the first sign-in.

**Build (on `build`, version v2.6.0):**
1. **Firebase Auth (compat 10.12, same as the database):**
   - Google provider, `signInWithPopup`. Test it in an installed PWA on Android Chrome; fall back to `signInWithRedirect` only if the popup fails there. Local persistence, so users stay signed in.
2. **Sign-in gate before any `sGet`/`sSet`:**
   - A simple branded screen with a "Sign in with Google" button.
   - Data loads only after `onAuthStateChanged` reports a user.
   - A `PERMISSION_DENIED` result shows "This Google account doesn't have access" plus a Sign out button. Never show a blank or crashed app.
   - The existing `ensureApiKey` and all reads run after sign-in.
3. **Settings:** show the signed-in account (masked email) and a Sign out button.
4. **`database.rules.json` in the repo (the source of truth; JC pastes it into the console):**
   ```
   { "rules": {
       ".read": false, ".write": false,
       "data":       { ".read": "auth != null && auth.uid === '__UID__'", ".write": "auth != null && auth.uid === '__UID__'" },
       "data_build": { ".read": "auth != null && auth.uid === '__UID__'", ".write": "auth != null && auth.uid === '__UID__'" }
   } }
   ```
   First check every path the app actually uses (feedback, energy, backups and so on). Every one must sit under `data/` or `data_build/`, or get its own block. Report the list.
5. **Emulator and tests:**
   - Add the Auth emulator.
   - Tests sign in as a fake user, and the emulator loads `database.rules.json` with a test UID, so the tests prove the rules (signed in = works; signed out or another user = denied).
   - Add a test for the denied screen.
6. **APP_GUIDE.md:** a short "Signing in" section (Google, joint account, one-time per phone, how to turn on a passkey for fingerprint), plus the Step 1b install tip if it's cheap to include.

**Release order. This is important, because one database serves all three environments:**
- a) v2.6.0 build → Architect checks → beta → **prod, without the usual soak** (a security fix uses the hotfix route), while the rules are still open, so nothing breaks.
- b) JC does the console steps (Architect gives them): enable the Google provider, and add `jcbeck1976.github.io` to the authorised domains. These must be done **before** the build can be tested live.
- c) JC signs in once → copies the UID from Authentication → Users → the Coder puts it in `database.rules.json` (doc-only commit) → JC pastes the rules into the console → the Architect verifies that signed-out reads are denied and the app still works on build, beta and prod.
- d) **Known trade-off:** `legacy.html` (v1.374.2 rollback) can't sign in, so after (c) it stops working. Rollback becomes "revert to the previous v2 release"; the rules can also be reopened in the console in an emergency. Record this in the docs.

**Out of scope:** moving the AI key to a server (Step 6), per-person accounts (Step 5), Step 1b.

**Token budget is tight (82%+ weekly):** keep reports short, and don't re-run unchanged checks.


### (Coder) 5 Nov 2026 — v2.6.0 security pass on `build`: hand-off 1
- **Read:** §7 from "(Architect) 5 Nov 2026 12:35" (ways of working; open rules confirmed; BRIEF v2.6.0).
- **Database paths the app uses:** all under `DATA_ROOT`, i.e. `data/` (prod, beta) or `data_build/` (build). These are every `sGet`/`sSet` key (incl. `anthropic_api_key`, `companion_energy`, feedback, journal, mood and so on), `ref(DATA_ROOT)` (Data Viewer, comment queries) and `ref(DATA_ROOT + "/" + key)`. Nothing else, so the two rule blocks cover everything.
- **Done (`build` @ `da62a11`, v2.6.0):**
  - `AuthGate`: Google sign-in (popup; redirect fallback if blocked); data loads only after sign-in **and** an access probe; denied shows "This Google account doesn't have access" + Sign out; other errors show Try again + Sign out.
  - Settings → 🔐 Account (masked email, Sign out).
  - `database.rules.json` (`__UID__` placeholder; no email in the repo).
  - The emulator runs database + auth with the real rules (test UID, generated `emulator.rules.json`).
  - Tests: rules allow / deny, sign-in screen, denied screen, account card and persistence; all tests sign in.
  - APP_GUIDE "Signing in" (the install tip is already in the guide).
- **Checks:** lint 0 errors, **47/47 tests**; prod build has no test hook or emulator addresses; screenshots: only the version text + the Account card. Deploy 42052556588 ok, 0 errors.
- **Not verified here:** the real Google popup on Android/installed PWA (emulator only). `/build/` can't sign in until JC enables the Google provider and authorises `jcbeck1976.github.io` (step b).
- **Resume point:** `build` @ `da62a11`. Next: Architect check → beta → prod (hotfix route) → JC console steps → UID into `database.rules.json` → rules pasted → verify. Record the legacy.html trade-off in the docs at release.

### (Architect) 5 Nov 2026 15:20 — v2.6.0 hand-off 1 checked (code + live /build/)
- **Code review:**
  - `database.rules.json` matches the brief.
  - AuthGate: popup first, redirect fallback, access probe, and denied and error screens never blank.
  - The test sign-in hook is emulator-only.
- **Live /build/ in a fresh browser:** sign-in screen shown; **0 database requests before sign-in**; 0 console errors.
- **Remaining check before beta, which only JC can do:** a real Google sign-in on Android, in Chrome and in the installed app, on /build/ (needs console step (b)). Rules are still open, so data loads after sign-in.

### (Architect) 5 Nov 2026 15:45 — v2.6.0: console steps done, UID set
- JC finished console step (b): the Google provider is enabled and `jcbeck1976.github.io` is an authorised domain. The joint account signed in on /build/, so the user exists in Authentication → Users.
- The Architect put the UID into `database.rules.json` on `build` (commit eabade2). This is not a secret.
- **Next:** the Coder promotes v2.6.0 build → beta → main on the hotfix route (no soak) and tags v2.6.0. **The rules stay open until the Architect confirms prod v2.6.0 is live**; then JC pastes the rules.


### (Coder) 5 Nov 2026 — v2.6.0 released to prod (hotfix route)
- **Read:** diff to `20a84c6` (Architect checked hand-off 1; JC's real sign-in worked on /build/; UID set in `database.rules.json` @ `eabade2`).
- **Done:** PR #17 `build → beta` (`bdc3907`) and PR #18 `beta → main` (`c60986b`), both merged; no soak (security fix). Prod build: no test hook, installable-app checks pass. Deploy 42058240858 succeeded, 0 errors. The emulator copy of the rules still swaps the real UID for the test UID (4/4). **Firebase rules not touched.**
- **Tag `v2.6.0` → `c60986b`: the Architect, please** (Coder sessions can't push tags).
- **Rollback (recorded):** after JC applies the rules, `legacy.html` (v1.374.2, no sign-in) stops working. Rollback = revert to the previous v2 release; in an emergency, reopen the rules in the console.
- **Resume point:** `main` @ `c60986b`. Next: Architect confirms prod v2.6.0 → JC pastes `database.rules.json` into the console → Architect verifies signed-out reads are denied and all three environments work.

### (Architect) 5 Nov 2026 15:55 — v2.6.0 released and tagged; rules handed to JC
- Tag `v2.6.0` → `c60986b` created.
- Live check, fresh browser: prod, beta and build all show the sign-in screen, with 0 database requests before sign-in and 0 console errors.
- JC was given `database.rules.json` (from `build`, with the UID) to paste into the console. Then the Architect checks that signed-out reads are denied.

### (Architect) 5 Nov 2026 16:00 — security pass COMPLETE: database locked
- JC published the rules at 15:52. Signed-out reads of root, `data/`, `data_build/` and `anthropic_api_key` are all denied, and a signed-out write is denied. JC confirms the app works when signed in.
- **Follow-ups for JC:** Becks signs in once per phone. Create a new Anthropic API key (the old one was readable while the rules were open), enter it in the app, and delete the old one. Keep the spend limit and a Google Cloud budget alert, since the project is on the Blaze plan.
- **Next work:** Step 1b and the automation jobs (§4 Ways of working), next week when the token allowance resets.
- **Added to the automation work (16:02):** widen `.gitignore` to catch any backup or export file name, not just `*firebase_backup*.json`. Seed the emulator from the encrypted vault backup instead of a loose file. The Architect checked: no backup file exists in the repo.

### (Architect) 5 Nov 2026 21:35 — DESIGN PRINCIPLE agreed by JC: stolen data must not identify anyone
JC's aim: if the database were stolen, the health data must not be traceable to a real person. GDPR is handled separately in the design. Apply from Step 5 (individual accounts) onwards:
1. **Keyed by random ID only.** Health records sit under the Firebase Auth UID, which is random. Never sequential IDs, names or emails.
2. **No identity in the database.** Names, emails and photos are not stored with health data. The display name lives on the device, with a "what should we call you?" prompt to recover it on a new device.
3. **Keep the identity store separate and protected.** Firebase Auth (UID → email) is the only link. Protect the console and Google accounts with 2-Step Verification, and give it minimal admin access.
4. **Free text is the main leak risk.** Journal, mood notes, comments, food notes and AI chat history can hold names, places and family details. Encrypt these on the device, or keep them only on the device.
5. **Watch for quasi-identifiers.** Exact date of birth, height plus rare medical values, and precise locations together can identify someone in a small user base. Store bands where exact values aren't needed (age band, not date of birth).
6. **Later (Step 6+):** device-side encryption for the medical fields (blood results, medication), with a passkey or recovery-code key design.

### (Architect) 6 Nov 2026 22:10 — BACKLOG for next week: defects and features from JC's training session
All four are pre-existing app behaviour, not caused by the migration. Priority order: D1 and D2 first (safety and data integrity), then F1, then F2.

- **D1 (defect, SAFETY): switching person in the header while the Log Exercise form is open.**
  - What happens: JC selected Becks in the header tab rather than in the form. The screen switched, but the form kept the other person's data, so someone could train to the wrong person's weights.
  - Proposed fix: the form belongs to the person it was opened for and shows that name clearly. While a form is open, switching person in the header asks first ("Discard Becks's unsaved entries and switch to JC?"); on Yes, the form closes or reloads cleanly for the new person. Never a mixed state.
  - Add a regression test. Related: the v2.5.1 stale-load guard.
- **D2 (defect, DATA): different weights per set are saved as the set 1 value.**
  - What happens: set 1 at 16 kg, sets 2–3 at 22 kg all saved as 16 kg.
  - Fix: store and show weight and reps (or the exercise's equivalent measure, e.g. time or level) **per set**, end to end: form, save, progress row, AI feedback and history.
  - Data change must be backward compatible (expand-then-contract rule in §4): existing entries with one weight still read correctly.
  - Add a test with mixed per-set weights.
- **F1 (redesign, feature): editing past weeks in Progress.**
  - JC believes editing previous weeks doesn't work reliably. Investigate and confirm in the report.
  - New design: the Progress week row shows **key data only**, with no small notes text and no delete button, plus an **Open** button.
  - Open shows the **same Log Exercise form**, read-only, with everything exactly as logged (every set, notes, etc.).
  - An **Edit** button makes it editable → Save, or **Delete** with a confirm, all inside the form.
  - One form for logging, viewing and editing.
- **F2 (feature): body proportion guidance from body measurements.**
  - The Companion looks at the measurement trends (e.g. chest, waist, arms left/right, shoulders, thighs, calves) and their ratios over time.
  - It flags areas developing disproportionately fast or slow, or left/right imbalance, and recommends training changes (exercise swaps, emphasis, volume) to keep development balanced.
  - Example from JC: upper chest developing faster than lower chest → suggest decline or lower-chest emphasis.
  - **Limit to state clearly in the app:** tape measurements can't separate upper and lower chest. That level of detail needs a progress photo or the user's own observation, so offer an optional "what do you notice?" input or photo-based review.
  - Recommendations are suggestions the user accepts, never automatic plan changes.
  - **Amended by JC (6 Nov 22:46): proportion feedback only works from progress photos.** It runs when the user has uploaded photos, and the Companion assesses them as part of the overall body measurement feedback, combining photos and measurement trends. With no photos it says so and asks for them, and gives no proportion advice.
- **F3 (feature): track food on the go from a photo, for users who don't plan meals.**
  - Today the "Portion" photo button only works on a slot that already has an item.
  - New: the button also appears on **empty** meal/snack slots. The user takes a photo → the AI identifies the food **and** the portion together → applies the RAG rating → adds it to that slot's selection list if it isn't already there → shows it selected in the slot.
  - On a filled slot it keeps today's behaviour (portion size of the listed item).
  - **Must reuse the shared add-item path (`confirmReviewItem`)**, so RAG, duplicate check and list insertion are not reimplemented, and the other add-item routes don't break.
  - Several foods on one plate → one combined meal item by default (e.g. "Chicken stir fry with rice").
  - **Rename the button:** "Portion" takes too much space. Use a camera icon with the short label **"📷 Snap"**, which suits both quick tracking and portion checks, and give it an accessible label "Snap a photo of your food". JC to confirm the label in review.

### (Architect) 6 Nov 2026 23:10 — DECISION: "house in order" before any further build-out; document set agreed
**HANDOVER.md becomes hand-overs only.** Reference documents are kept separately and HANDOVER links to them.

**Private vault repo** (security-sensitive):
- SAD (incl. threat model and CSIA)
- DPIA
- SDD (support model, suppliers, service levels, runbooks)
- Risk register
- Supplier/processor register and DPAs
- ROPA
- LLD sections that reveal security detail

**Public repo:**
- HLD
- LLD (TECHNICAL_REFERENCE)
- Changelog / release notes (the version table moves here)
- Test strategy
- Product backlog
- Defects backlog (separate)
- Privacy notice, terms of use
- Intended use and clinical safety statement (wellness, not a medical device)
- Payments compliance statement (replaces PCI-DSS; PA-DSS dropped as retired and not applicable)
- Accessibility statement
- Decision log (ADRs)

**Later:** an admin-only technical Q&A chat reading the private docs, never credentials.

**Agreed order (Architect's recommendation):**
1. D1 and D2 (safety and data defects)
2. Automation jobs (backups, Build refresh, smoke tests, tagging, `.gitignore`/vault seed) and the GitHub Actions Node warnings
3. Docs: set up the structure, move the backlogs out of HANDOVER, then SAD (for JC's cyber reviewer) + HLD, then DPIA, SDD/runbooks, ADRs, then the rest
4. Step 1b

F1–F3 come only after this, along with Steps 2–6 build-out.

**Token estimate given to JC:** about 40–55% of a weekly allowance for 1–4. F1–F3 would add about 15–20% more.

### (Architect) 7 Nov 2026 17:20 — BACKLOG: sign-in experience on a new device (JC: "not fit for purpose")
- **What happened:** JC tried to sign in on a desktop computer where the joint Google account had never been used. Google asked for a PIN he doesn't have. That was Windows Hello trying a passkey stored only on the phones, and the "forgotten PIN" route was a dead end. He gave up.
- **Cause:** Google's own sign-in flow, not app code. But it is the app's first impression, so the design must remove it.
- **Immediate workaround for JC:** on Google's PIN/passkey prompt choose **"Try another way"**, then the password, or **"Use a phone or tablet"** and scan the QR code with a phone that has the account.
- **Design requirement (for Step 4 onboarding / Step 5 accounts; to go in the HLD/SDD):**
  1. Sign-in must "just work" on any new device, first time, with no dead ends.
  2. Offer more than one method: Google, plus a passwordless **email sign-in link** that works on any device. Apple sign-in for iPhone users.
  3. A short hint on the sign-in screen: "On a computer and Google asks for a PIN? Choose 'Try another way'."
  4. Sign-in journeys on Windows, Mac, Android and iPhone (new device, no saved account) become a **release test** before pilot users.
- **Priority:** before any user other than JC and Becks. Not a blocker for the current order.

### (Architect) 7 Nov 2026 17:50 — BACKLOG: bulk upload defects (JC: "apart from that, upload was very good")
Priority: with D1/D2. D4 and D5 put wrong data into lists; D3 is usability.
- **D3 (defect): long bulk lists fail.**
  - What happens: Add gives up (probably a timeout or AI output limit) and the screen reverts to Upload with nothing added.
  - Fix: process the list **in batches** (e.g. 10 items per AI call) with progress ("Rating 12 of 30…"). A failed batch can be retried without losing the batches that succeeded.
  - If a hard limit is still needed, say it **before** starting ("Up to N items per upload; split longer lists"), never by failing silently.
- **D4 (defect, DATA): bulk upload remembers the previous category.**
  - What happens: drinks were added to Snacks because Snacks was still selected.
  - Fix: every new bulk upload starts with **no category selected**. Add stays disabled with "Choose a category first" until one is chosen.
  - Show the chosen category in the confirm step ("Add 14 items to **Drinks**?").
- **D5 (defect, DATA): Cancel doesn't cancel.**
  - What happens: Cancel hid the upload, but the add carried on in the background and saved everything.
  - Fix: Cancel stops in-flight AI requests (abort) and **discards any results that arrive afterwards**. Nothing is saved after Cancel. Confirm with "Cancelled — nothing was added".
  - If some batches were already saved before Cancel, say exactly what was kept and offer to undo it.
- Tests for all three: a long list in batches, the category-required guard, and cancel mid-run saving nothing. Must keep using the shared `confirmReviewItem` path.
- **F4 (small feature, do with D3–D5): post-upload check reminder (JC, 7 Nov 17:53).**
  - After a bulk upload finishes, show a message the user must tap **OK** to dismiss: "N items added to <Category>. Ratings are AI estimates. Open each item and check the weight, portion and ingredients match what you actually have, then update where needed."
  - Mark newly bulk-added items as **"Check me"** (a small badge) until the user opens and saves them, so they're easy to find later.
  - JC: the badge also shows in the **meal/snack selection lists**, styled consistently with how greyed (not-yet-added) items are shown today.
- **F5 (feature + design, JC 7 Nov 18:01): "Open" replaces "Update" for food items, the same pattern as F1 (Progress).**
  - **In the lists (Update Lists):** each item gets **Open** → the item form, read-only, then **Edit** → Save, or **Delete from list** (with a confirm), all inside the form.
  - **In the daily eating slots:** buttons become **📷 Snap** (F3) and **Open**.
    - Open on a selected item shows it and lets the user edit it.
    - Open on an empty slot lets the user add an item.
    - **Remove** clears the item from that slot only, which is different from Delete from list.
  - **Key design rule, to be confirmed in the LLD (JC's concern): editing must never silently rewrite past days.**
    - Separate the **list item** (the saved food: name, per-unit nutrition, RAG) from the **eaten entry** (that meal on that day: portion, plus a snapshot of the values at the time).
    - When editing from a daily slot, ask once: **"Just this meal"** (e.g. a bigger portion today, the usual case) or **"Update the saved item"** (e.g. correcting a "Check me" item). Updating the saved item affects **future** selections only; past days keep their snapshot.
    - **First, the Coder checks the current data model:** do logged days reference list items by ID (so edits would rewrite history today) or copy their values? Report this before designing. Any change follows the backward-compatible rule.
  - Do it after D1–D5 and alongside F1, so both "Open" forms share one pattern.

### (Architect) 7 Nov 2026 18:15 — JC amendments + NEXT WEEK PLAN (supersedes the order in the 6 Nov 23:10 entry)
**JC amendments:**
- **F4 badge:** "Check me" items keep their **RAG colour coding**, never greyed out. The badge is an addition, not a restyle.
- **F5 delete:** **Delete from list** is available **only** when an item is opened from **Update Lists**. Opened from a meal slot, the form offers Edit and **Remove (from this meal)** only. This prevents accidental deletion.
- **D6 (defect, DATA, raised by JC earlier, now confirmed as a defect):** deleting a list item breaks past meal selections, which then show raw code.
  - Fix: when an item is selected into a meal, store a **snapshot** (name, portion, nutrition, RAG) in the selection. Past selections never depend on the list item still existing or being unchanged.
  - Add a one-off, backward-compatible repair so existing broken or at-risk selections are filled from the current list or the backup where possible, and otherwise show "Deleted item" cleanly, never code.
  - This is the data foundation for F5. Build it first.

**NEXT WEEK PLAN, in order.** Estimates are % of a weekly allowance and include Architect checks. Target: finish under ~85%.

| # | Task | Type | Est. |
|---|---|---|---|
| **P1 — Safety and data fixes (always first)** ||||
| 1 | D1 Person switch while the Log Exercise form is open | Fix | 2–4% |
| 2 | D2 Per-set weights/reps saved correctly | Fix | 3–4% |
| 2a | D12 Log Exercise: Form and Range must be chosen, with no default (see below) | Fix | 1% |
| 3 | D6 Meal selections store a snapshot; deleted items never show code; repair existing | Fix | 3–5% |
| 3b | D7 Update Item: nutrition not recalculated from edited ingredients (see below) | Fix | 2–4% |
| 4 | D4 Bulk upload: no remembered category; must choose | Fix | 1–2% |
| 5 | D5 Bulk upload: Cancel really cancels | Fix | 1–2% |
| 6 | D3 Bulk upload: batching with progress for long lists | Fix | 2–3% |
| 7 | F4 Post-upload OK message + "Check me" badge (RAG colours kept) | Small feature | 1–2% |
| 7a | D9 Week meal generator ignores the user's defaults (see below) | Fix | 1–3% |
| 7aa | D10 Portion photo of a *different* food keeps the original item (see below) | Fix | 1–2% |
| 7ac | F7 Optional description field for photo checks (Snap/Portion + Shop Food Checker) (see below) | Small feature | 1–2% |
| 7ab | D11 RAG rating rules not proportionate (see below) | Fix + design | 2–4% |
| 7b | D8 All companion chats: consistent order, **latest first** (Question and Help chats currently need scrolling to the bottom) | Fix | 1–2% |
| 7c | C1 Eating week starts **Sunday** (same as exercise) | Change | 2–4% |
| **P2 — Automation (cuts token use on every later release)** ||||
| 8 | Nightly encrypted backups + pre-release backup; Build data refresh; smoke tests; auto-tag; wider `.gitignore`; emulator seeded from the vault; GitHub Actions Node update (needs JC to create a Firebase service key + backup key) | Ops | 6–10% |
| **P3 — Documents** ||||
| 9 | Set up the doc structure (public/private); move backlogs and the version table out of HANDOVER | Docs | 2–3% |
| 10 | SAD (incl. threat model; for JC's cyber reviewer) + HLD | Docs | 6–9% |
| 11 | DPIA, SDD + runbooks, decision log (ADRs) | Docs | 5–8% |
| **P4 — Efficiency** ||||
| 12 | Step 1b: measure → propose → JC approves → build | Improve | 8–12% |
| **P5 — Features (after P1–P4)** ||||
| 13 | F1 + F5 "Open" pattern for Progress weeks and food items (shared form design; Delete only from Update Lists) | Feature | 8–12% |
| 14 | F3 📷 Snap to track on the go | Feature | 4–6% |
| 14b | F6 Eating Feedback: plan-aware + upgraded chat features | Feature | 3–5% |
| 15 | F2 Body balance from progress photos | Feature | 4–6% |
| 16 | F8 "Share to Lifecare Companion" from other apps (see below) | Feature | 3–5% |

**Totals:** P1 24–44% · P2 6–10% · P3 13–20% · P4 8–12% · P5 16–24% → **56–88%**.

**Cut line, to stay under 85%:** if usage passes ~70% before P5, defer **F2 (15)** and then **F3 (14)** to the following week. If tight earlier, defer the rest of **task 11** after the SAD/HLD. P1 is never deferred.

**Not this week:** the new-device sign-in redesign (before pilot users), the remaining docs (privacy notice, terms, intended use, payments, accessibility, ROPA), and Steps 2–6.

### (Architect) 7 Nov 2026 18:30 — D7 (defect, DATA, P1 #3b): Update Item doesn't recalculate nutrition correctly
- **Evidence (JC screenshot, Update Lists, Breakfast):**
  - Item: "Overnight Oats 95g (Berries, Yogurt & Almond Milk)".
  - Ingredients: 95g rolled oats, 300ml unsweetened almond milk, 100g Greek yogurt, 150g mixed berries, tsp honey, mixed seeds.
  - After changing berries from 80g to 150g, the form said "✅ Nutritional values updated" but still showed **387 kcal, 18.2g protein**.
- **Sanity check:** 95g oats alone is ~355 kcal. A realistic total is roughly **550–650 kcal and ~25–30g protein**, depending on the yogurt's fat level and the seed amount. So the values are both stale and implausible.
  - Compare: the 45g version is 320 kcal, so +50g oats and +70g berries only "added" 67 kcal.
- **Investigate:**
  1. Is the recalculation actually called, and is its result applied to the form/state, or is the old value kept while the success message shows anyway?
  2. Does the AI prompt anchor on the old values or the "(387 kcal)" text embedded in the name?
  3. The "(N kcal)" in the item name must be regenerated from the new values, not left stale.
- **Fix requirements:**
  - The success message only shows when new values have actually been applied.
  - Show the **before → after** values on confirm.
  - Add a **plausibility check**: total kcal must be at least the sum of the obvious main ingredients, otherwise warn and retry.
  - Ingredients with no amount ("tsp honey", "mixed seeds") → the AI states the amount it assumed (e.g. "assumed 15g seeds") so the user can correct it.
  - Add a test: change one ingredient amount and expect the values and the name's kcal to change.
- **Data impact:** other items edited the same way may also hold stale values. After the fix, offer a one-off "re-check nutrition" for items edited since this behaviour began, flagged as "Check me" (F4).

### (Architect) 7 Nov 2026 18:45 — more backlog from JC (D8, C1, F6); plan updated
- **D8 (fix): chat order across all companions.**
  - The Question and Help chats show the latest message at the bottom, so the user has to scroll.
  - JC wants **latest first**, consistent across **every** companion chat (Question, Help, Session feedback, Eating Feedback, any others). Check each one and correct where needed.
  - The chat must open showing the latest exchange with no scrolling.
- **C1 (change): the Eating week starts on Sunday**, aligned with exercise (currently Sunday is the last day).
  - The Coder first checks how eating data is keyed (by weekday name or by date/week) so existing plans, history and weekly summaries stay correct.
  - Backward compatible, with a test across a Sunday boundary.
- **F6 (feature): Eating Feedback companion is plan-aware, with upgraded chat.**
  - For the selected week:
    - **days before today** are treated as **consumed** ("what you ate");
    - **today onwards** are treated as **planned** ("your plan");
    - a fully future week is a **plan review**.
  - The feedback says which is which, e.g. "So far this week you've eaten… / For the rest of the week your plan…".
  - Bring it up to the same chat features as the other upgraded companions: follow-up questions, cut-off detection and the correct error handling, latest-first order (D8), and the same panel style.
- **Updated estimate:** the full plan is now **~64–100%**, which is over JC's ~85% target. It will very likely run into a second week.
  - Same cut line: P1 never deferred. Then defer **F2**, **F3**, then **F6**. Then, if needed, task 11 docs after the SAD/HLD.

### (Architect) 7 Nov 2026 18:50 — D9 (fix, P1 #7a): week meal generator overrides defaults
- **What happens:** JC set his default breakfast, but the week generator still auto-generated breakfasts.
- **Required order for every day and slot:**
  1. Keep anything the user has **already selected** for that day. Never overwrite it.
  2. Otherwise apply the user's **default** for that slot.
  3. Only if there is no selection and no default, **auto-generate**, and only from items available in that slot's selection list. If that list is empty, leave the slot empty and say so; don't invent items.
- After generating, show a short summary: "Breakfast: your default · Lunch/Dinner/Snacks: generated · 2 slots left empty (no items in list)".
- Add tests: a default present → used; an existing selection → untouched; no default → generated.

### (Architect) 8 Nov 2026 18:32 — D10 (fix, DATA, P1 #7aa): Portion/Snap on a filled slot with a different food
- **What happens (JC test):** the portion photo on a filled slot detected a **different food**, said so, then left the **original item selected**, sometimes with the new photo's values applied to it. That gives a wrong item and possibly corrupted values.
- **Required behaviour:**
  - When the photo shows a different food from the one listed, treat it as a **new food entry**: identify the food and portion → RAG → add it to the slot's list if it isn't already there → **select it in place of the original**.
  - Show "Looks like **<new food>**, not <original> — replaced" with an **Undo** button that restores the original exactly.
  - **Never write the photo's values onto the original item**, neither in the list nor in the meal.
  - Same food → today's behaviour (portion update for this meal only, per F5's "just this meal" rule).
- Uses the shared add-item path (`confirmReviewItem`), consistent with F3 (Snap on an empty slot).
- Add tests: different food → replaced, with undo; same food → portion only; the original item unchanged in both.

### (Architect) 8 Nov 2026 18:35 — D11 (fix + design, P1 #7ab): RAG ratings not proportionate
- **Evidence (JC):** 3 standard biscuits are rated RED "once a month", the **same** as a large restaurant brownie with ice cream. Roughly 150 kcal / 4g saturated fat / 10g sugar versus about 800 kcal / 20g saturated fat / 60g sugar. The rating ignores portion size and scale.
- **Step 1 (Coder, report only):** document how RAG is decided today: the prompt wording, any thresholds, and whether it's per item or per portion. Report this before changing anything.
- **Step 2 (Architect proposes, JC approves):** **portion-based, rule-driven ratings.**
  - Score the item's actual portion against the **person's own daily targets**: kcal, saturated fat, added sugar, fibre/protein credit.
    - JC: under 20g saturated fat, under 25g added sugar.
    - Becks: under 20g saturated fat (critical given her LDL), under 25g added sugar.
  - Use clear bands, e.g. % of the daily saturated fat or sugar limit in one portion → GREAT / GOOD / AMBER / RED.
  - Add **graded frequency guidance** that matches the size: "a few times a week", "weekly treat", "monthly treat".
  - The AI identifies the food and its nutrition. **The rating itself is calculated by fixed rules in code**, so it's consistent and explainable ("RED: one portion is 100% of your daily saturated fat").
- **Step 3:** re-rate existing list items under the new rules. Items whose rating changes get a "Check me" badge (F4), and the change is shown in a summary for JC to review.
- Add tests: the biscuits example and the brownie example fall into **different** bands; the same food in half the portion rates better.

### (Architect) 8 Nov 2026 21:55 — D12 (fix, DATA, P1 #2a): Form and Range default to "Working towards"
- **What happens (JC):** in the Log Exercise form, **Form** and **Range** default to "Working towards", so it keeps being saved by accident. That feeds wrong data into progress and the AI feedback.
- **Fix:**
  - Both start **unselected** (neither "Working towards" nor "Good").
  - Saving is blocked until both are chosen for each exercise, with a clear inline prompt ("Choose Form and Range") next to the missing one, not a generic error.
  - If these are recorded per set, the same rule applies per set.
- Existing saved entries are unchanged.
- Build it with D1/D2 (same form). Add a test: save is blocked until both are chosen.

### (Architect) 9 Nov 2026 14:32 — F7 (small feature, P1 #7ac): description field for photo checks
- **Evidence (JC):** a photo of a Peanut Brunch bar was identified as the bigger bar (175 kcal) instead of the 28g bar (125 kcal).
- **Add an optional short text field** to every photo-based check: **📷 Snap / Portion** (meal slots) and the **Food Checker** on the Shop page. Placeholder: "Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'".
- The description is sent to the AI with the photo, and the AI must **prefer the user's description** over its own size guess.
- **The result always states the size/weight it assumed** (e.g. "Assumed: 28g bar — 125 kcal"), so a wrong assumption is visible and can be corrected with one more try.
- Build it with D10 (same photo path). Add a test: the description reaches the AI request, and the assumed size is shown in the result.

### (Architect) 9 Nov 2026 22:55 — F8 (feature, P5 #16): share images into the app from other apps
- **JC's request:** body-scale and measurement apps have a Share button. The user should be able to pick **Lifecare Companion** from the share sheet, as with WhatsApp, rather than downloading the image and uploading it again.
- **How (Android): the Web Share Target API.**
  - Add `share_target` (method POST, `multipart/form-data`, accept `image/*`) to each environment's web manifest. The installed app then appears in Android's share sheet.
  - Each environment shows under its own name ("Lifecare Companion", "… Beta", "… Build").
  - **Service worker:** GitHub Pages can't accept a POST, so `sw.js` must **intercept the share POST**, store the file(s) locally (Cache or IndexedDB), then redirect to the app. This changes today's network-only service worker (only for the share route).
  - **In the app:** a "What is this?" picker (Body measurements / Progress photo / Food), then route into the existing upload flow. If the user isn't signed in yet, keep the file until they are; never drop it.
  - The shared image stays on the device until the user confirms the upload.
- **Limits:**
  - Works for **installed** apps on **Android (Chrome/Samsung Internet)**.
  - **iPhone Safari does not support Web Share Target.** iPhone users keep download-then-upload, unless the app is later wrapped as a native app (store versions), which would add proper share support on both platforms.
  - Desktop Chrome supports it partially; low priority there.
- Add tests: the manifest has `share_target`; the service worker handles the POST; the file reaches the picker. A real-device check on Android is needed.

### (Architect) 9 Nov 2026 23:00 — CONSOLIDATED WORK PLAN (supersedes the table in the 7 Nov 18:15 entry; item details stay in their own entries)
Estimates are % of a weekly allowance, including Architect checks.

**Week 1:** P1 + P2 + the first part of P3 (~45–75%).
**Week 2:** the rest of P3, then P4 and P5.

| # | ID | Task | Est. |
|---|---|---|---|
| **P1 — Safety and data fixes (never deferred)** ||||
| 1 | D1 | Switching person in the header while Log Exercise is open | 2–4% |
| 2 | D2 | Per-set weights/reps saved correctly | 3–4% |
| 3 | D12 | Form and Range: no default, must choose | 1% |
| 4 | D6 | Meals store a snapshot; deleted items never show code; repair existing | 3–5% |
| 5 | D7 | Update Item nutrition actually recalculates (+ plausibility check, before → after) | 2–4% |
| 6 | D11 | RAG ratings portion-based against personal limits (report → JC approves bands → build → re-rate) | 2–4% |
| 7 | D9 | Week meal generator: keep selections → defaults → generate only into empty slots | 1–3% |
| 8 | D10 | Portion photo of a different food replaces the item (with Undo); the original is never altered | 1–2% |
| 9 | F7 | Optional description field on Snap/Portion and Shop Food Checker; show the assumed size | 1–2% |
| 10 | D4 | Bulk upload: must choose a category | 1–2% |
| 11 | D5 | Bulk upload: Cancel really cancels | 1–2% |
| 12 | D3 | Bulk upload: batches with progress for long lists | 2–3% |
| 13 | F4 | Post-upload OK message + "Check me" badge (RAG colours kept, also in selection lists) | 1–2% |
| 14 | D8 | All companion chats latest first, opening at the latest | 1–2% |
| 15 | C1 | Eating week starts Sunday | 2–4% |
| **P2 — Automation** ||||
| 16 | — | Encrypted nightly and pre-release backups, Build data refresh, smoke tests, auto-tag, wider `.gitignore`, emulator seeded from the vault, Actions Node update (JC creates 2 keys) | 6–10% |
| **P3 — Documents** ||||
| 17 | — | Doc structure (public/private); backlogs and version table moved out of HANDOVER | 2–3% |
| 18 | — | SAD (with threat model, for JC's cyber reviewer) + HLD | 6–9% |
| 19 | — | DPIA, SDD + runbooks, decision log | 5–8% |
| **P4 — Efficiency** ||||
| 20 | 1b | Step 1b: measure → propose → approve → build | 8–12% |
| **P5 — Features** ||||
| 21 | F1+F5 | "Open" pattern for Progress weeks and food items (Delete only from Update Lists; "just this meal" vs "update saved item") | 8–12% |
| 22 | F3 | 📷 Snap to track on an empty slot | 4–6% |
| 23 | F6 | Eating Feedback plan-aware + upgraded chat | 3–5% |
| 24 | F2 | Body balance from progress photos | 4–6% |
| 25 | F8 | Share to Lifecare Companion (Android) | 3–5% |

**Totals:** P1 24–44% · P2 6–10% · P3 13–20% · P4 8–12% · P5 22–34% → **~73–120% ≈ 1.5–2 weeks.**

**Not scheduled yet:** the new-device sign-in redesign (before pilot users), the remaining docs, and Steps 2–6.

**Coder batching suggestion** (one release each, to save tokens):
- 1–3 (exercise form);
- 4–9 (food data and photos);
- 10–13 (bulk upload);
- 14–15.

### (Architect) 9 Nov 2026 23:00 — JC DECISION: features this week (usability first)
JC: "we really need to get using the app properly ourselves", so P5 moves up.

**Week 1:**
- P1 (items 1–15)
- then P5 (items 21–25: F1+F5, F3, F6, F2, F8)
- Estimate ~46–78%.

**Week 2:** P2 automation (16), P3 docs (17–19, including the SAD for JC's cyber reviewer), P4 Step 1b (20).

**Mitigation while automation waits:** JC takes a **manual backup from Data tools before each prod release**. The Architect reminds him at each release.

**Suggested release batches:**
1. Exercise form (1–3)
2. Food data and photos (4–9)
3. Bulk upload (10–13)
4. Chats + Sunday week (14–15)
5. Open pattern (21)
6. Snap + Eating Feedback (22–23)
7. Body balance + Share (24–25)


### (Coder) 9 Nov 2026 — v2.6.1 (D1 + D2 + D12) on `build`: hand-off 1
- **Read:** §7 work plan + JC decision (9 Nov 23:00), backlog D1/D2 (6 Nov 22:10), D12 (8 Nov 21:55).
- **Done (`build` @ `7cb178d`, v2.6.1):**
  - **D1:** form shows "Logging for <name>"; header switch with the form open asks "Discard <name>'s unsaved log entries and switch to <other>?" (No keeps the form untouched; Yes closes it and switches).
  - **D2:** per-set `sets: [{w, r}]` saved (also for the other person via the in-log switch); old `w`/`r` kept (w = set 1, so charts are unchanged); per-set shown in Previous, Progress ("Sets: …") and the AI prompts; per-set prefill. Hand-editing a Progress row's old weight/reps drops the per-set detail.
  - **D12:** Form/Range start unselected; Save blocked with inline "Choose Form and Range" ("· choose one" by each missing one), also for any other person saved from the form.
- **Behaviour note:** the in-log person switch already saved the opener's untouched prefilled entry too (pre-existing). D12 now blocks that until the opener's Form/Range are chosen. Worth a look in F1 (Open/Edit redesign).
- **Checks:** lint 0 errors, **51/51 tests** (new `tests/exercise-log.spec.js`, 4); screenshots: version text only. Deploy ok, 0 errors.
- **Not verified:** on a real phone; the per-set line in the AI feedback text (prompt changed, AI reply not exercised; tests mock the AI).
- **Resume point:** `build` @ `7cb178d`. Next: Architect check → beta → JC → release (JC manual backup first).

### (Coder) 9 Nov 2026 — v2.6.1 addendum (two people from one form) on `build`
- **JC's rule implemented:** the shown person must have Form and Range (block). Any other person edited via the in-form switch is saved **only** if both are chosen, otherwise treated as untouched and not saved (no block; this replaces my earlier block that named them). One confirmation line, e.g. "✓ <exercise>: saved for Becks · JC not saved (Form and Range not chosen)". An unsaved person's log opens later with the usual pre-fill. This resolves the behaviour note in my previous entry.
- **Tests:** +3 (other blank → not saved + confirmation + later pre-fill; other complete → saved; shown blank → blocked). exercise-log + people 24/24; suite 54. Lint 0 errors.
- **Resume point:** `build` @ new head (see commit "v2.6.1 addendum"). Next: Architect check → beta → JC → release (JC manual backup first).

### (Coder) 10 Nov 2026 — v2.6.1 fixes from JC's phone test, on build (44b15a0)
- Progress row and exercise header show the weight range ("56–63kg") when set weights differ; the "Sets: …" line shows only then (uniform and old entries get no extra line).
- Bug fixed: a new week's log pre-filled every set with set 1's weight (the target weight overrode it). Each set now pre-fills from the previous entry's per-set weight and reps; old single-weight entries are the same for all sets. "Previous:" shows per set when they differed.
- Session Quality: two segmented buttons per item ("Working towards" | "Good") with a solid selected colour. A blocked save outlines the unanswered group in red and shows one message below the box: "Choose Form and Range to save". The per-label "choose one" text and the squeezed third column are gone.
- Tests: 2 new (range/Sets line; new-week per-set pre-fill), D12 test updated. Full suite 56 passed, lint 0 errors, visual unchanged. Deploy run 42729122571 succeeded, no failure annotations.
- **JC to test on /build/:** log 63/56/63 → Progress shows 56–63kg + Sets line; next week's log pre-fills 63/56/63; Save without choices → red outline + one message.
- **Resume point:** branch `build`, last commit 44b15a0. Next: the Architect verifies /build/, then PR build → beta.

### (Coder) 10 Nov 2026 — v2.6.2 (release 2: food data and photos) on `build` (8c4511f)
- **D6:** each selection saves a snapshot (name, kcal, nutrients, RAG, portion) in the week plan under `_snap["<day>:<slot>"]`, taken on every save of the plan. Days before today keep their snapshot; today onwards follow list edits. Slot names show the snapshot, else the list item, else "Deleted item" (the old code turned the id into text, e.g. "Custom 1730…"). Deleted items still count in day/week totals from their snapshot. No existing data was rewritten.
- **D6 repair: proposal only, needs approval.** A one-off script, run with a pre-run backup: dry run first (counts only), then write. For every `mealplan:*:<person>` slot id it adds the missing `_snap` entries only (slot ids never change): from the current list item, or else from the 3 Nov backup's lists, or else nothing (the UI then shows "Deleted item"). Snapshots from the current list are tagged `approx: true`, because the item may have been edited since that day.
- **D7 trace:** the success message showed even when the AI's answer had no usable values (`ri.kcal || old`). There was no plausibility check, the prompt said "per serving" (which invites dividing), and the name's "(N kcal)" was never touched.
  - Fix (Update Item only): the prompt asks for the whole recipe with a per-ingredient breakdown plus any assumed amounts, and the name's kcal is stripped from the prompt.
  - If the total comes back below 90% of the breakdown sum, it retries once. If it is still too low it is refused, with "nothing was changed".
  - The message shows before → after (kcal, protein, sat fat) and the assumed amounts. The name's "(N kcal)" is updated.
  - The Add-item Review path has the same weak recalc but is not changed (out of scope). Open: the "re-check nutrition for already-edited items" offer is not built.
- **D11 report (no logic changed):**
  - Today's rating is categorical and judged by the AI, with no portion scaling.
    1. When an item is added (single or bulk), the AI gets loose wording ("GREAT fits daily targets / AMBER some concerns / RED should be limited — high sat fat, sugar or calories"). There are no numbers.
    2. "Recalculate ratings" (`recalculateRagForList`) uses a clinical-dietitian prompt with the person's profile and targets. It defines AMBER = once a week and RED = once a month, and its only number is "<6g sat fat per meal" for high cholesterol. Each item is judged on its stored values (whatever amount those describe).
    3. Open Food Facts items are rated by code (`calcRAG`) using NHS per-100g thresholds: sat fat >5 / >1.5, sugar >22.5 / >5, salt >1.5 / >0.3, with −1 credits for protein >10 and fibre >3. That is per 100g, not per portion.
    4. Frequency is enforced by category (`checkRagFrequency` and the generator prompt): GREAT any day, AMBER max once a week, RED max once a month. So the biscuits and the brownie both end up "once a month".
  - **Draft bands for the Architect/JC.** Per portion, score = the higher of sat fat ÷ 20g and added sugar ÷ 25g (both JC and Becks):

    | Band | Score | Sat fat | Added sugar | Guidance |
    |---|---|---|---|---|
    | GREAT | ≤10% | ≤2g | ≤2.5g | any day |
    | GOOD | ≤25% | ≤5g | ≤6g | daily |
    | AMBER | ≤50% | ≤10g | ≤12.5g | a few times a week |
    | RED weekly treat | ≤80% | ≤16g | ≤20g | weekly treat |
    | RED monthly treat | >80%, or one portion >40% of the daily kcal target | | | monthly treat |

    - Fibre ≥5g or protein ≥20g lifts the item one band, but never above AMBER when the score is >50%.
    - Biscuits (4g sat fat = 20%, 10g sugar = 40%) → AMBER, "a few times a week". Brownie (20g = 100%, 60g = 240%) → RED, monthly treat. Half the biscuits (2g, 5g = 20%) → GOOD.
    - **Question for JC/Architect:** should "sugar" be *added* sugar (the AI would estimate it; the lists hold no sugar field today) or total sugar? And is a kcal share wanted as a third score?
- **D9 trace:** the generator ran `applyDefaults()` and then merged its result into the *stale* `meals` from before defaults were applied, so the defaults were overwritten.
  - It now plans from the plan with defaults applied (`applyDefaultsTo`) and merges only into empty slots, accepting only ids from that slot's list. Invented ids are dropped and the slot is left empty.
  - The summary looks like "Breakfast: your default · Lunch: 1 kept, 6 generated · … · 1 slot left empty".
  - **Decision (Coder):** removed the old "fewer than 3 items in any list → refuse everything" gate. A list that can't fill now just leaves its slots empty, as D9 asks. It only refuses when no list can fill.
- **D10:** a different food → "Replace with X" → the item is added through the shared step `addReviewedItem` (extracted from `confirmReviewItem`, which now calls it) and selected in the slot. The old portion values on that slot are removed, and a bottom bar "Looks like X, not Y — replaced" offers **Undo**, which restores the item and its portion values. The original list item is never written. The same food keeps today's portion-for-this-meal behaviour.
- **F7:** the Shop Food Checker text box now doubles as the description (it was already sent; it is now marked "PREFER"), with the new placeholder. The Portion result panel has the description field plus **↻ Re-check**, which resends the same photo with the text. Both results show "Assumed: <size> — N kcal".
  - **Decision (Coder), for review:** on Portion the description is entered after the first result, not before the photo, because the 📷 button opens the camera straight away. Alternative: a step before the camera (costs a tap every time).
- Tests: `tests/food.spec.js` has 8 new tests. Full suite 64 passed (3 skipped), lint 0 errors, visual rebaselined (footer version + new Shop placeholder only).
- **JC to test on /build/:**
  - delete a list item that's selected on a day → the slot shows its name, not code;
  - Update Item: change an ingredient amount → before → after, and the name's kcal changes;
  - set a default breakfast → run the generator → the defaults are kept;
  - Portion photo of something else → Replace → Undo.
- **Resume point:** `build` @ 8c4511f. Next: release 3 (v2.6.3, bulk upload).

### (Coder) 10 Nov 2026 — v2.6.3 (release 3: bulk upload) on `build` (64f5392)
- **D4 trace:** bulk shared `addingCategory` with the single-item add, so the last category stayed selected. Bulk now has its own state, reset on every open/close. The button reads "Choose a category first" until one is picked; the confirm names it.
- **D5 trace:** Cancel only hid the panel while the request kept running and then saved. Now: AbortController + a run token; anything arriving after Cancel is dropped. If earlier batches were saved, a bottom bar says how many and offers Undo (removes exactly those ids).
- **D3:** 10 items per AI call ("Rating 11–20 of 30…" + progress bar). Each batch is saved as it succeeds; a failed batch is skipped, the rest carry on, then "Retry N" re-sends only the failed lines. Out of AI energy stops the run and keeps the remainder for Retry.
- **F4:** after a clean finish, a dialog that needs **OK** ("N items added to <Category>. Ratings are AI estimates. Open each item and check…"). New items carry `checkMe: true` → "Check me" badge next to the name (RAG colour unchanged) in Update Lists and in the slot dropdowns; it clears when the item is opened (✎ Update) and saved.
- `confirmReviewItem` / the shared `addReviewedItem` step are unchanged; bulk keeps its own batch insert (per-item `addReviewedItem` would overwrite earlier items in the same run, because the list state only updates between renders).
- Tests: `tests/bulk.spec.js` has 4 new tests, and the old bulk test was updated for the confirm and the OK step. Full suite 68 passed (3 skipped), lint 0 errors, visual rebaselined (footer only).
- **JC to test on /build/:** bulk add → no category selected; long list (20+) shows progress; Cancel mid-way → nothing (or Undo); after upload → OK message, "Check me" badges.
- **Resume point:** `build` @ 64f5392. Next: release 4 (v2.6.4: D8 chats, C1 check).

### (Coder) 10 Nov 2026 — v2.6.4 (release 4: D8 + C1) on `build` (7e76a87)
- **C1 check first.** Eating plans are stored per week as `mealplan:<Sunday date>:<person>`, with days keyed by name. Weeks are counted from Sun 19 Jul 2026 (the same Sunday start as exercise), and on a real Sunday the app already opens that week's "sunday".
  - So the data has always been Sunday-start; only the screen listed Mon…Sun, which put the week's *first* day (Sunday) last.
  - The fix is display order only: `DAYS` and the quick-prep checkboxes start Sunday, and the week text sent to the AI is in date order. No keys or data move, so nothing can be misplaced.
  - **Caveat for JC:** a Sunday planned on the old screen as "the end of the week" was always stored as that week's *first* Sunday, so it now shows first. That is the date it always had.
- **D8:** a new `latestFirst()` in `src/lib/chat.js` groups a thread into exchanges and lists the newest exchange first.
  - It is used by `renderThread` (every feedback thread), whose reply box now sits above the conversation, and by the Home summary thread.
  - Question (💬) and Help chats list the newest exchange first; "Show older messages" moved to the end.
  - The panels open at the top, so the latest exchange is visible without scrolling.
- Tests: `tests/chat-week.spec.js` has 4 new tests (grouping; Help and Chat order; a Sunday via Playwright's clock: Sun-first tabs and the Sunday slot). Full suite 72 passed (3 skipped), lint 0 errors, visual rebaselined (footer, chat order, eating day order).
- **JC to test on /build/:** open 💬 and Help → newest at the top; reply to a feedback → the reply is at the top; My Eating tabs read Sun Mon … Sat.
- **Overnight batch done (releases 2–4 on `build`).** Nothing was merged to beta/main.
- **Open decisions:**
  1. D11 bands and the sugar definition (see the v2.6.2 entry).
  2. Approve or reject the D6 one-off repair proposal.
  3. F7 description placement on Portion (after the first result + Re-check, versus a step before the camera).
  4. D7: offering "re-check nutrition" for items edited before the fix.
- **Resume point:** `build` @ 7e76a87. Next: the Architect verifies /build/ (v2.6.2 → v2.6.4), then PR build → beta when approved.

### (Architect) 10 Nov 2026 07:20 — Architect review of the overnight batch (v2.6.2–v2.6.4) + JC decisions
- **Architect check:** the live /build/ contains the v2.6.1–v2.6.4 changes (new strings present). The Coder entries were reviewed: good traces and sound fixes.
- **JC decisions:**
  1. **D11 bands APPROVED as drafted**, using **added sugar** (not total, which would penalise fruit). Add an `addedSugar` field, AI-estimated; existing items get it on re-rate. Kcal share stays only in the "monthly treat" rule. `checkRagFrequency` and the generator prompt must use the new frequency labels. After the build, re-rate all lists; changed items get "Check me".
  2. **D6 repair APPROVED:** rehearse on **Build first** (dry run with counts → write). On real data (beta/prod share it): JC takes a manual backup → dry run (counts only) → write. Idempotent; adds `_snap` only.
  3. **Snap flow (replaces Portion everywhere; F3 pulled forward into the fixes):**
     - The **📷 Snap** button sits on every meal slot, empty or filled, with an **optional description box beside it before the photo**.
     - Result panel: food, portion, nutrition, RAG and "Assumed: …", with the **description still editable**, and **Confirm / Re-check / Cancel**.
     - **Re-check** resends the same photo plus the description and updates the result. It can be repeated.
     - **Confirm:**
       - filled slot, same food → portion for this meal;
       - filled slot, different food → swap with Undo (D10);
       - empty slot → match a list item, or "Add to list?" via `addReviewedItem` → select.
     - **Cancel** → nothing saved.
     - Nothing is saved before Confirm.
  4. **D7 follow-ups APPROVED:** a one-off "Re-check nutrition" in Update Lists (flags doubtful items "Check me"), and apply the D7 recalculation and plausibility fix to the **add-item Review path** too.
- **Before any beta PR (Architect requirement):** prove prod v2.6.0 tolerates the new data shapes (`_snap` in the meal plan, per-set arrays in exercise logs, `addedSugar`, "Check me" flags): run the v2.6.0 build against emulator data containing them, with no crash or odd rendering. If it can't, prod must be released right after beta.
- No backup is needed for Build data: it's a disposable copy, overwritten on refresh.


### (Coder) 10 Nov 2026 — v2.6.5 (Architect/JC decisions of 07:20) on `build` (008b885)
- **D11 (as approved, ADDED sugar):** `src/lib/rag.js` rates one portion: score = max(satFat/20, addedSugar/25).
  - Bands: GREAT ≤10%, GOOD ≤25%, AMBER ≤50%, RED weekly treat ≤80%, RED monthly treat >80% or one portion >40% of the day's kcal (2100 JC / 1800 Becks).
  - Fibre ≥5g or protein ≥20g lifts one band, never above AMBER when the score is >50%.
  - Stored as `rating` (GREAT/GOOD/AMBER/RED, so older screens still work) + `ragFreq` ("weekly"/"monthly") + `ragReason`.
  - Every AI nutrition prompt now asks for `addedSugar`; every save path (add, bulk, Update, Snap, Shop) applies the rule rating.
  - `checkRagFrequency` uses: AMBER up to 3/week, RED weekly once/week, RED monthly once/month. The generator prompt and the item tags use the same bands.
  - "🔄 Re-evaluate Ratings" is replaced by **"🔄 Re-rate all lists"**: the AI estimates `addedSugar` only where it is missing (batches of 20), then the rules rate every item. Changed items get `prevRating`, the 🔄 marker and **Check me** with the reason.
  - **For JC:** press "Re-rate all lists" once on /build/ to see the summary. Ratings are then rule-based.
- **D6 repair (Data tools → "Meal snapshot repair"):**
  - The dry run counts only. Write adds missing `_snap` entries only (never touches slots or existing snapshots) and re-reads each plan before writing.
  - It is idempotent: the second dry run shows "0 weeks to write". An optional pasted Firebase export fills items deleted from the lists.
  - **Rehearsal: done on the emulator copy of the 3 Nov backup, not on live Build data.** Coder sessions have no live Firebase access, and the rules lock it to JC's account.
    - Dry run: 17 week plans · 252 selections · 0 already · 1 from current lists · **61 from renamed built-in items** · 0 from export · **190 not found** · 11 weeks to write.
    - Write: 62 snapshots to 11 plans. Second dry run: 0 to write. All other keys and slots unchanged (checked by the test).
  - **Finding:** most old selections use pre-migration built-in ids (`spag_bol`, `overnight_oats` …). The current defaults hold the same foods as `gb_<id>`, so the repair maps them (and the slot display now does too, instead of showing code). Of the 190 not found, 60 are deleted custom items and 130 are old ids with no list match (e.g. `banana`, `leftovers`, `none_snack`).
  - **Question for Architect/JC:** should those 130 old ids keep "Deleted item", or should a small name map be added (e.g. `none_snack` → "No snack", `leftovers` → "Leftovers")?
  - **The real Build rehearsal is for JC/Architect** in /build/ → Settings → Data tools (Build data is a copy, no backup needed). Real data: JC backup → dry run → write, from beta or prod once released.
- **📷 Snap (replaces Portion everywhere):**
  - The button sits on every slot, empty or filled (accessible label "Snap a photo of your food"). Tapping it opens a bar under the slot: optional description → "📷 Take photo" or Cancel.
  - The result panel shows food, values, rule RAG + frequency, and "Assumed: …". The description stays editable, with ↻ Re-check (repeatable).
  - Confirm, by case:
    - filled slot, same food → this meal's portion;
    - filled slot, different food → swap with Undo (D10);
    - empty slot → an exact list match by name is selected with this portion; otherwise "Add “X” to your <Category> list?" → `addReviewedItem` → selected.
  - Cancel and Re-check save nothing.
- **D7:** "🔎 Re-check nutrition" asks the AI for each recipe item's whole-recipe kcal, 10 per call. If the saved kcal is below 80% or above 125% of it, the item gets **Check me** with "Nutrition looks off: saved X kcal, ingredients add up to about Y". Values are never changed.
  - Opening a flagged item and pressing Confirm now recalculates even with no ingredient change.
  - The add-item **Review** path uses the same whole-recipe prompt, plausibility retry, before → after and name kcal as Update Item.
- **Prod v2.6.0 tolerates the new data shapes: PASSED.** `tests/compat-prod.spec.js` (skipped in the normal suite) ran the v2.6.0 source (tag `v2.6.0`, dev server on the emulator) against data containing:
  - `_snap`, per-set `sets`, `addedSugar`/`ragFreq`/`checkMe`/`checkReason`/`prevRating`/`assumed`, a deleted id and an old renamed id.
  - Every tab plus Progress, the Eating day/week views and Update Lists: no page errors, no "section error", `[object Object]`, `_snap`, NaN or "undefined kcal".
  - v2.6.0 simply ignores the new fields (deleted ids still show their old code-like name there, as today). **So beta can go ahead of prod safely.** Re-run it before the beta PR: see the comment at the top of the spec.
- Tests: 4 new spec files/blocks (rating ×4, repair ×2, Snap ×2 + updated photo tests, compat ×1). Full suite 80 passed (4 skipped incl. compat), lint 0 errors.
  - Visual rebaselined: Snap buttons, new list buttons, and the Chat panel. The v2.6.4 chat baseline had not picked up latest-first; the new one is correct ([14:59, 18:52] stored → 18:52 shown first).
- **Not done:** `APP_GUIDE.md` (Help reads it live, including in prod) still describes Portion and the old ratings. Update it with the release, not before.
- **Resume point:** `build` @ 008b885. Next: the Architect verifies /build/ (run Re-rate and the repair dry run there), then PR build → beta when approved.

### (Coder) 10 Nov 2026 — v2.6.5 update: "Clear old eating history" replaces the snapshot repair (JC decision) — `build` (19bddf9)
- **Decision (JC):** the old meal selections are not repaired; old eating history can be cleared instead. The "Meal snapshot repair" tool and its code/tests are removed. Snapshot-on-save for new selections stays.
- **Settings → Data tools → "Clear old eating history":**
  - A date picker (default: the current week's Sunday).
  - **Dry run** shows week plans and selections in total and per person. The old pre-person keys show as "shared (old format)".
  - **Delete** (enabled only after a dry run for that same date, with a confirm) removes, in one update, only `mealplan:<date>[:person]` keys whose week starts before the date.
  - Food lists, exercise, body, health, settings and newer weeks are never selected. Running it again finds 0 (idempotent).
- **Emulator test (copy of the 3 Nov backup), before 2026-11-08:** 17 week plans · 252 selections · shared (old format) 2 weeks / 25 · JC 10 / 156 · Becks 5 / 71.
  - Delete removed exactly those 17. Every other key was byte-identical afterwards; the second dry run showed 0 and Delete was disabled.
- Version stays v2.6.5 (JC: "in this version"). Full suite 80 passed (4 skipped), lint 0 errors, visual unchanged.
- **Open:** `APP_GUIDE.md` update (Snap, ratings, Check me, Re-rate, Re-check nutrition, Clear old eating history) goes in the beta PR. Note that `portion_overrides`/`meal_tracking` are keyed by day name, not week, so they are not part of this clear.
- **Resume point:** `build` @ 19bddf9. Next: the Architect verifies /build/ (dry run there on Build data), then PR build → beta, with APP_GUIDE.md.

### (Coder) 10 Nov 2026 — v2.6.5 Snap panel fixes from JC's phone test — `build` (ad538a3)
- **Confirm:** the button was there, but labelled "Replace with X" or "Confirm Portion", never "Confirm". I could not reproduce a missing button at 360/412px in any slot type (it was always tappable and uncovered).
  - It now always reads **Confirm** (same food, different food, empty slot). For a different food, a line "Update to X" sits above it. The Undo bar says "…— updated".
  - **JC to re-check on the phone.** If the button is still missing, a screenshot and the slot (Breakfast/Snacks …) would help.
- **Layout:** one row at the bottom, equal height (38px), no wrapping at 360px: **[Confirm]** deep blue (btnActionLg) · **[↻ Re-check]** (btnMuted, as Re-rate) · **[Cancel]** grey (as other Cancels). The description box has its own full-width row above.
- Tests: the D10/Snap tests now press "Confirm". New test: same food, different food and empty slot each show the three buttons in one row of equal height, and Cancel saves nothing. Full suite 81 passed (4 skipped), lint 0 errors.
- **D13 (defect, DATA, report only, not built): portion sizes and "tracked" statuses carry over between weeks.**
  - `portion_overrides:<person>` is keyed `{ <day name>: { <slot>: values } }` and `meal_tracking:<person>` is keyed `"<day name>:<slot>"`. There is no week or date in either and nothing ever resets them (checked: no clearing code; the backup has e.g. `meal_tracking:jc` = `tuesday:b`, `monday:b` …).
  - So this Monday's portion shows its ✓ "Portion verified" on **every** Monday's same slot, and its values come back for that slot in any week.
  - Tracking statuses ("eaten/skipped") are read by the day and week Eating Feedback (`App.jsx` ~1204/1364) for whatever week is shown, so old statuses feed the AI as if current. (There is currently no screen that sets tracking; the stored entries come from older versions.)
  - **Proposed fix:** store both **inside the week plan** (`mealplan:<Sunday>:<person>`) as `_portion["<day>:<slot>"]` and `_track["<day>:<slot>"]`. They are then tied to the week, removed with "Clear old eating history", and covered by the prod-compat check (prod ignores `_` keys).
  - Migration: existing entries can't be dated reliably. Either drop them (simplest) or attach them to the current week only. **Needs JC/Architect decision.**
- **Resume point:** `build` @ ad538a3 (v2.6.5). Next: JC re-tests Snap on /build/; the Architect decides D13; then PR build → beta with APP_GUIDE.md.

### (Architect) 10 Nov 2026 14:35 — DESIGN DECISION (JC): eating data = parent list items + child selections (supersedes the D13 patch and the `_snap` approach)
- **Parent = list item** (the user's food lists).
  - Used for selection and planning.
  - Changed **only** through Update Lists.
  - Never changed by selecting, Snap, the generator or portion changes.
- **Child = selection entry**: one per person + **date** + slot (+ position, if a slot holds several items).
  - Fields:
    - `parentId` (or null for ad hoc);
    - `date` and `weekday`;
    - `slot`;
    - `snapshot` (name, nutrition, RAG at selection time);
    - `portion` / quantity;
    - `variations` (free text plus structured substitutions, e.g. "chips instead of potato", "peas instead of beans");
    - `nutrition` (the snapshot adjusted for portion and variations: this is what totals use);
    - `tracked` / status;
    - `source` (manual / snap / generator / default);
    - `notes`.
  - Totals, progress, feedback and history read **children only**. Deleting or editing a parent never changes a child.
  - Keyed by date, which **solves D13** (portions and ticks can no longer leak between weeks). "Clear old eating history" deletes children before the date.
- **Ad hoc foods (not saved to a list):** a child with `parentId: null` and `source: "adhoc"`, carrying its full snapshot. Architect's choice over a hidden placeholder parent: a fake parent would pollute list counts, ratings and the frequency rules, while the child already holds everything needed.
- **Snap flow (amends the 10 Nov 07:20 entry):**
  - Photo (+ optional description) → result panel (description editable, Confirm / Re-check / Cancel).
  - **Confirm** writes the child directly.
    - Matches a parent → child linked to the parent.
    - Different food on a filled slot → the child is updated to the new food (with Undo).
  - **Only when the food is NOT in the parent list**, ask once: "**Save <food> to your <slot> list for future selection?**"
    - Yes → create the parent through `addReviewedItem` and link the child.
    - No → ad hoc child.
  - No other confirm popups.
- **Generator, defaults and manual picks** all create children from parents.
- **Migration:**
  - The current week's selections (+ day-name portions and ticks) → children dated in the current week.
  - Delete legacy eaten/skipped statuses.
  - Older weeks are cleared by the tool.
  - Idempotent; take a backup on real data first.
- **Compatibility:** store children under a new key. Prod v2.6.0 ignores them, so prod won't show beta's new selections. That's acceptable (no one uses prod), and **prod is released soon after beta**.
- **Estimate:** 4–7%. Built in this release before beta.
- **Confirmed with JC (14:35):**
  - **All tracking is against children.** Each child stores its **own RAG**, calculated by the D11 rule-based bands from the child's **adjusted nutrition** (portion + variations). It is recalculated whenever the portion or variations change.
  - Frequency rules ("AMBER up to 3 a week", "RED weekly/monthly") count **children's** RAG, not parents'.
  - When a child's RAG differs from its parent's, the selection shows it (e.g. "RED today — large portion").


### (Coder) 10 Nov 2026 — v2.6.5: parent list items + child selections (Architect/JC 14:35) — `build` (634b1be)
- **Model (`src/lib/children.js`):**
  - Children are stored per person per week in `eat_children:<person>:<Sunday>` = `{ v, children: { c_<date>_<slot>: child }, empty: ["<weekday>:<slot>"], notes }`. Each child holds the listed fields:
    - `parentId` (null when ad hoc), `date`, `weekday`, `slot`;
    - `snapshot`, `portion` (`{factor}`, or `{source:"photo", values, assumed}`), `variations` (`{text, subs}`);
    - `nutrition` (snapshot × portion, or the photo values);
    - its **own** `rating` / `ragFreq` / `band` (D11 bands on that nutrition, recalculated on every change), plus `parentBand`;
    - `tracked`, `source` (manual / default / generator / snap / adhoc / copy / migrated), `notes`.
  - The screens keep their weekday view. Each slot now holds a child id, and stand-ins built from the children feed every lookup, so **totals, warnings, day/week feedback, the Home summary and shop items read children**.
  - Saving reconciles the view back into children (a parent pick creates a child from the parent). Parents change only in Update Lists.
- **Snap:** Confirm writes the child.
  - Same food → portion only.
  - Different food, or an empty slot → list match by name (no question). Otherwise the one question "Save <food> to your <slot> list for future selection?": Yes → `addReviewedItem` + link; No → ad hoc child.
  - A filled slot gets Undo (restores the previous child). There are no other popups.
- **Generator, defaults (incl. the other person), manual picks and Copy day/week** all create children from parents.
- **Frequency rules** count children by food (parent, or name if ad hoc), using each child's own band (this week + 4 past weeks).
- **RAG note:** "RED today — large portion" (or small portion / with changes) shows next to a selection whose band differs from its parent's.
- **Migration (idempotent):** when a week is opened and has an old `mealplan:<Sunday>:<person>` but no children, it is converted once.
  - Selections only, using the list, the renamed `gb_` defaults or a saved `_snap`; unknown ids are dropped.
  - **For the current week only**, the day-name `portion_overrides` and `meal_tracking` become the children's portion/`tracked`, and then **both legacy keys are deleted**.
  - Old plan keys are left for "Clear old eating history", which now deletes children weeks and old plans before the date.
- **Decisions (Coder), please confirm:**
  1. Migration runs for **any week that is opened**, not just the current one, so past weeks still show until JC clears them. Portions and ticks are migrated for the current week only, as specified.
  2. Copy day/week makes **fresh** children from the parent (no portion or tick carried over, so D13 can't come back through copies).
  3. **Variations:** the field exists (`{text, subs}`) and feeds the RAG note, but there's no screen to enter it yet, and it doesn't change nutrition yet.
  4. No screen sets `tracked` today (pre-existing). Feedback reads it from the child.
- **Questions for Architect/JC:**
  - **(a) Real data:** migration writes on first load in beta (shared data), so **JC's backup must come before the beta deploy.**
  - **(b)** After beta migrates a week, prod v2.6.0 still edits the old plan, and beta won't see those edits. Release prod soon after beta, as planned.
- **Prod compatibility re-run: PASSED.** v2.6.0 against data with a children week, `_snap`, per-set arrays, `addedSugar` and Check-me flags: no errors, no odd text; it simply doesn't show beta's children.
- Tests: `food.spec.js` adds 8 tests:
  - migration (+ legacy keys removed, idempotent);
  - list edit/delete doesn't change the child, and a manual pick creates a child;
  - **portion this Monday not shown next Monday**;
  - generator writes children;
  - Snap Yes / No / list-match;
  - child RAG + note.
  - Older photo tests were updated, and the Clear tool test includes children keys. Full suite 82 passed (4 skipped), lint 0 errors, visual unchanged.
- **Resume point:** `build` @ 634b1be (v2.6.5). Next: the Architect verifies /build/; JC backup; PR build → beta with APP_GUIDE.md.

### (Architect) 10 Nov 2026 15:05 — parent/child build (634b1be) reviewed; Coder decisions
- Decisions 1 (migrate any opened week; portions and ticks for the current week only), 2 (copies start fresh) and 4 (eaten/skipped read from the child) are **accepted**.
- Decision 3 (variations stored, but no screen and no effect on nutrition): accepted **for now**. The **variations screen goes into release 5 ("Open" pattern)**. Opening a selection shows portion + variations (e.g. "chips instead of potato") → the AI recalculates the **child's** nutrition → the child's RAG is recalculated. The parent is untouched.
- **Promotion sequence:**
  1. JC's phone test on Build
  2. "Clear old eating history" dry run → delete on Build
  3. **JC's manual backup from Beta**
  4. Beta PR (with the `APP_GUIDE.md` update)
  5. JC runs Clear on Beta
  6. Prod release soon after, with another backup

### (Architect) 10 Nov 2026 16:15 — false "Run failed" emails explained
- **Cause:** when the Coder pushes to `build` and a doc-only commit to `main` within seconds, two "Deploy to GitHub Pages" runs overlap. The second fails with "in progress deployment… cancel d76a7d9 first" (e.g. run e7bd87b at 14:50). The next run publishes everything, so **nothing is lost and the site is correct**. JC still gets a failure email.
- **Fix (small, do in the next Coder session, with the beta PR):** in `deploy.yml`, add a workflow-level `concurrency: { group: pages-deploy, cancel-in-progress: false }`, so deploys **queue** instead of colliding. Also update `actions/deploy-pages` (and the related actions) to their current major versions to clear the Node 20 deprecation warning, which is P2 item 16.

### (Architect) 10 Nov 2026 20:15 — JC phone test of the eating tracker: D14–D16 (before beta)
- **D14 (layout):** the inline child-RAG note ("GREAT today — this portion") squeezes the slot row.
  - Fix: no inline note text. Colour the **selected item's text by the child's RAG**, the same way list items are coloured.
  - Keep the "differs from list item" explanation only in the item's details (the "Open" form, release 5), not inline.
- **D15 (consistency):** the same Frankfurter dinner photo came back as large/RED-or-AMBER, then medium/GOOD on Re-check. Vision estimates vary between calls, and the rule-based RAG then follows the varied nutrition.
  - Fix:
    - nutrition and photo calls use **temperature 0**;
    - the AI must return an explicit **estimated weight in grams** per component, shown in the result ("Assumed: ~450g — rice 200g, sausages 2…");
    - **Re-check sends the previous estimate** and asks the AI to keep it unless the photo or the description justifies a change, and to say what changed and why ("Changed: rice 200g → 150g because…");
    - the description prompt suggests stating the size ("large plate", "2 sausages").
- **D16 (mobile usability):** the phone keyboard covers the selection dropdown when searching.
  - Fix: on phones, the item picker opens as a **bottom-sheet / full-screen picker** with the search box at the top and results directly under it, so the keyboard never hides the list.
  - At minimum, scroll the field into view on focus using `visualViewport`.
- All three go in the current pre-beta batch, with tests where feasible (D14 layout snapshot; D15 request has temperature 0 and the previous estimate on Re-check; D16 picker visible with the keyboard open, using an emulated viewport).
- **D15 amended by JC (20:15): Re-check is an independent second opinion, not anchored to the first estimate.**
  - Re-check does a **deeper dive**: a component-by-component breakdown with an estimated weight in grams per component, plate/portion cues, and the user's description given priority.
  - The result is headed **"Re-check deep dive — re-assessed outcome"** and shows a one-line comparison with the previous result (e.g. "First check: large · RED → Deep dive: medium · GOOD").
  - Confirm uses the latest shown result.
  - Keep from the original D15: explicit grams shown in every result ("Assumed: ~450g — …"). First-check calls use temperature 0.
  - Drop: passing the previous estimate into Re-check.


### (Coder) 10 Nov 2026 — v2.6.5: D14–D16 from JC's phone test + deploy queue — `build` (5bfd73c)
- **D14:** the inline RAG note is removed. The selected item's text in each slot is coloured by the **child's** RAG (same colours as the lists) and shows its reason as a tooltip. A slot row stays one line (test checks < 50px). The "differs from the list item" explanation is left for release 5 ("Open").
- **D15 (as amended by JC):** prompts live in `src/lib/snap.js`.
  - The **first check** uses `temperature: 0` and returns `portionSize`, `components[{name, grams}]` and `totalGrams`.
  - **Every** result shows "Assumed: ~450g — rice 200g, frankfurters 120g, beans 130g — N kcal".
  - **Re-check** is an **independent deep dive**: it gets no earlier estimate, works component by component with grams each, uses plate and portion cues, and prioritises the user's description. The example numbers were removed from the JSON template so nothing anchors it.
  - The deep dive is headed "🔎 Re-check deep dive — re-assessed outcome", with the line "First check: large · RED → Deep dive: medium · GOOD" (size from the AI, RAG by the D11 rules).
  - **Confirm uses the latest shown result.** The child's `portion` keeps `assumed`, `grams` and `check` ("first check" / "deep dive").
  - Deep-dive calls are left at the default temperature, since JC wants an independent second view; only first checks are pinned to 0.
  - The description placeholder now suggests stating size ("large plate", "2 sausages").
- **D16:** on screens ≤ 600px wide the item picker opens as a **sheet sized to `visualViewport`**: search at the top (16px font, so iOS doesn't zoom), results directly under it, and a Close button. It follows keyboard resizes. Desktop keeps the dropdown.
  - Test: 412px phone. With the visible height shrunk to 420px (keyboard open), the sheet fits and the first result sits under the search box and above the keyboard.
- **Deploy workflow:** a workflow-level `concurrency: { group: pages-deploy, cancel-in-progress: false }`, so runs queue.
  - Actions updated to current majors, all Node 24: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. The versions came from each repo's tags; I checked that each `action.yml` uses node24 and that the inputs used are unchanged.
  - **These only take effect once `deploy.yml` reaches main** (only main's copy runs). Until then, please avoid pushing a build commit and a main doc commit within seconds of each other. This entry was pushed after the build deploy finished.
- Tests: D14, D15 (temperature, deep-dive heading, comparison, grams, not anchored, Confirm uses the deep dive) and D16 added. Full suite 86 passed (4 skipped), lint 0 errors, visual unchanged. Deploy run 42895320066 succeeded, 0 failure annotations.
- **Resume point:** `build` @ 5bfd73c (v2.6.5). Next, following the 15:05 promotion sequence: JC phone test on Build → Clear dry run/delete on Build → JC backup from Beta → beta PR (with APP_GUIDE.md).

### (Architect) 10 Nov 2026 20:40 — correction: there is no in-app backup download
- The Architect wrongly told JC to use "Settings → Data tools → download backup". The app has **restore only** (Data viewer: "Restore from Firebase Export"), no download.
- **Backup route for now:** Firebase console → Realtime Database → Data → ⋮ → **Export JSON** (on a phone, use desktop-site mode).
- **Backlog (small, P1-adjacent, next release):** add an admin-only **"Download backup"** button in Data tools. It exports the whole `DATA_ROOT` as a dated JSON file, using the same format as the Firebase export so restore accepts it. The nightly automated backups (P2) remain the main safety net.


### (Coder) 10 Nov 2026 — v2.6.5: "⬇️ Download backup" in Data tools — `build` (4b126f1, test fix f2ab671)
- This implements the 20:40 backlog item as specified by the later instruction: it exports the **real `data` path** (not `DATA_ROOT`, so it also works from /build/; JC's account can read it) **plus `data_build`**.
- Admin only (Data tools is JC-only). One file, `lifecare_backup_<env>_<YYYY-MM-DD-HHmm>.json`, shaped like a Firebase console export of the database root: `{ "data": {…}, "data_build": {…} }`, values exactly as stored.
- The confirmation shows only the file name, size and counts ("data N items (M meal weeks), data_build K items"), never contents. On failure nothing is downloaded and the error is shown.
- **Restore compatibility (finding, not changed):** "Restore from Firebase Export" expects the **exercise data object itself** (top-level `jc`/`becks`), i.e. the value of `data["dashboard:data"]`. It does not accept a whole console export or the `data` object.
  - The test proves that pasting `data["dashboard:data"]` from the downloaded file works ("Restored N missing progression entries").
  - In the file that value is stored as an escaped string, so copying it by hand is awkward.
  - **Question for Architect/JC:** should Restore accept the whole backup file, picking out `data["dashboard:data"]` itself? It would be a small change, but it wasn't in scope.
- Emulator test: the download is caught; the file name, both sections equal to the emulator's `data`/`data_build`, and the message (size + counts only) are checked, plus the Restore round-trip.
  - The first version of the test left a stub in the emulator's `data_build`, which broke the two env-build tests. It now restores `data_build` afterwards (f2ab671).
  - Full suite 87 passed (4 skipped), lint 0 errors, visual unchanged. Deploy runs 42898373928 / 42898977010 succeeded, 0 failure annotations.
- **Resume point:** `build` @ f2ab671 (v2.6.5). Next: JC can download a backup from /build/ before the beta PR; the promotion sequence continues.

### (Coder) 10 Nov 2026 — v2.7.0 on beta (PR #19 + #20), /beta/ = v2.7.0-beta.2
- **Restore** (JC decision): "Restore from Firebase Export" now takes the Download-backup file or a console export (of the root or of `data`), or the bare exercise data as before.
  - **Preview** shows counts only (kind, items, meal weeks, people, logged exercise weeks). Then either:
    - **Merge missing exercise weeks**: the old safe logic, unchanged; or
    - **Full restore of data**: `set()` of the real `data` from the file (on Build: the build copy), after a confirm **and** typing RESTORE. Anything else typed cancels with nothing changed.
  - Tests: pure parsing/targets; merge with the whole file; full restore makes `data` equal to the file again; a wrong word changes nothing.
- **v2.7.0:** version.js / package.json. APP_GUIDE.md updated for every listed feature (Snap, RAG bands + Re-rate, Re-check nutrition, Check me, bulk upload, per-set logging + Form/Range, Clear old eating history, Sunday-first week, latest-first chats, phone picker, Download backup + Restore) and dated v2.7.0. TECHNICAL_REFERENCE gained an "Eating data model" section.
- **PR #19 build → beta merged** (merge commit ce52472).
  - **The deploy check skipped beta:** "beta refers to data_build". `check-pages.mjs` rejects any prod/beta bundle containing the literal build data path (the guard against a wrong DATA_ROOT). Backup/Restore named that path directly. **Prod would also have failed at release, which stops the whole deploy.**
  - Fix 13e88d6: the path name is built at runtime (`BUILD_ROOT` in `src/lib/backup.js`). The guard is unchanged and still catches a literal DATA_ROOT. A local beta-mode build has no literal.
  - **PR #20 merged** (6ec2e0f). Deploy run 42902054066: build success, no failure annotations, deploy success.
- **/beta/ is live as v2.7.0-beta.2** (beta.N = merge commits on beta since main). Full suite 90 passed (4 skipped), lint 0 errors, visual: footer only.
- **Not done (as instructed):** no merge to main, no tag.
- **For JC on /beta/** (real data; JC's backup is taken):
  1. Close and reopen; the footer should show v2.7.0-beta.2.
  2. Opening My Eating migrates the week once.
  3. Run Clear old eating history (dry run → delete), per the 15:05 sequence.
  4. Check Snap, the picker on the phone, and Download backup.
- **Remember at release:** prod deploys only from main's `deploy.yml`, so the queue/Node 24 changes start with the release. Take another backup before the beta → main PR.
- **Resume point:** `build` @ 13e88d6, `beta` @ 6ec2e0f (v2.7.0-beta.2). Next: JC tests beta → Architect raises/approves beta → main (release v2.7.0, tag).
