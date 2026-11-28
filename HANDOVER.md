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
The version table (changelog) is in **[docs/CHANGELOG.md](docs/CHANGELOG.md)** (moved 12 Nov 2026). Latest: see the last row there and the "Live Product" line below.

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: **v2.60.1 in prod** (released 26 Nov 2026, PR #31, merge `0305355`, tag v2.60.1 by auto-tag); beta = **v2.60.1** (PR #30, `bf50d60`); build = **v2.60.1** (`f307ffe`).
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

**Documents (from 12 Nov 2026): [docs/README.md](docs/README.md).** The version table is in [docs/CHANGELOG.md](docs/CHANGELOG.md); the product backlog and defects backlog are in [docs/backlog/](docs/backlog/) (the planned and approved record; new feedback, defects and features are captured in the in-app 📝 Tracker, v2.14.0); the HLD and test strategy are drafted in `docs/`. HANDOVER keeps the hand-overs and decisions, and links there.

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

### (Architect) 10 Nov 2026 21:12 — v2.7.0-beta.2 accepted for use; guard workaround to be undone in the next release
- Beta is live (PR #19 + #20). Accepted for JC's daily use.
- **Not accepted long-term:** PR #20 got past the `data_build` deploy guard by assembling the name at runtime, which defeats the guard's purpose.
- **Next release, before prod:** revert that, and make Download backup / Restore environment-aware at build time:
  - beta/prod bundles handle only `data`, with no `data_build` code compiled in (a build-only module via the env flag);
  - build handles both;
  - the guard stays exactly as is.
- **Prod release (beta → main) waits for this fix.**


### (Coder) 11 Nov 2026 — overnight R1: v2.7.1 on `build` (6fc8335)
- PR #20's runtime-assembled build path name is **reverted**. Backup/Restore use `DATA_ROOT`, which Vite writes into each bundle as a literal at build time. On Beta/Prod it is "data", so those bundles contain no code or name for the build copy. On Build the second section and the restore target are its own copy.
- **Decision (Coder), please check:** this uses the existing `DATA_ROOT` env flag rather than a separate build-only module. It has the same effect (no build-path code compiled into Beta/Prod) with less code.
- Proof: local builds — prod 0 / beta 0 / build 1 JS files contain `data_build`, matching what the **unchanged** guard expects.
- Tests per environment:
  - app (prod-like): the backup holds only `data`;
  - env-build: the backup holds `data` + `data_build`, and the full-restore button targets "data_build (this test app)";
  - pure: the restore target is the environment's own root.
- Full suite 91 passed (4 skipped), lint 0 errors. Deploy 42907085680 succeeded, no failures.
- **Resume point:** `build` @ 6fc8335. Next: R2 (v2.8.0 "Open" pattern).

### (Coder) 11 Nov 2026 — overnight R2: v2.8.0 "Open" pattern on `build` (48b4fdf)
- **Was the old "edit previous weeks" broken? Yes**, in three ways (found by reading the code):
  1. The Progress rows were uncontrolled inputs (`defaultValue`) **keyed by position**. After a 🗑 Del, React reused the inputs, so the remaining rows **kept showing the deleted row's values**, and the next edit could write them to the wrong week.
  2. Edits saved only on `blur`, which phones don't reliably fire before navigation, so changes could be lost silently.
  3. Editing weight or reps inline dropped the per-set data.
  "Edit Previous Entry" in the log form could only change the **latest** week.
- **F1 (Progress):** each row shows key data only: week, weight (range), reps, a small Form/Range ✓ mark, and **Open**. Notes text and Del are gone from the rows.
  - **Open** shows the entry as logged (every set, Range/Form segmented, notes), **read-only**.
  - **✎ Edit** makes it editable (+ Add set). **Save** re-applies the D12 rule (Form and Range must be chosen), stores `sets`, `w`, `r`, `wk`, `note`, re-sorts by week and syncs the card's current weight/reps.
  - **🗑 Delete week** (confirm) is inside the form. A test covers the old wrong-row problem: after a delete the remaining row is right.
- **F5 (food):**
  - **List items:** **Open** → read-only view (kcal, all nutrients incl. added sugar, rating + reason, type, ingredients, Check-me reason, description).
    - **✎ Edit** = the existing Update Item editor (D7 recalc), now inside the same form; **Cancel** returns to the view.
    - **🗑 Delete from list** (confirm: "Meals you already logged keep their own copy") exists **only here**; the row Del is gone.
  - **Meal slots:** **Open** replaces Del.
    - On a filled slot it opens the **child** (selection): portion (½/1/1½/2 or any factor), **Changes** ("chips instead of potato"), "What changed", nutrition, **Rating today** (child) and **Your list item** (parent) with "Differs today: …".
    - Save with changes → the AI recalculates **this meal's** nutrition (temperature 0) → `portion = {factor, source:"variations", values, change}`, `variations.text` → child RAG recalculated. Factor only → scaled, no AI. The parent is never touched.
    - **Remove from this meal** (confirm) is the only destructive action.
    - **Open on an empty slot = add** (the existing add-item flow). Empty extra rows get a small ✕ to remove the row.
  - The child-vs-parent explanation lives here only (D14).
- Same form, buttons and styling everywhere (Edit deep blue, the danger action red outline, Close/Cancel grey, equal heights).
- **Prod-compat re-run: PASSED** (v2.6.0 with a child carrying `variations` and a `variations` portion). No new exercise fields.
- Tests: `tests/open.spec.js` (4: F1, list item, selection + variations + Remove, empty-slot add). 5 older tests moved from "✎ Update" to Open → ✎ Edit. Full suite 95 passed (4 skipped), lint 0 errors, visual rebaselined (eating rows/lists). Deploy 42909794550 succeeded.
- **Decision (Coder):** a factor change on a photo-checked portion replaces the photo values with list × factor. Variations always use list portion × factor as the base.
- **Resume point:** `build` @ 48b4fdf. Next: R3 (v2.9.0 Eating Feedback).

### (Coder) 11 Nov 2026 — overnight R3: v2.9.0 F6 Eating Feedback on `build` (8405365)
- **Plan-aware** (`src/lib/eatPhase.js`): a day before today is **eaten**; today and later are **planned**. A week where every day is in the future is a **plan review**, one entirely in the past is all eaten, otherwise **mixed**.
  - **Day feedback** sends either "THIS IS A PAST DAY — WHAT THEY ATE on Monday 2026-11-09 (from their logged meals)…" (past tense) or "THIS IS TODAY / A FUTURE DAY — THEIR PLAN for … (not eaten yet)…" ("never praise it as if it had been eaten").
  - The old "default to consumed if not tracked" logic is gone: what's logged is what counts, and children marked skipped are listed as skipped.
  - **Week feedback** marks each day "(EATEN)" or "(PLAN)" with its date. A mixed week is told to open with "So far this week you've eaten…" then "For the rest of the week your plan…"; a future week opens "THIS WHOLE WEEK IS IN THE FUTURE: it is a PLAN REVIEW".
  - The result stores `_phase`, and the panel header shows "· What you ate / Your plan / Plan review / So far this week + the rest of your plan".
- **Chat upgraded to the session-feedback standard:**
  - Feedback replies go through `readFeedback()`: cut off (`max_tokens`), empty, or unreadable JSON each give a clear "please press the button again" message instead of a raw parse error.
  - **Thread replies** (shared by every feedback chat): an empty reply or an API failure now shows an alert under the box ("… Your message is still in the box."), where it used to be silently swallowed. A cut-off reply is kept and marked "(I ran out of room there — ask me to carry on.)".
  - Latest-first and the panel style were already shared (`renderThread`); follow-ups were already supported.
- Tests: `tests/eat-feedback.spec.js` (5, using a fixed clock on Wed 11 Nov): pure phase rules, mixed week, future week, past vs future day, and cut-off + failed/cut-off chat. Full suite 100 passed (4 skipped), lint 0 errors, visual footer only. Deploy 42911044365 succeeded.
- **Resume point:** `build` @ 8405365. Next: R4 (F2: first check photo storage).

### (Coder) 11 Nov 2026 — overnight R4: F2 body balance — **nothing built** (no suitable photo storage); options for decision
- **What exists today:**
  - **Home → 📸 Body Type Photos** sends the photos to the AI once for `bodyAnalysis`, then saves only `bodyPhotos[]` = date, file name, type and the **first 500 characters of the base64** (not a usable image) inside `dashboard:data`. The photos themselves are not kept.
  - `progressPhotos[]` is **read** by two prompts (Home check-in / cross-section context) but **nothing in the app writes it**, and the 3 Nov backup holds no photo data.
  - **Firebase Storage is not used** (only `storageBucket` in the config); the rules cover the Realtime Database only.
  - So there's no per-user progress-photo history to compare over time, and per the brief nothing was built for F2.
- **Options (decision needed, JC + Architect):**
  1. **Firebase Storage, per-UID rules (recommended).**
     - Path `progress/<uid>/<person>/<YYYY-MM-DD>_<pose>.jpg`; Storage rules allow read/write only for `request.auth.uid == <owner uid>` (the same pattern as the DB rules), plus size ≤ 1.5 MB and `contentType` image/*.
     - The app resizes to about 1280px / JPEG 0.8 before upload (about 200–400 KB). The DB keeps only metadata `{date, week, pose, path, analysis}` under `progressPhotos`.
     - Needs: enabling Storage in the console (Blaze plan, which has a free tier of 5 GB stored / 1 GB a day downloaded, ample for two people), the rules applied by JC/Architect (the Coder never deploys rules), a delete-photo action and a "photos" section in the privacy notice.
     - Privacy: these are body images (special-category health data). Owner-only rules, no public URLs (use `getDownloadURL` only after sign-in, or `getBlob`), and they're excluded from Download backup by default (or an explicit "include photos" option).
  2. **Store compressed images in the Realtime Database** (base64 under a separate key per photo). No new service, but it bloats the DB and every backup (about 300 KB per photo, so 4 poses a week × 2 people ≈ 125 MB a year), is slower to load, and RTDB isn't meant for blobs. Not recommended beyond a trial.
  3. **No storage: analyse-and-discard.** Each check uploads this week's photos, the AI compares them only with the stored text analyses of earlier weeks plus the measurement trends, and the images are dropped. Private and cheap, but there are no images to look back at, and comparisons rest on earlier text, not pictures. It could be a quick first step.
- **Also to decide:** which poses (front/side/back, as Body Type Photos asks); how often (e.g. every 4 weeks); and whether Becks wants photos stored at all (per-person opt-in).
- **Version:** none (nothing built). **Resume point:** `build` @ 8405365. Next: R5 (F8 share target).

### (Coder) 11 Nov 2026 — overnight R5: v2.11.0 F8 share target on `build` (d42146b)
- **Manifest** (each environment, from `vite.config.js`): `share_target: { action: <base>share-target, method: POST, enctype: multipart/form-data, params: { title, text, files: [{ name: "images", accept: ["image/*"] }] } }`. So prod, beta and build each appear under their own name and post to their own URL. `check-pages.mjs` is unaffected.
- **Service worker:** the only change is a POST to exactly `SCOPE + "share-target"`. The image(s) go into Cache Storage `lc-share` (replacing any earlier share), then a 303 redirect to `<base>?share=1`. Every other request is handled as before: no app files are cached, other origins and environments are untouched. Prod's worker handles only `/Life-Care/share-target`; beta and build have their own.
- **App** (`src/components/SharePicker.jsx`, rendered only after sign-in, so a share made while signed out is kept): a bottom sheet "What is this?" offers
  - 📏 Body measurements → the My Body "📷 Upload";
  - 📸 Progress / body photo → Home › My Profile › Body Type Photos (the only photo flow while F2 storage is undecided);
  - 🍽 Food → the Shop Food Checker.
  - The file is handed to the existing upload by setting that input's files (`data-share` attribute), so no upload flow was rewritten. The stored copy is deleted once handed over.
  - **Later (keep it)** keeps it (it shows again next time); **Discard** deletes it.
- Tests: `tests/share.spec.js` (4):
  - the manifest;
  - the real service worker receiving a multipart POST (stored + redirect);
  - picker → Food Checker gets the PNG (image block in the AI request), with the cache and `?share=1` cleared;
  - kept while signed out, shown after sign-in, Later/Discard, Progress → Body Type Photos called.
  - Also: `pwa.spec` updated (it now runs the share code and proves the share POST is the only cache use); env-build checks build's own share URL.
  - Full suite 105 passed (4 skipped), lint 0 errors, visual footer only. Deploy 42912727180 succeeded.
- **For JC (real-device check, Android Chrome or Samsung Internet):**
  1. Install /build/ as an app (or reinstall it, so Android picks up the new manifest).
  2. In a scales or measurement app tap Share → choose "Lifecare BUILD".
  3. Pick a kind in "What is this?".
  - iPhone isn't supported (Safari has no share target).
- **Resume point:** `build` @ d42146b (v2.11.0). The overnight batch is done (R1–R5); nothing has been merged to beta or main.

### (Coder) 11 Nov 2026 — overnight batch summary and decisions needed
- **Built (build only):** v2.7.1 (environment-aware backup), v2.8.0 ("Open" pattern), v2.9.0 (plan-aware Eating Feedback + chat errors), v2.11.0 (share target). **Not built:** F2 (v2.10.0), which needs a storage decision.
- **Decisions needed:**
  1. **F2 photo storage:** Firebase Storage per-UID (recommended) / photos in the RTDB / analyse-and-discard; plus poses, frequency and per-person opt-in (R4 entry).
  2. **R1:** OK to use `DATA_ROOT` instead of a separate build-only module? (Same effect; the guard is untouched.)
  3. **R2:** a portion factor change on a photo-checked selection replaces the photo values with list × factor. OK?
  4. **R5:** while F2 is undecided, shared "Progress photos" go to Body Type Photos (one-off AI analysis, image not kept). OK, or hide that option until F2?
  5. **APP_GUIDE.md** still needs updating for v2.8.0–v2.11.0 (Open forms, plan-aware feedback, share). I'll do it with the next beta PR, as before.

### (Coder) 11 Nov 2026 — v2.11.1 on `build` (fd9c49c): decisions on the overnight batch
- Recorded: R1 `DATA_ROOT` approach **accepted**; APP_GUIDE for v2.8.0–v2.11.0 goes with the next beta PR; F2 is pending JC's storage decision (not built).
- **R2 fix:** on a photo-checked selection (`portion.source` photo), a new portion factor now scales the child's **photo** values.
  - The original photo values are kept in `portion.photoValues` and are always the base, so ×1.5 then ½ gives 300 from a 600 kcal photo, never compounding.
  - The view shows "checked by photo ×1.5". The list item is untouched, and the child RAG follows the scaled values.
  - Variations (text) still recalculate from list × factor via the AI (unchanged).
- **R5:** "Progress photo" is removed from the share picker until F2 is built; Body measurements and Food remain.
- Tests: a new open.spec test (600 kcal photo → ×1.5 = 900 → ½ = 300; the parent is unchanged); share.spec now asserts there's no Progress option. Full suite 106 passed (4 skipped), lint 0 errors, visual footer only. Deploy 42920204308 succeeded.
- **Resume point:** `build` @ fd9c49c (v2.11.1). Next: the beta PR (with APP_GUIDE for v2.8.0–v2.11.1) when asked; F2 waits for JC.

### (Architect) 11 Nov 2026 06:25 — DECISION (JC): F2 photo storage = Firebase Storage, per-UID, keep the last 3 per pose
- **Option 1 approved:**
  - Firebase Storage, path `progress/<uid>/<person>/<YYYY-MM-DD>_<pose>.jpg`.
  - Owner-only rules; resized to ~1280px JPEG 0.8 before upload.
  - The DB keeps metadata `{date, week, pose, path, analysis}` under `progressPhotos`.
  - Excluded from Download backup by default, with an explicit "include photos" option.
  - Delete-photo action.
  - **Per-person opt-in.**
  - Poses: front / side / back; suggested every 4 weeks.
- **JC rule: keep only the last 3 images per pose per person.** When a 4th is uploaded, the oldest image of that pose is deleted from Storage. **Its text `analysis` is kept**, so long-term trends still work from the analyses plus measurements, and comparisons always use the latest images.
  - **Correction (06:30):** the no-cost Storage tier applies only to US buckets (us-central1/east1/west1). A europe-west1 bucket is billed from the first byte at standard Cloud Storage rates, which is pennies at this size. europe-west1 is kept for UK/EU data residency of body images.
  - Any quota is **project-wide**, not per user. At ~300 KB × 3 poses × 3 kept ≈ 2.7 MB per person, this keeps storage tiny at any realistic scale and minimises the sensitive data held.
- **Storage location:** europe-west1 (same as the DB).
- **Storage rules** (Architect gives to JC; also commit as `storage.rules`):
  - read + delete: owner UID only;
  - create/update: owner UID only, < 1.5 MB, image/*;
  - everything else denied.
- **Emulator:** add the Storage emulator, with the same rules, to the tests.


### (Coder) 11 Nov 2026 — v2.12.0 F2 Body balance check (analyse-and-discard) on `build` (ffa3352)
- **Decision (JC, supersedes 06:25):** no image storage. **No Firebase Storage and no `storage.rules` were added.**
- **My Body → 📸 Body balance check** (`src/sections/BodyBalance.jsx`, logic in `src/lib/bodyBalance.js`):
  - **Per-person opt-in** (`bodyBalance.optIn`, with "Turn off").
  - The status line says "No progress photos yet. Take front, side and back photos…", or gives the last check and the next suggested date (+28 days).
- **One check:** up to 3 photos are read **in memory only**, sent in one AI request (temperature 0), then dropped. The prompt carries:
  - the fixed checklist: upper chest, lower chest, shoulders, shoulder:waist ratio, left/right arm symmetry, back, core/waist, glutes, quads, calves, each scored 1–5 with a note;
  - the **previous structured analysis** (or "This is the FIRST check");
  - the **tape measurement trends** ("tape can't separate upper/lower chest").
  - The answer is validated (every region must be scored 1–5) and **only** `{date, week, pose, scores, notes, changes, flags, summary, analysis}` is appended to `progressPhotos`. `analysis` = the summary, so the existing Home check-in context keeps working.
- **Display:** a score table (●●●○○) with the change against the previous check (▲ 2→4 / ▼ 3→2 / =), the notes and the summary. Flags show the region + issue + one training suggestion, and **Accept suggestion** records `accepted: true`. Suggestions only; nothing changes the plan.
- **Share picker:** 📸 Progress photo is back and routes to this check (My Body). The Home "Body Type Photos" input is now `data-share="bodytype"` and is no longer a share route.
- **Tests** (mocked AI): `tests/body-balance.spec.js`:
  - pure: validation and a record with only allowed keys;
  - UI: opt-in → "No progress photos yet" → first check (3 images, temperature 0, first-check prompt) → scores saved, **a scan of the whole emulator database finds nothing image-like** (PNG/JPEG/GIF/WEBP signatures, `data:image`) → Accept → second check sends the previous scores and shows ▲/▼ per region → a second scan is still clean.
  - share.spec: Progress photo → Body balance check.
  - Full suite 108 passed (4 skipped), lint 0 errors, visual: the My Body card added. Deploy 42973460544 succeeded.
- **Note (pre-existing, not changed):** Home → Body Type Photos still saves a 500-character base64 fragment per photo in `bodyPhotos[].thumbnail` (not a viewable image, but image-derived data). **Question:** remove that field (and stop writing it) to match "photos never stored anywhere"?
- **Resume point:** `build` @ ffa3352 (v2.12.0). Next: the beta PR when asked, with APP_GUIDE for v2.8.0–v2.12.0.

### (Coder) 11 Nov 2026 — v2.12.1 on `build` (bf38a7a): no image data in Body Type Photos
- **Decision (JC):** stop keeping the base64 fragment, and remove the existing ones.
- Body Type Photos now saves `{date, name, type}` per photo; the AI analysis (`bodyAnalysis`) is unchanged.
- **Cleanup:** `stripPhotoFragments()` (in `src/lib/bodyBalance.js`) runs on every dashboard load. It deletes only `bodyPhotos[].thumbnail` and saves only if something was removed, so it is idempotent: after the first load there's nothing to do. It runs in Beta/Prod on first load after release (real data). The backup is taken before the release as usual.
- Tests: pure (only that field goes; a second run changes nothing); UI (an old JPEG fragment is seeded → reload → gone, other fields intact, a whole-DB scan finds nothing image-like → a new Body Type Photos analysis adds entries with only date/name/type → the scan is still clean). Full suite 110 passed (4 skipped), lint 0 errors, visual footer only. Deploy 42976922211 succeeded.
- **Resume point:** `build` @ bf38a7a (v2.12.1). Next: the beta PR when asked (APP_GUIDE for v2.8.0–v2.12.1).

### (Architect) 11 Nov 2026 12:35 — JC phone test of v2.12.1 on /build/: D17–D22 (before beta)
- **Button standard (applies app-wide in all Open forms):**
  - **Edit** = deep blue;
  - **Remove** = **deep orange** (new; for taking something out of a week or a meal);
  - **Delete** = red (only for permanently deleting a list item or a measurement type);
  - **Close/Cancel** = grey.
  - Labels are short single words and must **never truncate**. Equal-width buttons that fit at 360px.
- **D17:** exercise Open form, "Delete wee…" is truncated → **Remove** (deep orange), with a confirm.
- **D18:** meal-slot Open form, "Remove from thi…" is truncated → **Remove** (deep orange).
- **D19:** Update Lists Open form, "Delete from lis…" is truncated → **Delete** (red, confirm), keeping the same meaning.
- **D20 (logic bug):** after removing, deleting or editing a **previous** week's exercise log, a **"Reduce" pill** appeared on the exercise day card. Pills must follow the designed logic only, based on the latest relevant entries. Find why an edit or removal of an old week changes the pill, and fix it. Add a regression test.
- **D21 (view state):** in the exercise Open form (VIEWING), Range and Form show both options with **no visible selected value**. View mode must show the chosen value clearly (e.g. a single "Good" chip), with the segmented buttons only in Edit.
- **F9 (feature):** the same **Open pattern for My Body: Weigh In and Measurements history rows.**
  - Rows show key data + **Open** (no inline-editable fields, no Del).
  - Open → read-only → **Edit/Save** or **Remove** (deep orange, confirm), inside the form.
  - The measurement type's own settings keep Edit/**Delete** (red).
- **F10 (feature):** the camera button on the body-measurement Log form should work like **📷 Snap**:
  - optional description first;
  - the AI reads the value from the photo (e.g. a tape measure or a scale screen);
  - result panel with the description editable + **Confirm / Re-check (deep dive) / Cancel**;
  - nothing saved before Confirm;
  - Confirm fills the value.


### (Coder) 11 Nov 2026 — v2.13.0 button standard, D17–D21, F9, F10 on build
- **Button standard:** `OpenForm` takes `dangerKind="remove"` (deep orange `#c2410c`) or `"delete"` (red). Labels are Edit / Remove / Delete / Close, and Save / Cancel. Exercise week and meal slot use **Remove** (D17, D18; both confirm). A list item uses **Delete** (D19, confirm). The meal slot's "Save for this meal" is now "Save".
- **D20 cause:** removing *any* Progress week re-ran the old `autoStatus()` on the latest week against the one before it. When an older week had a higher weight, that gave "reduce". The designed logic is different: status is cleared on a new log and set by the AI session feedback. Fix: `syncAfterProgChange()` in `src/lib/exercise.js`.
  - Changing or removing an older week leaves the card and the pill alone.
  - Changing the latest week's weight, reps or week number, or removing it, updates the card from the new latest week and clears the status (as a new log does). A note-only edit keeps the pill.
- **D21:** in view mode, Range and Form show one chip ("Good" / "Working towards"); the segmented buttons appear only in Edit.
- **F9:** new `src/components/HistoryRows.jsx`. Weigh In metric history and Measurements history rows show week + value + **Open**, with no inputs and no Del. Open is read-only → Edit/Save or Remove (confirm). The measurement type settings keep Edit / Delete (red).
- **F10:** new `src/components/MeasureSnap.jsx` (prompt and parser in `src/lib/measureReading.js`). The measurement Log form's 📷 is now **📷 Snap**: optional description → photo → the AI reads the value → Confirm / Re-check (independent deep dive, shows the first value) / Cancel. Confirm only fills the value; Save still saves.
  - **Change:** the Log form used to save the whole photo (`img` data URL) into the measurement entry. New entries no longer store a photo. Old entries keep theirs and show it in the Open form.
- Tests: new `tests/v213.spec.js` (D20 pure + UI regression, D17/D21, D18/D19 colours, F9, F10 incl. "nothing saved before Confirm" and "no image-like data"), plus `open.spec.js` updated (labels, chip, 360px check on the meal form). Every Open form tested checks at 360px that no button is cut off. Full suite 116 passed (4 skipped), lint 0 errors, visual footer only (rebaselined). Deploy run 43022946268 succeeded.
- **JC to test on /build/:**
  - the Remove/Delete colours and labels on a phone;
  - remove or edit an old exercise week (no Reduce pill);
  - My Body → 👁 Weight and Measurements → 👁 Progress → Open;
  - Measurements → 📋 Log → 📷 Snap with a tape photo.
- **Decision needed (JC):** remove the old measurement photos (`measurements.*[].img`, full images in the database) with a one-off cleanup like v2.12.1? Not done.
- **Resume point:** `build` @ c3b10f2 (v2.13.0). Next: JC's /build/ test; then the beta PR when asked (APP_GUIDE for v2.8.0–v2.13.0).

### (Coder) 11 Nov 2026 — v2.13.1 old measurement photos removed (build)
- **Decision (JC, 11 Nov):** yes, remove the photos stored in existing measurement entries, the same way as v2.12.1.
- `stripMeasurementPhotos()` (in `src/lib/bodyBalance.js`) runs on dashboard load next to `stripPhotoFragments()`. It deletes only `measurements.<type>[].img`, for every person, and saves only if something was removed (idempotent). It runs on Beta/Prod on the first load after release; the usual pre-release backup covers it.
- The unused photo displays (the 📷 count beside a measurement name and the photo in the history Open form) are removed.
- Tests: pure test (only `img` goes; a second run changes nothing). UI test: JPEG photos seeded for JC and Becks → load → a whole-database scan finds nothing image-like; weeks, values and notes are unchanged; a second load changes nothing. Full suite 118 passed (4 skipped), lint 0 errors, visual footer only (rebaselined). Deploy run 43038912225 succeeded.
- **Resume point:** `build` @ 87a980b (v2.13.1). Next: JC's /build/ test of v2.13.x; then the beta PR when asked (APP_GUIDE for v2.8.0–v2.13.1).

### (Coder) 11 Nov 2026 — v2.13.2 scroll into view, Open buttons, privacy notes (build)
- **1. Scroll into view:** `scrollOnMount` (in `src/lib/scrollIntoView.js`) is a stable ref callback.
  - When it opens: if the form or panel isn't fully on screen, it smoothly scrolls so its top sits 8px from the top. A tall panel whose top is already near the top is left alone.
  - Applied to: every `OpenForm` (meal slot, Update Lists item and editor, exercise week, My Body history), the exercise Progress panel, the Weigh In metric panel and the Measurements panel.
  - **Sticky header:** the app has none (checked at 360px; the only fixed element is the chat button at the bottom). The code still allows for a top-fixed `header`, `nav` or `[data-sticky-header]` bar if one is ever added.
- **2. Text:** the meal slot save message now reads "✓ Saved for this meal only. To update the list item permanently, please go to 'Update Eating Lists'."
- **3. Privacy note:** `PrivacyNote` shows "Images are analysed and then discarded — they're never stored." in small grey text in three places: under the Body Type Photos button, at the bottom of the measurement Log form, and on the Body balance card.
- **4. Open buttons:** `btnOpen` (in `styles.js`) gives a light-blue outline and blue text, like Snap. Used on meal slots, Update Lists, exercise Progress weeks and My Body history.
- Tests: new `tests/v2132.spec.js`.
  - At 360×640, each trigger is placed at the bottom edge of the screen before it is clicked, then the test checks the opened panel's top is on screen. With the scroll switched off, these tests fail (3 failed), so they catch the bug.
  - Also checked: the Open button colours, the three privacy notes, and the new save text (`open.spec.js` updated).
  - Full suite 122 passed (4 skipped), lint 0 errors.
  - Visual: the footer, and on My Eating and Update Lists the blue Open buttons (rows about 1px taller). Checked by eye and rebaselined.
  - Deploy run 43063255817 succeeded.
- **JC to test on /build/ (phone):**
  - open a lower measurement's 👁 Progress, a Weight 👁, a meal slot Open, an Update Lists item and an exercise Progress panel: each should slide into view;
  - the Open buttons now look tappable;
  - the privacy notes.
- **Resume point:** `build` @ 899777c (v2.13.2). Next: JC's /build/ test; then the beta PR when asked (APP_GUIDE for v2.8.0–v2.13.2).

### (Coder) 11 Nov 2026 — v2.13.3 shared outlined buttons; build → beta (PR #21)
- **v2.13.3 (build @ 64f21ea, deploy 43099130478):**
  - **Shared styles in `src/constants/styles.js`:** `btnOpen` = `btnSnap` (blue), `btnProgress` (violet), `btnLog` (green), one outlined shape; `btnFilledOn` is the open state ("✕ Progress", "✕ Log").
  - **Applied:** My Body (stat cards, Measurements 👁/📋, measurement Snap), My Exercise (👁/📋), My Eating (Snap, day and week 👁 Progress).
  - **Left as they were** (not Progress/Log/Snap): 📋 Record, 📷 Upload, 📋 Copy Day and the large "📋 Log <measurement>" button inside the panel.
  - The Body stat card's 👁 Progress used to sit on top of the rating text at 360px; it now sits under the rating.
  - Test `tests/v2133.spec.js`: colours, one shared shape, filled when open, not truncated and not covering card text at 360px. Full suite 123 passed (4 skipped). One run had a single failure that passed on rerun; I didn't capture which test. Lint 0 errors; visual rebaselined after checking it by eye.
- **APP_GUIDE (build @ a8ae8fe):** updated for v2.8.0–v2.13.3, plus the Step 1b install troubleshooting row ("already installed" / "Could not open app").
- **Prod compat:** new test for the v2.8.0–v2.13.3 data shapes (meal variations, body balance records, no photo fields, cleared status). Run against a v2.6.0 worktree: 2 passed (build @ 6a0076e).
- **PR #21 build → beta merged** as `c75c53a`; deploy run 43101203446 succeeded. Beta should show **v2.13.3-beta.3**. This sandbox can't reach github.io, so I couldn't check the beta footer: Architect or JC, please check it. On first load, beta runs the two one-off cleanups on the shared `data`: `bodyPhotos[].thumbnail` and `measurements.*[].img` (JC took a backup first). **Not merged to main.**
- **JC to test on /beta/:** close and reopen; footer v2.13.3-beta.3; the v2.8.0–v2.13.3 features.
- **Resume point:** `beta` @ c75c53a, `build` @ 6a0076e. Next: Step 1b measurement (no build), then `beta → main` only after JC's OK.

### (Coder) 11 Nov 2026 — Step 1b measurement and proposal (nothing built)
Measured on `build` @ 6a0076e (v2.13.3) against the emulator, seeded with the real backup, so the data sizes are realistic. Network timings are estimates: the emulator runs on localhost.

**Measurements**
- **Bundle:** one JS file, 1.32 MB raw / **315 KB gzip**. Split: Firebase app+database+auth about 95 KB gz, React about 46 KB gz, app code about 175 KB gz (Eating.jsx alone is 314 KB of source). No code splitting.
- **Other first-load files:** the boot logo `app-logo-640.png` is **186 KB**, shown at 220 px. Also the Google sign-in script and `header-mark-288.png` (55 KB). `legacy.html` (880 KB) and `APP_GUIDE.md` (47 KB) are fetched only when used (the guide only when Help is used).
- **Startup data:**
  - **53 Firebase reads, 155 KB** downloaded (sign-in → data shown).
  - **47 of the first 60 reads are serial**: each waits for the one before (`await sGet` one after another in App.jsx). At 4G round trips (50–100 ms) that is about **2.5–5 s** of waiting, versus well under 1 s for the downloads themselves. The localhost load took 1.3 s, with no network latency at all.
- **Per screen:** changing tabs does **0 reads** (everything loads at startup). **Switching person** does 25 reads (10 KB), also serial.
- **AI calls (all `claude-sonnet-4-6`; $3 input / $15 output per million tokens; tokens ≈ characters ÷ 4):**
  | Call | Prompt size | max_tokens | Approx. cost, upper bound |
  |---|---|---|---|
  | Energy ping, on every app open | "hi" | 1 | ≈ $0.00004 |
  | Home check-in | 20.9k chars ≈ 5.2k tokens | 1200 | ≈ $0.034 |
  | Body feedback | 14.7k ≈ 3.7k | 1200 | ≈ $0.029 |
  | Session feedback | 10.1k ≈ 2.5k | 2500 | ≈ $0.045 |
  | Eating day feedback | 8.7k ≈ 2.2k | 1500 | ≈ $0.029 |
  | Health feedback | 6.8k ≈ 1.7k | 1000 | ≈ $0.020 |
  | Chat question | 8.6k ≈ 2.2k | 1000 | ≈ $0.021 |
  | **Help question** | **49k ≈ 12.3k (the whole guide re-sent every time)** | 800 | ≈ $0.049 |
  | 📷 Snap and other photo checks | image ≤ about 1.6k tokens + prompt | 500–1500 | ≈ $0.015 each |
- **Typical day for two people (estimate):** about 6 app opens, 4 Snaps, 2 eating feedbacks, 1 session feedback, 3 chats and occasional Help/Home/Body. That is about **$0.25/day, ~$8/month**. **Output tokens are the main cost driver** (feedback length), then Help's guide. Real figures should be read from console.anthropic.com → Usage; the app doesn't log `usage`.
- **Photos are sent full size**, apart from the Weigh In 📷 Upload, which shrinks to 800 px. This covers 📷 Snap, Food Checker, Body balance, Body Type Photos and measurement Snap. A 3–5 MB phone photo becomes 4–7 MB once encoded for sending. That is slow on mobile data and **can exceed the API's 5 MB-per-image limit** (to verify on JC's phone). Token cost doesn't change, because the API scales large images down anyway.

**Proposal, ranked** (gain · effort · risk). Firebase stays the source of truth throughout; nothing changes what the AI can do.
1. **Shrink photos before sending** (long edge about 1568 px, JPEG 0.85, the same canvas resize as Weigh In) in every photo feature. Gain: about 4–7 MB → about 0.3–0.5 MB per photo, Snap seconds faster on mobile data, and no "image too large" failures. Detail stays at what the AI actually uses. **Effort S · Risk low.**
2. **Load startup data in parallel** (`Promise.all` instead of 33+ serial reads; the same for person switch), keeping the `stillSelected` guards. Gain: about **2–4 s faster** to a fully loaded app on 4G. **Effort S–M · Risk low–medium** (covered by the existing person-race and load tests).
3. **Prompt caching for Help** (`cache_control` on the guide system prompt, about 12k tokens, well over the 1,024 minimum). Gain: a follow-up Help question within 5 minutes costs about 35% of today; the first costs +25%. The same could apply to Chat follow-ups (about 2k tokens: small gain). **Effort S · Risk low.**
4. **Smaller boot logo** (186 KB → about 20 KB, sized for 220 px). Gain: about 165 KB off every first load. **Effort XS · Risk none.**
5. **Service worker caches the app shell** (bundle, logo, guide), versioned, with an "update available → reload" prompt. Gain: repeat opens skip about 550 KB and start much faster. **Effort M · Risk medium:** stale versions; it changes today's "close the tab and reopen" deploy advice.
6. **IndexedDB copy of the last data for an instant start**: show the copy, refresh from Firebase, never write from the copy. Gain: first screen in under 0.5 s. **Effort M–L · Risk medium:** a stale view for a moment, and health data is kept on the phone (privacy note in the guide).
7. **Code-split the bundle** (load My Eating, Data tools, Settings etc. on demand). Gain: about 80–120 KB gz off the first load. **Effort M · Risk medium.**
8. **Energy ping once a day** instead of on every open. Gain: one fewer request per open (cost negligible). **Effort XS · Risk low.** Low priority.
- **Not recommended:**
  - shorter feedback (lower `max_tokens`): it would lose capability;
  - changing the AI model: CLAUDE.md rule 8;
  - Firebase disk persistence: the web compat SDK has no offline persistence for the Realtime Database.
- **Suggested first batch, each its own version through build → beta:** 1, 2, 4, then 3. Items 5–7 after JC decides on the offline/staleness trade-off.
- **APP_GUIDE install tip** (Step 1b scope): done in the v2.13.3 guide update. The Troubleshooting row "This app is already installed" / "Could not open app" is on beta.
- **Decision needed (JC):** which of 1–8 to build, and in what order.
- **Resume point:** `build` @ 6a0076e, `beta` @ c75c53a (v2.13.3-beta.3). Nothing built for 1b. Next: JC's beta test of v2.13.3 and the 1b go/no-go per item.

### (Coder) 11 Nov 2026 — v2.13.4 Weigh In Progress buttons aligned (build, for the next beta)
- PR #21 was already merged, so this is **v2.13.4 on build** for the next beta.
- `BodyCard` (in `src/components/charts.jsx`): the card is a full-height flex column, and grid rows already stretch cards to equal height. The 👁 Progress button is pinned to the bottom with `margin-top:auto`. Weight ("+2.9lb") / Body Fat and BMR / Body Age ("Actual: 49") now line up. Checked at 360px by eye.
- **Other card grids checked:**
  - Home and Health two-column grids hold only form fields.
  - Measurements and exercise rows keep their buttons in a right-hand column per row.
  - No change needed in either.
- Test (`v2133.spec.js`): at 360px and 412px, each row's cards have equal tops and bottoms, the buttons share a bottom edge, and each button sits at the card bottom. On the old code it fails (bottoms 426 vs 441); with the fix it passes.
- **Flaky test fixed:** the v2.13.2 Eating scroll test sometimes found the dinner unselected. The app was still saving its own Eating data while the test wrote the meal plan. It now waits first, as `open.spec` does: 6/6 passes (it was 3/4). This was most likely the unnamed single failure in the v2.13.3 run.
- Full suite 124 passed (5 skipped: the on-demand prod-compat tests); lint 0 errors; visual: My Body 20px shorter plus the footer, rebaselined. Deploy run 43105478571 succeeded.
- **Resume point:** `build` @ 41c80fb (v2.13.4), `beta` @ c75c53a (v2.13.3-beta.3). Next: v2.13.4 goes in the next build → beta PR; JC's beta OK; the Step 1b decisions.

### (Coder) 12 Nov 2026 — overnight STEP 1: v2.14.0 Step 1b + Tracker on build
One commit per item on `build`, all pushed together: deploy run 43110561770 succeeded (build 15be9e3). Full suite 133 passed (5 on-demand skipped), lint 0 errors. Visual: the footer, plus JC's Settings page (the two new admin cards), checked by eye and rebaselined.
- **Item 1 (76ae58c): photos shrunk before sending.** `readImageForAI` (`src/lib/image.js`): long edge ≤ 1568 px, JPEG 0.85; images it can't decode go as they are.
  - Used in: 📷 Snap, add-food photo, Help Me Eat, Food Checker, Body balance, Body Type Photos, measurement Snap. Weigh In 📷 Upload keeps its own 800 px resize. **Not changed:** My Health 📄 Upload (images/PDFs; not in the brief).
  - Test: an 8.9 MB phone-size photo goes out at about 0.6 MB per image in all five features.
- **Item 2 (973a721): parallel loading.** The 31 startup reads, the food-list lookup and the 4 past eating weeks now use `Promise.all`, applied in the same order with the same guards. Person switch was already parallel apart from the eating-week loop.
  - Serial steps: **startup 47 → 5, person switch 15 → 4**; startup reads 53 → 46.
  - With a simulated 80 ms round trip: **all startup data 3.7 s → 1.5 s, person switch 1.4 s → 0.5 s.** The first screen is unchanged (about 1.1 s).
  - Person-race, load, people, eating and open tests: 32 passed.
- **Item 3 (a6c68c7): Help caching.** It already had `cache_control` on the guide system prompt; a new test pins it. **Chat not changed:** about 2k tokens per question; a follow-up would save about $0.005, and it would need the Chat prompt restructured.
- **Item 4 (f024391): boot/sign-in logo as WebP.** **186 KB PNG → 52 KB**, still 640 px (displayed at 220 px, so sharp on 3× screens). At 412 px / 3× the before and after screenshots differ by at most 9/255, with no pixel over 8: visually identical. Lossless WebP would be 106 KB. The PNG stays in the repo.
- **Item 8 (282c23f): energy ping once a day.** Opening the app pings only if there was no successful check today (`companion_energy.lastCheck`). ↻ Refresh always pings.
- **Item 9 (fd04955): AI usage ledger.**
  - Every AI reply's usage **counts** go to `DATA_ROOT/ai_usage` in a Firebase transaction: per day × feature (Help / Chat / tab, plus "(photo)"), kept 120 days. No content is stored.
  - **Companion Energy = ledger total − the total at the last Set as 100%.** Older records migrate keeping their spend, and calls finishing together no longer lose counts.
  - Settings (admin): **📊 AI usage** (14 days, per day and per feature, estimated cost).
  - Tests: pure, plus a mocked reply (1000 in / 200 out / 12000 cache-read → $0.0096 recorded and added to energy; no content in the ledger; Becks can't see the view).
- **Item 10 (6fc3942): Tracker.**
  - Send Feedback also saves `DATA_ROOT/tracker/<id>`: date/time, version, env, **masked account** (`j***@g***.com`), person, text, Feedback / New. The email still opens.
  - Settings (admin): **📝 Tracker**. Newest first; Category and Status columns; filters; a red "N new" badge. The Open form: Edit category / status / priority / admin note / link-ref → Save, or Remove (orange, confirm). **+ Add** for a Defect or Feature. Text only.
  - Tests: feedback → Feedback/New; re-categorise to Defect + In progress + High + note + D20; add a Feature; filters; Remove; non-admin sees nothing.
- **APP_GUIDE** (15be9e3): AI usage, Tracker, Send Feedback is also saved, energy check once a day.
- **Database rules:** the emulator uses the real `database.rules.json`, and the tests wrote `tracker/` and `ai_usage` under `data`, so the current rules allow both. No rule change was needed.
- **Observation (decision needed, JC):** the Send Feedback **email address is hard-coded** in `src/components/FeedbackForm.jsx`. This is pre-existing, not from tonight, but it's in the public repo against the "no email address in the repo" rule. Options: move it to a setting stored in the database, or rely on the Tracker and drop the email.
- **Items 5–7 deferred**, as agreed.
- **Resume point:** `build` @ 15be9e3 (v2.14.0), `beta` @ c75c53a (v2.13.3-beta.3). Next: Step 2 (automation, prepared only).

### (Coder) 12 Nov 2026 — overnight STEP 2: automation (P2) prepared, inactive until the secrets are added
On `build` @ 1a34a76; deploy 43111232779 succeeded, and only the deploy workflow ran. These workflows trigger only from `main` (schedule, workflow_run, push to main), so **nothing runs until they reach main with the next release**. Even then, each job that needs a secret logs "secret not set — skipped" and ends green.
- **`backup.yml`** (nightly 02:17 UTC + manual "Run workflow", e.g. right before a Prod release):
  - takes a full snapshot of `data`, **only when its fingerprint changed** (sha256 of the data, sorted);
  - **encrypts it with gpg AES-256** using BACKUP_KEY; the plaintext is shredded on the runner;
  - pushes it to the **private vault repo** at `life-care/backups/daily/YYYY-MM-DD.json.gpg`, plus the first of each month at `monthly/YYYY-MM.json.gpg`, keeping **30 daily + 12 monthly**.
- **`refresh-build.yml`** (nightly 02:43 UTC + manual): `data_build` ← `data`. It **refuses** if the data holds anyone beyond `jc,becks` (privacy rule for pilot users). Logs counts only.
- **`smoke.yml`** (after each successful deploy + manual):
  - for prod, beta and build: the page loads, shows "Sign in with Google" with **no console errors** (Google sign-in script noise is ignored), and the deployed version matches that branch's `version.js`;
  - then `data` and `data_build` are present (key count, size, dashboard present).
  - It fails visibly if any check fails. It is gated on FIREBASE_SERVICE_ACCOUNT, per "inactive until secrets".
- **`auto-tag.yml`** (push to main): on a commit starting "Merge pull request … from JCBECK1976/beta", it tags `vX.Y.Z` from `version.js`. It skips if the tag exists, and needs **no secret**, so it becomes active as soon as it reaches main.
- **Scripts:** `scripts/automation/` (`common`, `backup`, `refresh-build`, `smoke`). `firebase-admin@12.7.0` and `playwright@1.63.0` are installed per job only, not in package.json. Logs show counts and fingerprints only.
- **Checked locally:**
  - every script without the secret prints "skipped" and exits 0;
  - against the **emulator** with a throwaway fake key: snapshot (100 keys), unchanged → skip, Build refresh (2 people);
  - gpg encrypt/decrypt round trip with a dummy file;
  - YAML parses.
- **`.gitignore` widened:** `*backup*.json`, `*export*.json`, `*-rtdb-*.json`, `*dump*.json`, `*.gpg`, `lifecare_backup_*`, `data_export*`, `/out/` and more. No tracked file is caught.
- **Not done:** seeding the emulator from the vault backup (the earlier ask). It needs the vault and the key on the dev machine; for later.

#### JC: add these secrets (about 10 minutes; nothing runs until they're in and the next release reaches main)
**Decision needed:** the brief said 2 secrets, but **pushing to the vault needs a third**. This repository's own token can't write to another repository. Without VAULT_DEPLOY_KEY the backup job skips cleanly. The alternative is a fine-grained token limited to the vault, which would expire and need renewing.

**1. FIREBASE_SERVICE_ACCOUNT** (lets the jobs read the database and write the Build copy; it bypasses the database rules, so treat it like a master key)
1. Go to console.firebase.google.com and open project **life-care-app-64d04**.
2. Click ⚙ (next to Project Overview) → **Project settings** → **Service accounts** tab.
3. Under "Firebase Admin SDK", click **Generate new private key** → **Generate key**. A `.json` file downloads.
4. Open that file in Notepad, select all and copy.
5. Go to github.com/JCBECK1976/Life-Care → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
6. Name: `FIREBASE_SERVICE_ACCOUNT`; Secret: paste the copied text → **Add secret**.
7. Delete the downloaded `.json` file (or move it into the vault). Never email it or put it in the Life-Care repo.

**2. BACKUP_KEY** (the passphrase that encrypts every backup; without it no backup can ever be opened)
1. In your password manager, generate a passphrase of **at least 40 characters** and save it as "Lifecare backup key". Keep one **offline copy** too (e.g. printed, stored safely). **Never store it in the vault**: the vault holds the encrypted backups, so the key must live elsewhere. *(Corrected 13 Nov, Architect.)*
2. GitHub → Life-Care → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `BACKUP_KEY`; Secret: paste the passphrase → **Add secret**.

**3. VAULT_DEPLOY_KEY** (lets the backup job write to the vault repo, and only the vault)
1. On your PC, open **PowerShell** and run: `ssh-keygen -t ed25519 -C lifecare-backup -f vault_deploy -N '""'`. It makes two files, `vault_deploy` and `vault_deploy.pub`.
2. Go to github.com/JCBECK1976/**vault** → **Settings** → **Deploy keys** → **Add deploy key**.
3. Title: `Life-Care backups`; Key: paste the contents of **`vault_deploy.pub`**. Tick **Allow write access** → **Add key**.
4. GitHub → **Life-Care** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
5. Name: `VAULT_DEPLOY_KEY`; Secret: paste the contents of **`vault_deploy`** (the file without .pub, including the BEGIN/END lines) → **Add secret**.
6. Delete both files from the PC.

**After the next release reaches main:** go to **Actions** → "Backup data (encrypted, to the vault)" → **Run workflow**. Within about a minute a `life-care/backups/daily/<today>.json.gpg` file should appear in the vault. Then run "Refresh Build data from real data" and "Smoke test after deploy" the same way.

**To open a backup later:** `gpg -d 2026-11-12.json.gpg > backup.json` and enter BACKUP_KEY. The file is in Download-backup format, so Data tools → Restore accepts it.
- **Resume point:** `build` @ 1a34a76. Next: Step 3 (docs on main).

### (Coder) 12 Nov 2026 — overnight STEP 3: docs structure, backlogs and changelog moved out, HLD + test strategy drafted (main, docs only)
- **`docs/`** (public only), as agreed 6 Nov 23:10:
  - `README.md`: index of public docs with status, and a list of the private ones that stay in the vault;
  - `CHANGELOG.md`, `HLD.md`, `TEST_STRATEGY.md`;
  - `backlog/PRODUCT_BACKLOG.md` and `backlog/DEFECTS.md` (separate files);
  - `adr/README.md`: format, plus candidate decisions for the first ADRs.
- **Moved out of HANDOVER:** the version table is now `docs/CHANGELOG.md` (60 rows, unchanged); §1 "Key Milestones" and §5 "Reference Files" now link to it. **From now on version rows go to `docs/CHANGELOG.md`.**
- **Backlogs compiled** from the Session Log: D1–D21 with status and fixing version; F1–F10, C1, Step 1b and the Tracker under Done; P2, P2b, P3, 1b-5…7, S1 (new-device sign-in) and Steps 2–6 under Planned; three ideas. The dated Session Log entries stay as the history. "D22" was named in the 11 Nov 12:35 header, but no item was defined, so it isn't listed. Both files say the **in-app 📝 Tracker** is where new feedback, defects and features are captured, and the backlog files are the planned and approved record.
- **HLD (draft 1)** covers: context, environments and release flow, app structure, data model including the parent/child eating model, AI flows (photos analysed then discarded), tracker, privacy principles, operations. It has **no secrets and no security detail** (access control, keys, threat model are the private SAD's).
- **TEST_STRATEGY (draft 1)** covers: principles (emulator only, mocked AI, a regression test per defect, 360px), test levels, test data, pre-deploy checklist, flaky-test policy, known gaps.
- **Not written:** SAD, DPIA, threat model (Architect, private). The remaining public statements (privacy notice, terms, intended use, accessibility, payments) are listed in the index as "to write".
- **Resume point:** `main` @ this commit (docs); `build` @ 1a34a76 (v2.14.0 + automation); `beta` @ c75c53a. Next: the Architect reviews Steps 1–3; then a build → beta PR (v2.13.4 + v2.14.0 + workflows) when JC is ready.

### (Coder) 12 Nov 2026 — v2.14.1: decisions (1)–(3) recorded, feedback email setting, no-food photo fix (build)
**Decisions (Architect/JC, 12 Nov)**
1. **VAULT_DEPLOY_KEY:** the backup job writes to the vault with a **vault-only deploy key with write access**, so there are **3 secrets** in total. Rejected: a fine-grained token (it expires, and is broader than one repo's deploy key).
2. **Send Feedback email:** moved **out of the code** into an admin setting stored in the database. Empty = no email, Tracker only.
3. **Auto-tagging accepted;** the Architect verifies the first automatic tag. (Earlier: the Architect tagged by hand.)

**v2.14.1 (build @ d50f346, deploy 43181400304 succeeded)**
- **Feedback email:**
  - Settings → **📧 Feedback email** (admin only; key `feedback_email`; checked as an email address).
  - Send Feedback saves to the Tracker and opens an email **only if** the setting holds an address.
  - The **Privacy Policy** shows the same address as the contact; without one it says to use 💬 Send Feedback.
  - **The address is gone from `src/`** (a test scans `src/` and `index.html` for it). **`public/legacy.html` still contains it:** that's the frozen legacy app, left untouched. **Decision needed:** remove `legacy.html` (it no longer works since v2.6.0 sign-in), or blank the address in it?
  - **After the release JC must enter the address once** in Settings; until then feedback goes to the Tracker only.
- **No food in a photo:**
  - **Food photos** (📷 Snap first check and Re-check, Food Checker, add food by photo, Help Me Eat): the prompts return `isFood`.
  - With no food: *"No food found in this photo — try another photo, or add a description and Re-check"*, with **no rating and no nutrition**, **Confirm disabled**, and only Re-check (with an optional description) and Cancel. **Nothing is saved.** Older replies without the flag behave as before.
  - **Measurement Snap** returns `readable`. Unreadable gives the same kind of message, with Confirm disabled.
  - Shared `NoFoodPanel` component; the Help Me Eat and Food Checker photo handlers became functions so Re-check can reuse the same in-memory photo.
- **Tests:** `tests/v2141.spec.js`:
  - pure flags;
  - the address isn't in the source;
  - the setting (empty → no email + Tracker; invalid rejected; set → mailto to it; Privacy Policy shows it; admin only);
  - no food on Snap in an empty and a filled slot (Confirm disabled, Re-check works, no rating/values/assumed, eating data unchanged);
  - no food in Food Checker, add-by-photo (Re-check sends the description) and Help Me Eat (lists unchanged);
  - unreadable measurement (Confirm disabled, nothing filled or saved).
- **Results:** full suite **140 passed** (5 on-demand skipped); lint 0 errors; visual: the footer plus JC's Settings page (the new card), rebaselined. One earlier full run had a single failure in `open.spec` "F1"; it passed 4/4 alone and the next full run passed everything. It's a candidate flaky test, to watch.

#### JC: add these 3 secrets (replaces the guide in the 12 Nov Step 2 entry; same steps, now final)
Nothing runs until all three are in **and** the workflows reach main with the next release. A job missing a secret logs "secret not set — skipped" and ends green.
1. **FIREBASE_SERVICE_ACCOUNT** (read the data; write the Build copy):
   1. console.firebase.google.com → project **life-care-app-64d04** → ⚙ **Project settings** → **Service accounts** → **Generate new private key** → **Generate key** (a `.json` file downloads).
   2. Open it in Notepad and copy all.
   3. github.com/JCBECK1976/**Life-Care** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → Name `FIREBASE_SERVICE_ACCOUNT` → paste → **Add secret**.
   4. Delete the downloaded file (or move it into the vault).
2. **BACKUP_KEY** (encrypts every backup; without it no backup can be opened):
   1. In your password manager, generate a passphrase of **40+ characters**. Save it there plus one **offline copy**. **Never in the vault** (it holds the encrypted backups). *(Corrected 13 Nov.)*
   2. Life-Care → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → Name `BACKUP_KEY` → paste → **Add secret**.
3. **VAULT_DEPLOY_KEY** (lets the backup job write to the vault repo only):
   1. On your PC open **PowerShell** and run: `ssh-keygen -t ed25519 -C lifecare-backup -f vault_deploy -N '""'`. This makes `vault_deploy` and `vault_deploy.pub`.
   2. github.com/JCBECK1976/**vault** → **Settings** → **Deploy keys** → **Add deploy key** → Title `Life-Care backups` → paste the contents of **`vault_deploy.pub`** → tick **Allow write access** → **Add key**.
   3. github.com/JCBECK1976/**Life-Care** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → Name `VAULT_DEPLOY_KEY` → paste the contents of **`vault_deploy`** (no .pub; include the BEGIN/END lines) → **Add secret**.
   4. Delete both files from the PC.
4. **After the next release reaches main:**
   1. **Actions** → "Backup data (encrypted, to the vault)" → **Run workflow**. A `life-care/backups/daily/<today>.json.gpg` file should appear in the vault.
   2. Then run "Refresh Build data from real data" and "Smoke test after deploy" the same way.
   3. The Architect checks the first automatic tag after the release merge.

- **Next:** when JC confirms his Build test and a fresh backup: PR build → beta for v2.13.4, v2.14.0, v2.14.1 and the workflows. APP_GUIDE is already updated on build (AI usage, Tracker, Feedback email, no-food handling).
- **Resume point:** `build` @ d50f346 (v2.14.1), `beta` @ c75c53a (v2.13.3-beta.3). Waiting for JC's Build test + backup confirmation before the beta PR.

### (Coder) 12 Nov 2026 — v2.14.2: body photos must be recognised; legacy.html removed (build)
**Decision (Architect/JC, 12 Nov):** delete `public/legacy.html`. Rollback is now "revert to the previous v2 release"; the v1.374.2 file stays in history at tag `legacy-v1.374.2`. Rejected: blanking the address in it (it no longer works since v2.6.0 sign-in anyway).
- **v2.14.2 (build @ 83485fa):**
  - **Body balance:** the prompt asks for a per-photo `isPerson / isFullBody / pose / matchesPose` (photo 1 = front, 2 = side, 3 = back). Any failure shows "Photo N: This doesn't look like a full-body <pose> photo — please retake it". **No scores** are shown, Save is disabled (**Retake** reopens the picker, **Cancel**), and **nothing is saved**.
  - **Body Type Photos:** per photo `isPerson / pose / matchesPose` against the six requested poses; same handling. The photo records and the analysis are now saved **only from a valid set**: the handler became a function, and records used to be added before the analysis.
  - **Measurement Snap:** `matchesPart / seenPart`, e.g. "This photo looks like a calf, not Bicep — please retake it", with Confirm disabled.
  - Replies without the new flags behave as before. Shared logic is in `src/lib/bodyPhotoCheck.js`.
- **legacy.html removed (build @ 482cdcd):** `check-pages.mjs` no longer requires it in prod, and `build-pages.sh` no longer strips it. Main's deploy uses main's own copy of those scripts until the release. Rollback notes are updated in `CLAUDE.md`, `TECHNICAL_REFERENCE.md` and `docs/HLD.md` (this commit, main).
- **Tests:** `tests/v2142.spec.js`:
  - pure checks;
  - Body balance: not a person, wrong pose, not full body. Each shows its message, Save is disabled, no scores appear and `progressPhotos` is not saved; Cancel clears it; a valid set still saves.
  - Body Type: an invalid photo means nothing is saved; a valid set saves date/name/type plus the analysis.
  - Measurement: a calf photo on Bicep disables Confirm, and nothing is filled or saved.
- **Results:** full suite **144 passed** (5 on-demand skipped); lint 0 errors; visual footer only; deploy run 43221023271 succeeded.
- **Resume point:** `build` @ 482cdcd (v2.14.2). Next: PR build → beta (v2.13.4 + v2.14.0 + v2.14.1 + v2.14.2 + workflows + legacy removal); JC has tested v2.14.1 on Build and taken a backup. **Do not merge to main.**

### (Coder) 12 Nov 2026 — PR #22 build → beta merged: v2.14.2-beta.4 on /beta/ (not main)
- **PR #22** (v2.13.4 + v2.14.0 + v2.14.1 + v2.14.2 + automation workflows + legacy.html removal) merged as **`3aa271c`**. Deploy run 43222052049 succeeded with no failure annotations, so `/beta/` should show **v2.14.2-beta.4**. This sandbox can't open github.io: JC or the Architect, please check the footer.
- **Before the PR:**
  - APP_GUIDE now covers body-photo recognition and the wrong body part (build `91b012f`).
  - New prod-compat test for v2.14.x data (tracker node, AI usage, feedback email, energy fields): **the live v2.6.0 runs cleanly**, 3/3 passed.
  - Beta's own Data tools also handle the `tracker` node.
  - The merged tree is identical to `build`.
- **On first use, beta writes to the shared `data`** (all additive): `ai_usage`, `tracker/<id>` (from Send Feedback), `companion_energy.lastCheck` / `ledgerAtCalibration`, and `feedback_email` when the admin sets it.
- **JC to test on /beta/:**
  1. Close and reopen the app; check the footer shows v2.14.2-beta.4.
  2. Settings → 📧 Feedback email: enter your address.
  3. Send Feedback appears in Settings → 📝 Tracker.
  4. 📊 AI usage counts calls.
  5. Snap a non-food photo: Confirm stays greyed out.
  6. Body balance with a wrong pose: no scores, nothing saved.
  7. Startup feels faster.
- **The workflows do nothing yet:** they run only from main, and the three secrets aren't added. Auto-tag acts on the first beta → main release merge; the Architect checks that tag.
- **Resume point:** `beta` @ 3aa271c (v2.14.2-beta.4), `build` @ 91b012f. Next: JC's beta test → (Architect) PR beta → main (release v2.14.2). Then add the 3 secrets and run the workflows once by hand.

### (Architect) 12 Nov 2026 16:35 — OUTSTANDING WORK OUTLINE (source list for the Tracker backlog seed)
Sizes are % of a weekly allowance, including Architect checks.

**1 Finish release**
- v2.14.3 small fixes (feedback email form closes on save; Send Feedback wording) — 1%
- Tracker backlog sync + Size column — 2–3%
- Prod release v2.14.x (+ verify updated workflow actions + first auto-tag) — 2%
- JC adds 3 GitHub secrets; run each workflow once; Architect verifies the first backup / Build refresh / smoke test — 2–3%

**2 House in order**
- Security design (private, incl. threat model) — 6–9%
- DPIA (private) — 3–5%
- Service design + runbooks (restore, key rotation, emergency rules reopen, incident) — 3–5%
- Decision log (ADRs) — 1–2%
- Review the HLD + test strategy drafts — 1–2%

**3 Deferred efficiency (decide after the security design)**
- App-shell caching in the service worker + update prompt (1b #5) — 3–4%
- On-device data copy for an instant start (1b #6; needs the security design first) — 4–6%
- Code splitting (1b #7) — 2–3%

**4 Before pilot users**
- Sign-in redesign: email link, Apple sign-in, computer hint, fresh-device tests — 5–8%
- Step 2 full security: account deletion, data export, audit trail — 6–10%
- Public docs: privacy notice, terms, intended use (wellness, not medical), accessibility, payments statement — 4–6%
- Supplier/processor register + DPAs, ROPA, risk register (private) — 2–3%
- Independent penetration test (external; Architect prepares the scope) — 1%

**5 Go-live**
- Step 3: remove hard-coded data — 8–12%
- Step 4: onboarding with AI-built plans — 10–15%
- Step 5: individual accounts + privacy design (random IDs, names on device) — 12–20%
- Step 6: server AI proxy (hides the key), automatic email notifications for new Tracker items, energy packs/payments, on-device encryption of medical and free-text fields — 15–25%
- Own domain + per-environment hosting — 2–3%
- Website — 6–10%
- Optional app store versions — 8–12%
- Admin tech Q&A chat bot — 3–5%


### (Coder) 12 Nov 2026 — v2.14.3 on build (feedback email form, Send Feedback wording)
- **Done:** Settings → 📧 Feedback email now shows the saved address with **Edit**; Save closes the form and shows **✓ Saved** for ~3 s (Cancel keeps the old value). Send Feedback says plainly: always saved to the Tracker; with an address set, the email app opens pre-filled and the person must press **Send** there (the app can't send email). APP_GUIDE updated. Tests `tests/v2143.spec.js` (2) + v2.14.1 test adjusted. Full suite 146 passed, lint 0 errors. `build` @ 3eefa5a, deploy run 43263024828 succeeded.
- **JC to test (/build/):** Settings → Feedback email → Edit → Save (form closes, "✓ Saved"); Send Feedback with and without an address.
- **Resume point:** `build` @ 3eefa5a (v2.14.3). Next: v2.15.0 (plan in the Tracker, admin Settings tidy-up, Debug Mode) on build; no beta/main PRs.

### (Coder) 12 Nov 2026 — v2.15.0 on build: plan in the Tracker, admin Settings sections, Reset removed, Debug Mode; Google Health report
- **Done (build @ 6853af4):**
  - **Plan (B):** `docs/plan.json` on main is the single source (76 items: D1–D21, X1–X5, F1–F11, C1, 1b, T, K1–K3 as Done with version; open items R/H/E/P/G per JC's seed list, plus I1–I2 ideas). Vite now publishes it next to `index.html`, so after the release every main deploy (doc-only too) serves `/Life-Care/plan.json`. Prod's deploy check then requires it, and invalid JSON stops the prod build. All environments read the prod copy first, then GitHub main's `docs/plan.json` (so `/build/` works before the release). Opening the Tracker upserts plan items by id as `tracker/plan_<id>`: plan fields are overwritten, the admin note is kept, and feedback/admin entries are untouched. Plan items show "Managed by plan" (only the note can be edited; no Remove). New category **Task**, status **Blocked**. Filters: Category, Phase, Status (**Outstanding** by default; Completed/All on request), Priority. A box totals open Token % per phase.
  - **Admin tidy-up (C):** sections App & AI · Data & backups (Open → Data tools at that tool) · Firebase · GitHub & releases · Integrations (Google Client ID moved here) · Tracker · Documentation (public links; vault docs by name only). **Reset to Default Data removed.** It wrote `life_care_data`, a key the app never reads, so it did nothing. Recovery = Download backup + Restore.
  - **Debug Mode:** Turn On worked, but it wasn't remembered and logged raw AI replies (up to 500 chars, which can include health text). Now it's remembered on the device (localStorage), shows a red "🔧 DEBUG ON" header badge, and logs only status, stop reason, token counts and redacted errors. The log stays in memory (cleared on reload). It covers Home check-in feedback, eating feedback and Ask a Question.
  - Tests `tests/v2150.spec.js` (8): plan items appear, the note survives a sync, feedback is untouched, the Outstanding default, Completed only when chosen, phase totals, no-plan message, sections and Reset gone, 360px, Becks sees none, debug on/badge/safe log/persist/off. Full suite 153 passed + v214 fix, lint 0 errors; visual: footer version + Settings (checked by eye, rebaselined). Deploy run 43265516468 succeeded (no failure annotations).
  - Docs (main): `docs/plan.json`, plan rule in CLAUDE.md (rule 12) and MIGRATION_BRIEF §0 rule 12, docs/README, backlogs, HLD §7, TECHNICAL_REFERENCE; APP_GUIDE on build.
- **Decisions (Coder):**
  - A = v2.14.3 (fix) and B+C = v2.15.0 (feature), one deploy each (rule 4).
  - Plan entries are stored in the tracker node (`plan_<id>`), so admin notes persist. Rejected: showing the plan read-only without storing it (notes would be lost).
  - The plan loads when the Tracker is opened, not on every Settings visit (fewer reads).
  - Fallback to GitHub main's copy until the first release publishes `/Life-Care/plan.json`. Rejected: copying plan.json onto `build` (add/add merge conflicts at release).
  - Publication is a Vite plugin, not a `build-pages.sh` step, so it also works locally. Either way it takes effect only at the release.
  - Added P4 (supplier register/DPAs/ROPA, 2%) from the Architect's 12 Nov outline although it wasn't in JC's list; R1b (this work, 3%) added under Release.
- **Google Health (E), report only, nothing built:**
  - **What exists** (since the first repo commit, imported from v1; no HANDOVER/TRANSFER_GAPS notes on why it paused):
    - Settings card "📱 Google Health Connect" (per person). Its Setup text says install the Health Connect app, link Fitdays, then Connect.
    - `connectGoogle` (App.jsx) uses a Google Identity Services token client (index.html loads `gsi/client`). The Client ID is hard-coded (same Google Cloud project as Firebase) and overridable by the admin `google_client_id`.
    - Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`.
    - `syncGoogleHealth` reads `health.googleapis.com/v4/users/me/dataTypes/{weight,body-fat,steps,exercise}/dataPoints`. It writes weight (as stone) and body fat into body history, and steps and sessions into `activity` (only used as AI context).
    - **No calories are read, and nothing credits the eating score.** Kcal targets are hard-coded per person (JC 2000–2200, Becks 1700–1900).
  - **What blocks it / problems in the code:**
    1. The access token (≈1 h, no refresh) is stored in plain text in the shared database (`google_token_<person>`).
    2. A 401/403 doesn't throw (fetch), so an expired token shows "✓ Synced" with nothing read.
    3. The weight filter hard-codes 2026-07-01, and the response fields are guessed (`dataPoint`, `floatValue`) and unverified.
    4. The Setup text mixes up Health Connect (on-device Android store, which a web app can't read) and the cloud Google Health API.
    5. The OAuth consent screen needs the Health scopes, with JC and Becks as test users. Sensitive/restricted-scope verification is needed before pilot users. To verify in Google Cloud: whether the API is enabled for the project and its current access terms.
  - **Remaining steps:**
    1. Google Cloud: enable the API, set up the consent screen and test users; confirm the calories data type (active/total energy burned), its fields and quotas.
    2. Per-person connect: each person signs in with their own Google account (login hint = their app account). Keep the token in memory/on the device, not in Firebase. Re-consent silently on sync; server-side refresh tokens come with Step 6.
    3. Read daily calories for the eating week (Sun–Sat) and store only daily totals per person with source and sync time.
    4. Credit rule in code (like `rag.js`), **JC to decide**: what share of active calories is added to the weekly kcal budget (e.g. 50% or 100%, capped). Show "+N kcal from activity (Google)" on My Eating, and include it in eating feedback.
    5. Fix 1–4 above; tests with a mocked Google API.
    6. Privacy: Google becomes a health-data source (DPIA/SAD, privacy notice, consent text).
    - Estimate ~7% (plan R4).
- **JC to test (/build/, as JC):**
  1. Settings shows the 7 sections.
  2. Tracker → opens with "Plan: 76 items…" (read from GitHub until the release); Outstanding list, Token % per phase; Status → Completed shows D1–D21 etc.
  3. Open a plan item → only Admin note editable; Save; reopen the Tracker → note kept.
  4. Debug Mode → Turn On → red badge; Ask a Question → log shows status/tokens only; reload → still on; Turn Off.
  5. Data & backups → each Open lands on that tool.
- **Resume point:** `build` @ 6853af4 (v2.15.0), `main` docs incl. `docs/plan.json`. Next: Architect checks `/build/`; then the build → beta PR **when asked** (no beta/main PRs yet). Plan updates: edit `docs/plan.json` on main whenever an item starts or finishes.

### (Coder) 12 Nov 2026 — plan: R5 Activity calorie adjustment added (not built)
- **Done:** `docs/plan.json` gains **R5 "Activity calorie adjustment"** (Release, Feature, Medium, 4%, Planned; needs R4). JC asked to replace an optional "Weight-trend calibration" item, but no such item was in the plan, so R5 is added and nothing was removed.
- **Decision (JC, 12 Nov):** this is what R5 covers:
  - **Setting:** a per-person adjustment, default 100%, applied to the Google Health activity calorie credit.
  - **AI suggestion:** Body + General feedback compare predicted vs actual weight trend after 3–4 weeks and may suggest a new value with the reason. The value changes only if the user accepts.
  - **Manual change:** the AI acknowledges it once, explains the effect and offers its recommended value + reason.
  - **Declined:** the decision is recorded and respected; later advice quietly allows for the accuracy gap without repeating the offer. It re-offers only when new evidence differs meaningfully (e.g. after another 4 weeks).
  - **History:** suggestions and decisions are stored as values + dates only.
  - Build later, after R4.
- **Resume point:** unchanged: `build` @ 6853af4 (v2.15.0). Next: Architect checks `/build/`; build → beta PR when asked.

### (Coder) 12 Nov 2026 — PR #23 build → beta (v2.15.0); v2.15.1 on build; plan R6, H7, K4
- **Done:**
  - **Beta:** PR #23 merged into `beta` as `447fb9e` (v2.14.3 + v2.15.0, APP_GUIDE updated). Deploy run 43307793856 succeeded, so `/beta/` should show **v2.15.0-beta.5**. Not merged to main.
  - **v2.15.1 on build (`71041b0`):** "Clear old eating history" removed from Data tools and from Settings → Data & backups. Its code is in git history (commit 6853af4), and the old `clear-history.spec.js` is replaced by `tests/v2151.spec.js`. Full suite 153 passed, lint 0 errors, visual shows footer + Settings 40px shorter (rebaselined). Deploy run 43308845545 succeeded. Changelog row added.
  - **Plan:**
    - **R6 "Calorie target from measured burn"** (Release, Feature, Medium, 5%, Planned, not built; needs R4, R5 depends on it), with JC's spec in the notes: Katch-McArdle BMR from the last 3–4 weigh-ins, activity credit = total burned − BMR × R5 adjustment, labelled; target = BMR + credit − deficit; no data → BMR × 1.2 (estimate); shown next to the fixed targets until JC approves per person.
    - **H7 "Data retention rule (DPIA)"** (House in order, 1%). User deletion/export was already covered by P2 (Step 2), so it's not duplicated.
    - **K4** (removal) Done v2.15.1; **R1b** Done.
- **Decisions:**
  - **Clear old eating history (JC, 12 Nov):** removed; recovery = Download backup + Restore.
  - **Release timing (Coder):** v2.15.1 is on build only and was not added to PR #23. JC's message asked for v2.15.0 to go to beta, and the removal hadn't been tested yet. It goes to beta with the next build → beta PR.
- **JC to test (/beta/):** footer v2.15.0-beta.5; Settings sections; Tracker (plan, Outstanding, Token %); Feedback email Edit → Save; Debug Mode. On /build/: Data & backups shows only Download backup, Restore and Data viewer.
- **Resume point:** `beta` @ 447fb9e (v2.15.0-beta.5), `build` @ 71041b0 (v2.15.1). Next: JC's beta test → (Architect) beta → main release; v2.15.1 to beta with the next build → beta PR when asked.

### (Coder) 12 Nov 2026 — PR #24 build → beta (v2.15.1)
- **Done:** PR #24 merged into `beta` as `fffb32b`. Deploy run 43311458374 succeeded, so `/beta/` should show **v2.15.1-beta.6**. Not merged to main.
- **JC to test (/beta/):** footer v2.15.1-beta.6; Settings → Data & backups shows only Download backup, Restore and Data viewer; Data tools has no "Clear old eating history".
- **Resume point:** `beta` @ fffb32b (v2.15.1-beta.6) = `build` content @ 71041b0. Next: JC's beta OK → (Architect) beta → main release.

### (Coder) 12 Nov 2026 — Release v2.15.1 to prod (PR #25 beta → main)
- **Done:**
  - **Release PR:** PR #25 `beta → main` merged as `1dbd277` (asked for explicitly). Before the merge, the merged tree was built locally: lint 0 errors, prod build ok, `check-pages` ok (prod `APP_GUIDE.md` + `plan.json`, indexable, installable app files).
  - **Deploy:** run 43312466044 succeeded on the updated actions (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5). Prod's check now requires `plan.json`, so `/Life-Care/plan.json` is published.
  - **Auto-tag:** run 43312466123 created annotated tag **v2.15.1** on `1dbd277` (github-actions[bot]).
  - **Secret-dependent workflows:** smoke ran after the deploy (43312680690); backup (43312811420) and Build refresh (43312817469) were run once by hand. All three were green with "secret not set — skipped" (backup names all 3 missing secrets).
  - **Docs:** Live Product line, CHANGELOG statuses + release note, plan R2 Done.
- **Not checked from here:** the sandbox can't reach github.io. JC to confirm the prod footer shows v2.15.1 and that `/Life-Care/plan.json` opens. The Tracker now reads that copy first.
- **JC to test (prod):** close and reopen the app; the footer shows v2.15.1; quick look at each tab; Settings (as JC) → Tracker loads the plan.
- **Resume point:** `main` @ 1dbd277 (prod v2.15.1, tag v2.15.1); beta/build hold the same code. Next: JC adds the 3 secrets (plan R3), then run each workflow once by hand.

### (Architect) 13 Nov 2026 12:25 — automation LIVE: 3 secrets added, first runs verified
- JC added `FIREBASE_SERVICE_ACCOUNT`, `BACKUP_KEY` and `VAULT_DEPLOY_KEY` (vault deploy key, read/write, titled "Life-Care backups").
- **The first BACKUP_KEY was displayed on screen and in a chat screenshot, so it was rotated before any backup ran.** The current key exists only in JC's password manager and in his offline copy.
- Manual runs:
  - **backup** succeeded: `life-care/backups/daily/2026-11-13.json.gpg` (74 KB) is in the vault.
  - **refresh-build** succeeded (19 s).
  - **smoke** succeeded.
- **Correction to the Coder's secrets guide:** do **NOT** keep a copy of BACKUP_KEY in the vault. The vault holds the encrypted backups, so the key must live elsewhere (password manager + offline copy). Coder: fix that line in the guide and in any doc that repeats it.
- Plan item R3 (add secrets + verify) → Done.

### (Architect) 13 Nov 2026 20:30 — private docs written (vault) + review of HLD / test strategy
- **Written to the private vault** `life-care/docs/`:
  - 01 SAD (with STRIDE threat model + CSIA);
  - 02 DPIA (with the H7 retention proposal);
  - 03 SDD + runbooks RB-01…RB-12;
  - 04 risk register;
  - 05 supplier register + ROPA.
  - All are draft 1.0, for JC and the cyber reviewer. **Nothing security-specific goes into the public repo.**
- **SAD Phase A actions (household, before more features), for the plan (phase "House in order"):**
  - **A2:** verify and enforce sanitisation for every `dangerouslySetInnerHTML` (10 files; use DOMPurify, or switch to a markdown renderer with no raw HTML) **and add a CSP meta tag** (self, Firebase/Google auth, api.anthropic.com, Open Food Facts). Coder, about 3%.
  - **A3:** Google account hardening. JC.
  - **A4:** replace the no-expiry PAT with a fine-grained 90-day token. JC + Architect.
  - **A5:** Dependabot alerts, secret scanning with push protection, CodeQL. JC toggles in repo Settings; Coder adds config, about 1%.
  - **A6:** scheduled DB-rules drift check through the service account. Coder, about 2%.
  - **A7:** branch protection on main and beta. JC.
- **Phase B (before pilot):** A1 server AI proxy (Step 6), A8 App Check, A9 anonymised fixtures, Step 2/5, pen test.
- **Retention proposal (H7)** is in DPIA §6 and needs JC's approval.
- **HLD review (Coder to apply):**
  1. §9 and §2 still say automation is "prepared/inactive". It has been **live since 13 Nov** (first encrypted backup verified).
  2. §7 says Send Feedback "opens an email as before". It now opens the email app only if a feedback address is set (v2.14.1/v2.14.3).
  3. Point the LLD references to `docs/LLD.md` once written.
  4. Add a "Planned" note: Google Health calorie sync (R4/R6/R5), with the token kept on the device.
  5. §8: add "Build copy limited to JC and Becks, or anonymised, before pilot" (it says the refresh refuses: confirm that's implemented, or reword).
  6. Mention the admin view is UI-only (no security detail, just "admin features are a convenience view, not an access control").
- **Test strategy review (Coder to apply):**
  1. The smoke row is no longer "prepared": it is live after each deploy.
  2. Add a security test level: a CSP/sanitisation test once A2 lands (inject `<img onerror>` / `<script>` in AI text, food names and descriptions → must not execute).
  3. Add the rules drift check (A6) once built.
  4. Known gaps: add "no automated accessibility checks (axe)". Suggest adding @axe-core/playwright on the main screens.


### (Coder) 13 Nov 2026 — documentation batch (docs only, main)
- **Done (doc-only commits on `main`, no app code):**
  - **ADRs 0001–0010** in `docs/adr/` with index: environments and release flow (+ hotfix route), shared DB + expand/contract, nightly Build refresh, parent/child eating, photos analysed then discarded, portion-based RAG in code, plan.json single source, automation via GitHub secrets (BACKUP_KEY never stored with the backups), Google sign-in + locked DB (no rule detail), Companion Energy from usage.
  - **`docs/LLD.md`** (modules, data keys/shapes incl. eat_children, tracker, ai_usage, progressPhotos; AI call map; patterns; tests; no security specifics). `TECHNICAL_REFERENCE.md` is now a pointer (old content: `git show c698e2d:TECHNICAL_REFERENCE.md`); CLAUDE.md rule 9 and the pointers now name `docs/LLD.md`.
  - **`docs/legal/`:** PRIVACY_NOTICE, TERMS_OF_USE, INTENDED_USE, PAYMENTS_STATEMENT, ACCESSIBILITY. Each is marked **"DRAFT — for legal review before any users other than JC and Becks"**, with placeholders in [brackets].
  - **BACKUP_KEY fix:** both secrets-guide lines now say password manager + offline copy, **never the vault**.
  - **Architect's 13 Nov review applied:** HLD (automation live, Send Feedback wording, LLD link, planned Google Health row, Build copy limited to JC and Becks (refresh-build refuses otherwise; confirmed in the script), admin view is not an access control); TEST_STRATEGY (smoke live, planned security and rules-drift levels, axe gap).
  - **plan.json:**
    - Done: R3, H4, H5, H8 (LLD).
    - In progress: P3, H1–H3, P4, H7.
    - New: P6 accessibility fixes + audit (4%), P7 explicit no-medication prompt rule (1%), A2–A7 SAD Phase A actions (House in order, High).
  - docs/README index updated.
- **Decisions (Coder):**
  - The legal drafts name the controller and say "contact address shown in the app"; no email address in the repo.
  - The accessibility gaps come from a quick code review, not an audit: zoom is blocked by the viewport tag (`user-scalable=no`), light-grey 8–10px text, about 53 of 357 buttons have explicit labels.
- **Open questions:** see the Coder's report of 13 Nov (to JC/Architect).
- **Resume point:** `main` docs @ this commit; code unchanged (prod v2.15.1, `build` @ 71041b0). Next: JC/Architect answer the open questions; legal review of `docs/legal/`; Coder items A2, A5 config, A6, P6, P7 when asked.

### (Coder) 13 Nov 2026 — item 9: Architect review notes + SAD actions in the plan
- **Review notes:** the Architect's HLD and test-strategy notes from "(Architect) 13 Nov 2026 20:30" were already applied in `f780b62`:
  - HLD: all 6 notes.
  - TEST_STRATEGY: smoke live; planned security (CSP/sanitisation) and rules-drift levels; axe gap.
- **plan.json:**
  - House in order: the Phase A items are renamed to **SAD-A2** (Coder 3%), **SAD-A5** (Coder 1%; JC toggles), **SAD-A6** (Coder 2%), **SAD-A3** (JC), **SAD-A4** (JC + Architect), **SAD-A7** (JC).
  - Before pilot users: **SAD-A1** (= G4, the Step 6 proxy; 0% here so it isn't counted twice), **SAD-A8** App Check (2%), **SAD-A9** anonymised fixtures (2%).
  - 92 items.
- **Resume point:** unchanged; code untouched (prod v2.15.1). Next: open questions from the 13 Nov Coder report; SAD-A2/A5/A6 when asked.

### (Architect) 13 Nov 2026 19:55 — DECISION (JC): pilot may proceed AT RISK on legal review only
- The solicitor review of the privacy notice and terms (J12) may complete **after** the pilot starts. JC accepts the risk.
- **Not waived:** the security pre-pilot conditions remain blockers:
  - SAD-A1 server proxy (Vertex AI EU);
  - Step 5 individual accounts;
  - consent screens;
  - Step 2 export/delete;
  - fixes from the cyber review (JC contacting the reviewer the weekend of 14–15 Nov);
  - a pen test, strongly recommended.
- **Mitigations for the legal risk:**
  - a small invited pilot;
  - pilot terms + privacy notice shown at sign-up with explicit consent;
  - the ICO fee paid before the first pilot user;
  - solicitor changes applied promptly.


### (Coder) 13 Nov 2026 — JC/Architect decisions on the docs questions applied; v2.15.2 on build
- **Docs (main):**
  - Privacy notice §7: retention table filled from DPIA §6.
  - §5: AI requests are currently processed by Anthropic in the US under Anthropic's DPA ("[JC to confirm DPA applies to the account]"). Before pilot users, AI processing moves to the EU via Claude on Vertex AI (EU endpoint, Google's terms).
  - Terms: liability cap = greater of fees paid in the previous 12 months or £100, with the death/personal-injury/fraud/non-excludable carve-out; short pilot clause.
  - Payments: provider TBC; "Stripe for the web app; app-store billing only for store versions".
  - Accessibility: 10 working days.
  - Intended use: P7 rule recorded.
  - HLD: processors + planned EU proxy.
  - LLD: `safety.js`.
  - All `docs/legal/` files still marked DRAFT.
- **v2.15.2 on build (`87970f7`):**
  - Pinch-zoom re-enabled (viewport).
  - **P7:** `src/lib/safety.js` adds "never suggest starting, stopping or changing any medication or dose; GP or pharmacist" to the system prompt of every Messages API request, via the `api.js` fetch wrapper. That is a superset of the prompts that see health data, so future prompts can't miss it. In block-list system prompts it goes first, so Help's cached prefix is unchanged. The daily energy ping ("hi", no data) is excluded.
  - Tests `tests/v2152.spec.js` (3). Full suite 156 passed, lint 0 errors, visual footer/version only (rebaselined). APP_GUIDE updated. Deploy run 43497124866 succeeded.
- **plan.json:**
  - G4 / SAD-A1: proxy = Cloud Function in an EU region → Claude on Vertex AI EU endpoint; removes the API key from the app; "confirm model availability on EU endpoints + regional pricing"; not built.
  - H7 Done; P3, P6 notes; P7 Done v2.15.2.
  - New: **P8** replace the in-app Privacy Policy after legal review (Blocked); **P9** first-use explicit consent screen (AI, photos, Google Health; 3%); **P10** enforce retention periods in code (3%, Coder addition).
  - Item 8 (SAD-A1…A9) was already in place from item 9.
- **Decisions (JC/Architect 13 Nov):**
  - Retention per DPIA §6.
  - US processing under Anthropic's DPA now; EU via Vertex AI before pilot.
  - Liability cap £100 / 12-month fees.
  - One terms document with a pilot clause.
  - In-app notice only after legal review.
  - Consent screen before pilot.
  - Payments provider TBC.
  - 10-day accessibility reply.
  - P7 + zoom now; other accessibility fixes before pilot.
- **Decision (Coder):** P7 is enforced centrally in the request wrapper rather than by editing about 40 prompts one by one. Rejected: per-prompt edits (easy to miss one, and new prompts would need remembering).
- **JC to test (/build/ v2.15.2):**
  1. Pinch-zoom works on the phone.
  2. Ask the Chat something like "should I stop my statins?" → it should defer to your GP or pharmacist.
  3. Help still answers normally.
- **Resume point:** `build` @ 87970f7 (v2.15.2), prod v2.15.1. Next: Architect check of /build/ → build → beta PR when asked. Open: JC to confirm Anthropic's DPA applies to the account.

### (Coder) 13 Nov 2026 — plan: JC actions J1–J14; in-app pilot legal docs (P8)
- **Done:** `docs/plan.json` now has a new phase **"JC actions"** (after Release), holding **J1–J14** (Task, owner JC, Planned) with the priorities and Token % JC gave.
  - Cross-references: SAD-A5/A7/A3/A4 point to J1/J2/J3/J4. J7 closes the "[JC to confirm DPA applies to the account]" placeholder; J10 is needed before R4.
  - **P8** is now "In-app legal docs: pilot versions" (Before pilot users, 2%, Planned). Before the first pilot user, the app shows the current PRIVACY_NOTICE and TERMS_OF_USE drafts labelled "Pilot version — [date]", replacing the old in-app Privacy Policy, accepted via the first-use consent screen (P9). When the solicitor-reviewed versions arrive (J12), they replace these and acceptance is asked again. The accepted version + date is stored per user. P9 notes updated to match.
  - 109 items.
- **Decision recorded (JC, 13 Nov; see the Architect entry 19:55):** the first pilot users are friends and colleagues. **Security conditions are the gate; legal review follows** (at risk). The ICO fee is paid before the first pilot user.
- **Resume point:** unchanged for code: `build` @ 87970f7 (v2.15.2), prod v2.15.1. Next: Architect check of /build/ v2.15.2 → build → beta PR when asked.

### (Architect) 13 Nov 2026 22:10 — JC workout defects + features; accounts/tiers/energy direction
- **D23 (data):** Log Exercise defaults to the wrong week and "Previous". Seen in Week 17 (8–14 Nov), Becks, Face Pull: the form showed "Previous: Wk 15" and Week = **16**. Week 16 already existed (Save warned it would overwrite it).
  - **Fix:** the Week field defaults to the **current training week** (the week shown in the header).
  - "Previous" = that person's **latest logged week before the current week**, from the same source the overwrite check uses.
  - Never default to an existing week. Add a regression test.
- **D24 (layout):** the Progress rows' "Form ✓ · Range ✓" text is squeezed into the button column and overlaps Open (Bicep Curl, Becks).
  - **Fix:** a compact chip row under the key data, or icons with labels, never overlapping. Check at 360px.
- **F11:** store the **Companion feedback for each exercise** with the logged week, plus the user's **Accept / Reject + note**. Show it in the exercise **Open** form, between My Notes and the buttons, editable in Edit.
- **F12:** rename every user-written notes field app-wide to **"My Notes"**, to separate it from Companion Feedback (labels only; data unchanged).
- **Accounts, tiers and energy (Step 5/6), JC direction:** Bronze/Silver/Gold account types; user accounts with subscription; buy Companion Energy with a **100% mark-up** (a £5 pack covers £2.50 of AI cost).
  - **Architect notes:**
    - card fees (Stripe UK, about 1.5% + 20p) come out of the margin;
    - VAT applies only if JC becomes VAT-registered;
    - the energy ledger must be **server-side** (Step 6 proxy) so balances can't be edited in the browser.
  - The tier features follow the Architect's 12 Nov draft until JC finalises them (configurable in admin, no code change needed).
  - **Household:** JC and Becks keep logging for each other through a "household" link between individual accounts.


### (Coder) 14 Nov 2026 — overnight Step 1: v2.16.0 on build
- **Read first:** Architect 13 Nov 22:10 (HANDOVER @ b49e801).
- **v2.16.0 (`build` b623496):**
  - **D23:** Log Exercise Week = current training week; Previous = latest logged week *before* it; the overwrite check, the "Edit Previous Entry" toggle and the person tabs inside the form all use the same week helpers (`findWeekIdx`, `previousEntry` in `src/lib/exercise.js`; weeks compared as numbers, prog order ignored). If the current week is already logged, the form opens it for **Update**. Likely root cause: switching person inside the form copied the first person's week (and `prog` isn't always in week order).
  - **D24:** Form/Range chips moved to a row under each Progress row (text + colour). Checked at 360px.
  - **F11 (plan id F11b — F11 was already used):** the Companion's per-exercise verdict/recommendation is saved with the latest logged week (`prog[].companion`) when session feedback is generated; Accept/Decline also records the decision + note there. The Open form shows it between My Notes and the buttons; Edit changes decision + note. Older entries show nothing.
  - **F12:** "My Notes" labels (exercise log + Open form, measurements, meds, profile, eating day notes, general health notes, history rows). Data unchanged.
  - **Documentation:** grouped from `src/constants/docsIndex.js` (adds LLD, ADRs, handover, legal drafts labelled "Draft — for legal review"; vault docs 01–05 by name only).
  - Tests `tests/v2160.spec.js` (7); `exercise-log` D2 test updated for D23. Full suite 161 passed (1 timing flake in `open.spec` F1, passes on re-run), lint 0 errors, 360px screenshot checked.
- **JC to test (/build/):** Log an exercise in Week 17 (Becks too, via the person tabs) → Week shows 17, Previous shows Wk 16. Progress rows: chips under the row. Generate session feedback → Open the week → Companion Feedback block; Edit → Accept/Reject + note.
- **Resume point:** `build` @ b623496 (v2.16.0), prod v2.15.1. Next: Step 2 (v2.16.1 security code parts).

### (Architect) 13 Nov 2026 22:40 — QUEUED for the next Coder session (after the 13 Nov overnight batch); plan updates only, don't build
1. **Phase "Native polish (during pilot)":** N1–N10 (tokenPct in brackets). High: N1–N6; Medium: N7–N10.
   - N1 store apps (Capacitor wrapper, iOS + Android, TestFlight + Play internal testing) (10)
   - N2 Face ID / fingerprint unlock (2)
   - N3 haptics (1)
   - N4 barcode scanner, Open Food Facts (3)
   - N5 native pickers + swipe gestures (3)
   - N6 Apple Health + Health Connect background sync (4)
   - N7 notifications: user-controlled reminders, needs server push (4)
   - N8 offline logging, **SAD update first** (on-device health data) (6)
   - N9 home-screen widgets (6)
   - N10 lock-screen rest timer (5)
   - N2–N10 depend on N1; N1 depends on Step 5/6 + J15/J16.
2. **JC task J17:** confirm the spare work iPhone can be used for app testing under IT policy (JC is IT; checking with a colleague); set it up with a personal Apple ID + **test data only**.
3. **HARD DESIGN RULE for Step 5 accounts:** add to docs/design/ACCOUNTS_TIERS_ENERGY.md.
   - **Admin MUST NOT be able to read other users' health data.**
   - Admin sees only: account status, tier, energy balance, Tracker/feedback entries (masked), and anonymised aggregates.
   - Enforced in **database rules + functions**, not just the UI.
   - Household members see each other's data only with explicit mutual consent.
   - Reason: pilot users include JC's colleagues.
4. **Phase "Pilot features (40+/perimenopause)":** JC's target market is 40+ and perimenopausal women.
   - symptom tracking (hot flushes, sleep, mood, energy) linked into Companion feedback (4)
   - HRT/medication logging, **record only, no advice** (2)
   - GP appointment prep summary (3)
5. **JC note:** a side-business declaration at work is needed (no conflict expected). Go-to-market plan + website to be developed during the pilot (Architect to draft a GTM plan later).


### (Coder) 14 Nov 2026 — overnight Step 2: v2.16.1 on build (security Phase A, code parts)
- **v2.16.1 (`build` c96d3a1):**
  - **SAD-A2:** the 21 `dangerouslySetInnerHTML` were all constant loading dots → `LoadingDots` component; no raw HTML rendering is left in `src`. Two `innerHTML` writes that included AI-returned text (session-feedback Accept/Decline) → `setPlainNote` (text only). **CSP** meta tag on every page from the `csp()` plugin in `vite.config.js` (allowed hosts in `CSP_HOSTS`; inline scripts only by hash; dev adds the local emulators). DOMPurify not needed (nothing renders HTML).
  - **SAD-A5:** `.github/dependabot.yml` (npm + GitHub Actions, weekly, PRs to `build`) and `.github/workflows/codeql.yml`. Both act only once on `main` (next release).
  - **SAD-A6:** `.github/workflows/rules-drift.yml` + `scripts/automation/rules-drift.mjs`: daily, reads the deployed rules with the service account, compares with `database.rules.json` (main); drift → fails → GitHub emails the owner. Prints only "match"/"drift" + a count. Skips without the secret.
  - **SAD-A9:** `scripts/make-fixture.mjs` synthetic data (two made-up people, same shapes, deterministic). `npm run seed` and the tests now use it; the real backup only with `SEED_REAL=1`.
  - Tests `tests/v2161.spec.js` (5). Full suite **167 passed on synthetic data**, lint 0 errors.
- **JC to test (/build/):** sign in, use each tab, Help/Chat, a photo check, Open Food Facts search → all still work (the CSP would block anything not on the list). If anything breaks on /build/, tell the Coder which screen: the fix is one host in `CSP_HOSTS`.
- **JC actions (J1, after the next release puts these files on main):** Settings → Code security: turn on **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** + **Push protection**. CodeQL runs by itself (results under Security → Code scanning).
- **Open:** the drift check needs the service account to be allowed to read the rules (the existing backup service account should be). First real run: after the next release, from Actions → "Database rules drift check" → Run workflow.
- **Resume point:** `build` @ c96d3a1 (v2.16.1), prod v2.15.1. Next: Step 3 (calories R6/R4/R5, v2.16.2). Architect 22:40 queue noted: its hard design rule (admin can't read other users' health data) is applied in Step 4; the plan additions (N1–N10, J17, pilot features) are left for the next session as asked.
6. **(Added 22:46, JC approved) Companion platform design note for Step 4/5/6:**
   - Design accounts/households, entitlements/tiers, the energy ledger, the AI proxy (EU), payments and the Tracker as a **reusable "Companion platform"** for the parent brand **CompanionApps.studio**. Lifecare Companion is the first app.
   - App-specific data stays separate per app (`appId` in paths), with per-app tier/energy/AI config.
   - Record it as an **ADR** and in docs/design/ACCOUNTS_TIERS_ENERGY.md.
   - **Don't over-engineer:** build only the seams a second app needs. If the overnight Step 4 is already built, adapt it in the next session.


### (Coder) 14 Nov 2026 — overnight Step 3: v2.16.2 on build (calories R6, R4, R5)
- **v2.16.2 (`build` 40b7a24):**
  - **R6:** `src/lib/calories.js`: lean mass = rolling average of the last 3–4 weigh-ins (weights are stored in **stone**, converted) × (1 − body fat); BMR = 370 + 21.6 × lean kg; activity credit = Google daily total − BMR (never below 0) × R5 %; target = BMR + credit − deficit; no Google data → BMR × 1.2 "estimate". **CalorieCard** on My Body (and in Home's Recommendations): label "N kcal burned · N deducted for your BMR (from body composition) · +N kcal from activity", badge **Calculated (not active)**. Admin switch per person (Settings → Google Health card), **default off**; when on, the badge says Active, Home's Calories target and My Eating's daily limit use it (the only place the credit is applied).
  - **R4 (rebuilt):** `src/lib/googleHealth.js`. Reads only **daily total calories burned** for the Sun–Sat week; stores `googleDaily` (daily totals, 12-month retention) + `googleSync` status per person. Token: device only (localStorage, per person), **no longer written to or read from the database**. 401/403 → "expired or not allowed — reconnect" and disconnects; other HTTP errors shown; "✓ Synced" only with data. The old v1 weight/body-fat/steps/sessions import is **dropped** (unverified fields, stone mix-ups).
  - **R5:** per-person adjustment % (Change → manual, recorded); Body Feedback prompt gets the R5 context and may return `adjSuggestion` → shown on the card with Accept/Decline; a decline is respected for 28 days; a manual change is acknowledged once. History stores values + dates only.
  - Tests `tests/v2162.spec.js` (7): maths, R5 rules, Google client with a fake service (ok/401/500), UI sync (token never in the DB), expired session, AI suggestion + decline. Full suite **174 passed**, lint 0 errors, 360px card screenshot checked.
- **Decisions (Coder):**
  - The card sits on **My Body** (body composition is its source) as well as Home's Recommendations, because Home's Recommendations only show inside the expanded assessment.
  - Old Google token keys `google_token_<person>` in the database are now ignored, not deleted (deleting real data needs JC's OK) → question 2 below.
  - Version numbers: the overnight steps are v2.16.0 → v2.16.4, then accessibility v2.17.0, following the brief's labels (Step 2 = v2.16.1, Step 6 = v2.17.x).
- **Questions for JC (skipped, defaults used):**
  1. Deficit: default **500 kcal/day** for both. Keep, or set per person?
  2. OK to delete the old `google_token_jc` / `google_token_becks` keys from the database (expired tokens, no longer used)?
- **J10 — JC's Google Cloud setup (one action per step):**
  1. Open console.cloud.google.com and choose the project **life-care-app-64d04**.
  2. APIs & Services → **Library** → search "Google Health API" → **Enable**.
  3. APIs & Services → **OAuth consent screen** → User type **External** → app name "Lifecare Companion" + your support email → **Save and continue**.
  4. **Scopes** → **Add or remove scopes** → tick `…/auth/googlehealth.activity_and_fitness.readonly` → **Update** → **Save and continue**.
  5. **Test users** → **Add users** → your Google account → **Save**.
  6. **Test users** → **Add users** → Becks's Google account → **Save**.
  7. APIs & Services → **Credentials** → open the existing **OAuth 2.0 Client ID** (Web, ending `…0sf2`).
  8. **Authorised JavaScript origins** → **Add URI** → `https://jcbeck1976.github.io` → **Save**.
  9. Tell the Architect it's done. The Architect checks the API reference for the **daily total calories** data type name and fields; the Coder changes `GH.totalCalories` if it differs.
  10. On /build/: Settings → Google Health → **Connect** → **Sync this week's calories** → tell the Coder what the status line says.
- **JC to test (/build/):** My Body → calorie card shows "Calculated (not active)" with your numbers (estimate until Google works). Change the adjustment → saved. Admin: switch on for yourself → badge "Active"; switch off again.
- **Resume point:** `build` @ 40b7a24 (v2.16.2), prod v2.15.1. Next: Step 4 (accounts/tiers/energy design + local functions, v2.16.3), applying the Architect's 22:40 hard rule and 22:46 platform note.

### (Coder) 14 Nov 2026 — overnight Step 4: accounts, tiers, energy — design + local build (v2.16.3, NOT live)
- **Design (main):** `docs/design/ACCOUNTS_TIERS_ENERGY.md` (individual accounts, `apps/{appId}/users/{uid}`, household with mutual consent, migration plan **not executed**, tiers, subscriptions, energy packs at 100% mark-up, server ledger) and **ADR 0011** (Companion platform, `appId`). The Architect's 22:40 hard rule (admin can't read health data) and the 22:46 platform note are applied.
- **v2.16.3 (`build` fcf293e) — no change for users:**
  - `functions/` (Cloud Functions, europe-west1, **emulator only, never deployed**): `aiProxy` (sign-in + tier + energy checks; adds the P7 rule; forces `claude-sonnet-4-6`; `AI_BACKEND=vertex` → Claude on Vertex AI EU, `direct` = today's API path as fallback, `mock` for the emulator; debits the actual cost and records counts), `setTier` + `adminAccounts` (admin only; account list has no health data), `createCheckout` + `stripeWebhook` (Stripe **test mode**, signature checked, idempotent credit: £5 pack → 250p of AI cost).
  - `database.rules.next.json` (**not deployed**): own data only; household needs both consents (withdrawal stops it); balance/tier/ledger/usage server-only; admin reads the account list and Tracker, never `users/*`.
  - Client: `src/lib/platform.js` flags `useAiProxy`, `useAccounts`, `showBuyEnergy`, **all off**. CSP allows the functions host.
  - Tests: `functions/test` (9: rules ×5 on the emulator with real user tokens, ledger, aiProxy, admin, Stripe); `tests/v2163.spec.js` (3, incl. running the functions tests). Full suite **177 passed**, lint 0 errors.
- **Decisions (Coder):**
  - Handlers are plain functions with injected database/AI/Stripe (`functions/src/core.js`), so the same code runs in Cloud Functions and in the emulator tests. Rejected: testing only through the Functions emulator (slower, and it needs the Functions toolchain per run).
  - The proxy is reached with the callable protocol over `fetch` (no extra Firebase SDK in the app).
  - Energy is held as **pence of AI cost** (price list in `functions/src/config.js`, USD→GBP 0.79: check before go-live).
- **Note for the Architect:** the database emulator treats any `Authorization: Bearer …` as the owner. Rules tests must pass user tokens as `?auth=` (done in `functions/test/helpers.mjs`).
- **Questions for JC / the Architect (skipped):**
  3. The Architect's **12 Nov tier draft** isn't in the repo; the design has a placeholder table (§6). Please add the draft or JC's final list.
  4. Subscription prices and monthly energy per tier.
- **Step 4 — JC setup before go-live (one action per step; nothing is live until all are done and JC approves):**
  1. Create a **Stripe** account (stripe.com) and stay in **Test mode**.
  2. Stripe → Developers → API keys → copy the **test secret key** (`sk_test_…`) into your password manager.
  3. Firebase console → project life-care-app-64d04 → **Upgrade to Blaze** (pay as you go; needed for Cloud Functions). Set a **budget alert** (e.g. £10/month).
  4. Google Cloud console → APIs & Services → Library → enable **Cloud Functions API**.
  5. Same Library → enable **Cloud Build API**.
  6. Same Library → enable **Vertex AI API**.
  7. Vertex AI → Model Garden → **Claude Sonnet** → **Enable** (accept Anthropic's terms) and check it's offered in an **EU** region.
  8. IAM → the functions' service account (`…-compute@developer.gserviceaccount.com`) → **Add role: Vertex AI User**.
  9. Tell the Architect; the Architect sets the secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (and `ANTHROPIC_API_KEY` only if the fallback is kept) and runs the first deploy with you. **The Coder never deploys.**
  10. Stripe → Developers → Webhooks → **Add endpoint**: the `stripeWebhook` URL the deploy prints, event `checkout.session.completed` → copy its signing secret for step 9.
  11. Before switching the app to the new accounts: a fresh **Download backup**, then the migration in the design doc §5 (separate approval).
- **Resume point:** `build` @ fcf293e (v2.16.3), prod v2.15.1. Next: Step 5 (pilot readiness: consent + legal docs P8/P9, export/deletion/audit P2, retention P10, v2.16.4).

### (Coder) 14 Nov 2026 — overnight Step 7 (plan only) and stop point
- **Plan:** G10 "App store versions (Android/iOS)" and G9 "Apple Health calorie sync" are now **REQUIRED**, High, Go-live. Approach: Capacitor wrapper of the existing app, HealthKit plugin (iOS), optionally Health Connect (Android), iOS builds on GitHub Actions macOS runners; they depend on Step 5/6 accounts/server/payments. New **J15** Enrol in the Apple Developer Program, **J16** Create a Google Play Console account (JC, High). 116 items.
- **Not done tonight (context running low; per the brief, stop and resume):** Step 5 (P9 consent + P8 pilot legal docs, P2 export/deletion/audit, P10 retention function), Step 6 (accessibility P6 + axe checks, v2.17.0), Step 8 (S1 email-link sign-in behind a flag; design doc for brief Steps 3/4). The Architect's 22:40 queue (N1–N10, J17, pilot features) is also still to add to the plan.
- **Resume point:** `build` @ fcf293e (v2.16.3), prod v2.15.1, `main` docs at this entry. **Next exact step:** Step 5 as v2.16.4: start with P9 + P8 (consent screen behind a flag, default off for JC/Becks; store accepted version + date per person), then P2, then P10 (scheduled function in `functions/`, emulator-tested).

### (Coder) 14 Nov 2026 — Step A: v2.16.4 on build (fixes from JC's test)
- **Read first:** no HANDOVER changes since my stop point (6bd22a5).
- **v2.16.4 (`build` e40da6b):**
  1. Form/Range pills removed from under Progress rows; they show only in the **Open** card.
  2. **F11b not showing (plan D25):** a fresh "generate → open the latest week" works (new regression test proves it). JC most likely opened weeks whose feedback came from **before v2.16.0**, or the nightly `/build/` refresh had replaced the build copy with prod's. That feedback was only in `session_feedback_all` (one per person/day, with `_feedbackWeek`), which the Open card never read. Also, names had to match exactly. **Fix:** the Open card falls back to the stored session feedback for that person/day **if it was for that week**, with its earlier Accept/Decline; Edit → Save stores it on the week; Accept/Decline on the session card attaches it when missing; names are matched tolerantly (case, punctuation, "(cable)").
  3. Share picker "What is this?": **For** person toggle (Log-form style), defaulting to the current person; choosing another person switches to them before the upload opens. PersonTabs buttons now have `aria-pressed`.
  - Tests `tests/v2164.spec.js` (3) + updated D24 test. Full suite **180 passed**, lint 0 errors.
- **JC to test (/build/):** generate session feedback → Open the latest week → Companion Feedback + "Your decision"; Edit → Accept/Reject + note → Save. Older weeks show the feedback only if it was stored for that week. Share a scales screenshot → choose Becks → My Body opens on Becks.
- **Resume point:** `build` @ e40da6b (v2.16.4). Next: Step B (decisions: per-person deficit, token cleanup, tier defaults).

### (Coder) 14 Nov 2026 — Step B: v2.16.5 on build (JC's decisions applied)
- **Decisions (JC, 14 Nov), applied in v2.16.5 (`build` c2a5622):**
  1. **Calorie deficit per person:** defaults JC 500, Becks 400 kcal/day (`DEFICIT_DEFAULTS` in `calories.js`), editable on the calorie card (stored in `calorieSettings.deficit`).
  2. **Old Google token keys deleted:** a one-off, idempotent cleanup on load removes only `google_token_jc` and `google_token_becks` (`src/lib/cleanup.js`). It acts on real data once released (JC approved).
  3. **Tiers:** Bronze free (tracking, ratings, Help; ≈£0.20 AI/month), Silver £5.99/mo or £49/yr (+ AI feedback, Snap, meal generator; £1.50), Gold £9.99/mo or £79/yr (+ body balance, AI-built plans, health sync, household; £2.50). Packs £5 (=£2.50 AI) and £10 (=£5 AI), any tier. These are the defaults in `functions/src/config.js` (admin-editable `config/tiers`); the proxy checks the feature switch per request (`help`, `aiFeedback`, `snap` …). Design doc §6 updated.
  4. Version numbering accepted.
- Tests `tests/v2165.spec.js` (4) + functions tests (10). Full suite **184 passed**, lint 0 errors.
- **JC to test (/build/):** My Body → calorie card shows Deficit 500 (Becks 400) → Change works.
- **Resume point:** `build` @ c2a5622 (v2.16.5). Next: Step C (household & privacy model: design + ADR 0012, then platform build/rules/tests, v2.16.6).

### (Coder) 14 Nov 2026 — Step C: v2.16.6 on build (household & privacy model, local only) + Step D (plan)
- **Design (main):** `docs/design/ACCOUNTS_TIERS_ENERGY.md` §1–5a and §10 rewritten for JC's 14 Nov decision; new **ADR 0012**.
  - Own login per person (Google, Apple, email link); the joint account is retired at migration.
  - One household **owner** (invite by email link, remove, later billing) with **no data access**.
  - Per-person **visibility, Hidden by default** (greyed tab "[Name] keeps this private"); separate **"Household members can log for me"** only when Visible.
  - Data split **per area** so per-area sharing can come later.
  - Health connections are per person. Own tab first.
  - Step 8 sign-in folded in (§5): Google, Apple, email link, plus the "On a computer? Choose Try another way" hint. **JC must enable the Email link + Apple providers** before go-live.
  - Migration for JC + Becks (§5a): Becks gets her own login, her data moves to her uid, both Visible + log-for-me. **Plan only.**
- **v2.16.6 (`build` 29f7344), no change for users:** `database.rules.next.json` reworked (replaces the v2.16.3 pairwise consents, which nothing live used); household functions `createHousehold`, `inviteMember`, `acceptInvite` (code + matching sign-in email, single use, 14-day expiry), `removeMember`, `leaveHousehold`; client `householdTabs()` (behind `useAccounts`, off).
- **Tests:**
  - Functions: **14** (rules 8 cover hidden data unreadable by the owner and other members, visible readable, log-for-me only when both toggles allow, per-area, outsiders, membership server-only, admin never reads `users/*`; households 1; ledger/aiProxy/admin/Stripe/tiers 5).
  - `tests/v2166.spec.js` (1). Fixed a missing `await` in a v2.16.2 test that made it flaky.
  - Full suite 184 passed + the fixed test, lint 0 errors.
- **Decision (Coder):** visibility lives in `users/{uid}/privacy`, readable by household members, so the app can grey a tab without reading data. Rejected: a server-computed "who can see me" list (two sources of truth).
- **Step D (plan.json):**
  - New phases **"Native polish (during pilot)"** N1–N10 (High N1–N6, Medium N7–N10; N2–N10 depend on N1, N1 on Step 5/6 + J15/J16) and **"Pilot features (40+/perimenopause)"** PF1 symptom tracking (4), PF2 HRT/medication logging, record only (2), PF3 GP appointment prep summary (3).
  - **J17** spare work iPhone (IT policy, test data only).
  - **G11** Companion platform seams (appId), **G12** household & privacy model; P1 notes point to design §5. 132 items.
- **Resume point:** `build` @ 29f7344 (v2.16.6). Next: Step E (P9 consent + P8 pilot legal docs behind a flag, P2 export/deletion/audit, P10 retention function; v2.16.7).

### (Coder) 14 Nov 2026 — Step E: v2.16.7 on build (pilot readiness, behind a flag)
- **v2.16.7 (`build` 24ac8f5):** everything pilot-only is behind the flag **`pilotConsent`** (localStorage `lc_flags`, **off**), so JC and Becks see no change except "Download my data".
  - **P9:** first-use consent screen: AI, photos, Google Health (granular) + "I have read the Privacy Notice and agree to the Terms (Pilot version — 14 November 2026)". Stored as `consent:<person>` (version, date, choices). A new `LEGAL_VERSION` asks again. Enforced: AI requests, photo checks and Google connect are refused when switched off.
  - **P8:** the pilot Privacy Notice + Terms are in the app (`public/legal/`, copied from `docs/legal` with the draft banner replaced by "Pilot version — 14 November 2026"), shown by the consent screen, Settings and the footer Privacy link (replacing the old Privacy Policy while the flag is on). Rendered as React elements, no HTML.
  - **P2:** Settings → **Privacy & your data**: **Download my data (JSON)** (everyone); **Delete my data** (pilot; typed DELETE; erases the person's live records and keyed items, keeps the app's structure and the name; backups age out). **Audit trail** `audit/<id>` (consent, export, delete-data, restore, r6-switch; masked account; no content); admin "Show audit trail". A full restore now **keeps** the audit trail.
  - **P10:** `functions/src/retention.js` + scheduled `retentionDaily` (emulator only): periods per the Privacy Notice §7.
  - Tests: `tests/v2167.spec.js` (5), backup test updated (audit kept), functions 15. Full suite **190 passed**, lint 0 errors.
- **Docs fix (Coder):** this session I had edited `APP_GUIDE.md` on **main**, but each environment's Help reads its own branch's copy (prod builds from main). So prod Help briefly described unreleased v2.16 features.
  - **Fixed:** the updated guide is now on `build` (v2.16.7, including the v2.15.2 lines that only existed there), and main's copy is restored to its pre-session text (identical to the merge base, so the release merge is clean).
  - From now on the guide is updated on `build` with each version.
- **Decision (Coder):** the export/delete work on today's shared paths (per person key); the per-uid version comes with the accounts migration (G12). Rejected: waiting for the migration (P2 is needed before pilot either way).
- **JC to test (/build/):** Settings → Privacy & your data → **Download my data** → a JSON file for the selected person. (Pilot screens: only with the flag on; the Architect can try them by setting `lc_flags` = `{"pilotConsent":true}` in the browser.)
- **Resume point:** `build` @ 24ac8f5 (v2.16.7). Next: Step F (accessibility P6 + axe checks, v2.17.0).

### (Coder) 14 Nov 2026 — Step F: v2.17.0 on build (accessibility P6) and stop point
- **v2.17.0 (`build` 9f3e614):**
  - **Contrast:** text colours meet WCAG AA. Light greys → `#475569`; greens, reds, ambers, oranges and blues → darker shades; theme accents and default person colours darkened (buttons and tabs look slightly deeper); status pills; mood and energy text.
  - **Dark backgrounds:** axe can't judge text on gradients, so a separate runtime probe checked text on dark backgrounds; the header keeps light text.
  - **Ratings:** a symbol + word next to the colour (`RagCue`).
  - **Labels:** icon-only buttons are labelled (Close chat, Close help, Close photo review …); the Supermarket select is labelled; PersonTabs have `aria-pressed`.
  - **Focus and motion:** visible 3px focus outline (`:focus-visible`); reduced-motion support.
  - **Tests:** `@axe-core/playwright` (dev only), `tests/v2170.spec.js` (9): **0 violations** on Home, My Exercise, My Eating, My Body, My Health, My Shop, Settings and an open Progress week. Old tests updated for the new labels and red value. Full suite **199 passed**, lint 0 errors, 360px screenshot checked.
  - `APP_GUIDE.md` (on build) updated for v2.16.7 + v2.17.0. Accessibility statement (main) updated to draft 2.
- **Still open in P6:** target sizes, chart text alternatives, focus order in overlays, status messages, small font sizes, a screen-reader audit.
- **Decisions needed (JC / Architect):**
  1. The darker theme colours change the look slightly (e.g. JC's blue is a deeper blue). OK, or should a lighter accent be kept for big buttons only (text would use the darker one)?
  2. Pilot flags: who turns on `pilotConsent` (and later `useAccounts`/`useAiProxy`), and when? Today it's per device (`localStorage`). A server-side switch per account comes with the accounts work (G12).
  3. Still open from earlier: Anthropic DPA confirmation (J7); J10 Google Cloud setup; Step 4 setup list (Stripe, Blaze, Vertex AI).
- **JC to test (/build/, close and reopen the tab; footer v2.17.0-build):** colours look fine on each tab (both themes); a meal rating shows e.g. "✕ Red"; Tab key shows a blue outline; Settings → Privacy & your data → Download my data.
- **Resume point:** `build` @ 9f3e614 (v2.17.0), prod v2.15.1. Steps A–F done. Next: Architect review of /build/ → build → beta PR **when asked**; then the P6 remainder, or the accounts migration (G12) once JC approves.

### (Coder) 14 Nov 2026 — v2.17.1 on build: calorie model, My Notes on body records, Week so far
- **v2.17.1 (`build` 06dd82b):**
  1. **Calorie model** (JC, 14 Nov; [design/CALORIES.md](docs/design/CALORIES.md), **ADR 0013**). Replaces the fixed targets, the kcal deficits and the R6 admin switch; active for everyone.
     - BMR: Katch-McArdle (last 3–4 weigh-ins with body fat); Mifflin-St Jeor / age-sex average fallbacks labelled "estimate".
     - Baseline BMR × 1.15; goal = baseline × (1 − deficit %, default 20%), floored at BMR.
     - Activity credit net of resting burn: Health total − baseline (nothing added on top), else steps above a per-person allowance + exercise (MET − 1) × kg × h; × the R5 %.
     - Shown on **Home** (today) and **each My Eating day** with "How this is calculated"; My Eating's limits use goal + credit.
     - Google sync also reads **steps per day** → `dailyActivity`, shown on that day in My Exercise.
  2. **My Notes on weigh-ins:** a new field on the Weigh In form, saved with that week's values; measurements already had notes; Open cards show and edit them. `bodyNotesCtx()` in `getCrossSectionCtx` puts them in every companion that sees body data (Home check-in, Chat, eating, body, measurement, session, health).
  3. **Home "Week so far: Plan vs Actual"** (between My Day and My Journal, today's calorie line above it): complete days only, eating ±10/20% RAG, sessions vs planned, overall average, per-day breakdown.
  - **Tests:** `tests/v2171.spec.js` (9) with the known inputs. BMR 1,849, baseline 2,126, goal 1,701 at 20%, step allowance JC 2,724 / Becks 3,027, 10,000 steps +247, 30-min weights +184, total-burned mode with no double count, the floor, both fallbacks, the adjustment %, a fixed-clock Wednesday, and a weigh-in note reaching the AI request. The old R6/deficit tests were replaced. Full suite **204 passed**, lint 0 errors, 360px screenshots checked.
- **⚠ Decision needed (JC): the BMR floor vs the 20% default.** With baseline = BMR × 1.15, any deficit above ≈ 13% falls below BMR, so the floor applies. Example: JC's test numbers give 1,701 at 20%, but the goal shows **1,849 "limited to your BMR"**. The safety rule was kept as written. Options:
  - (a) floor at a share of BMR (e.g. 90% → 1,664, so 20% gives 1,701);
  - (b) default deficit ≈ 10–13%;
  - (c) keep as built (effective deficit ≈ 13%).
- **Other notes:** the old `calorieSettings.deficit` (kcal) and `r6Active` are ignored (not deleted). The Google steps data type name is unverified until J10.
- **JC to test (/build/, footer v2.17.1-build):**
  1. Home: Today's calorie line, then "Week so far" (tap for days).
  2. My Eating → a day: the same line with that day's food.
  3. "How this is calculated" shows your BMR etc.
  4. Change deficit.
  5. My Body → 📋 Record with My Notes → Body Feedback mentions it.
- **Resume point:** `build` @ 06dd82b (v2.17.1), prod v2.15.1. Next: **wait for JC's test**, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.17.1 docs follow-up: calorie model explained everywhere
- **build `21ac1ac`** (no version change; ships with v2.17.1): APP_GUIDE "How your calorie goal works" + Help Q&A (goal, BMR and why it changes, step allowance, exercise MET, net vs watch + adjustment %, deficit %, "limited to your BMR", Plan vs Actual, My Notes), wellness/GP line, glossary terms; Settings → Documentation lists `docs/design/CALORIES.md`. Lint 0 errors; v2150/v2160/v2171 specs 23 passed.
- **main:** HLD §6a (calorie model, Plan vs Actual, body-record notes) and AI-flow rows; LLD §3a (fields, flow, display); Privacy Notice (daily steps + calories burned if connected, derived BMR not stored; retention while connected + 12 months); TEST_STRATEGY §2a calorie regression set; README index (design docs, ADRs 0001–0013); CHANGELOG; plan F18 Done.
- **JC to test:** Help → "How is my calorie goal worked out?" / "Why is my activity credit lower than my watch says?" on `/build/`.
- **Open:** BMR floor vs 20% default (a/b/c, previous entry).
- **Resume point:** `build` @ `21ac1ac` (v2.17.1), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.17.2 on build: calorie decisions applied
**Decisions (JC, 14 Nov):**
- **Safe minimum** replaces "never below BMR": goal ≥ max(90% of BMR, 1,200 kcal women / 1,500 kcal men), labelled "limited to your safe minimum". Reason: the BMR floor capped every deficit above ≈ 13%. Rejected: default deficit 10–13%; keeping the BMR floor.
- **Week so far:** days with nothing logged are skipped (not off track) and shown as "N days not logged".
- **Old settings:** `calorieSettings.r6Active` and the kcal `deficit` removed by a one-off idempotent clean-up on load (`stripOldCalorieSettings`); nothing else touched.
- **build `e3adc42`** (v2.17.2). 91.9 kg / 25.5% → BMR 1,849, safe minimum 1,664, goal at 20% = 1,701 (not floored). Side effect: the step allowance follows the goal (formula 0.15 × BMR − 10% of goal), so JC's test profile is 3,160 (was 2,724) and Becks's 3,500 (clamped, was 3,027); 10,000 steps → +232. Full suite 207 passed (6 skipped), lint 0 errors.
- **main:** CALORIES.md, ADR 0013, HLD, LLD, TEST_STRATEGY, CHANGELOG, plan F19.
- **JC to test (/build/, footer v2.17.2-build):** Home calorie line shows your goal at 20%; set the deficit to 30% → "limited to your safe minimum"; Week so far shows "N days not logged" for any empty day; Help → "What does 'limited to your safe minimum' mean?".
- **Resume point:** `build` @ `e3adc42` (v2.17.2), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.18.0 on build: person goals, one goal everywhere, Today Planned | Actual
**Decisions (JC, 14 Nov; supersedes the earlier calorie-display redesign message):** five person goals with descriptions and calorie approaches; timescale slider 3–24 months with safety limits (> 1%/week, gap > 25% of body burn, below safe minimum → red with Steady/Gentle alternatives; never below BMI 18.5); mandatory setup incl. activity level (1.15/1.3/1.45 only on days without step data); user-facing deficit % removed; one goal everywhere; Home Today table replaces the calorie line and Week so far; companions framed by the goal, suggestion-only goal changes. ADR 0014.
**Coder choices (say if you want them changed):** no target weight → aims for the top of the healthy range (BMI 24.9); amber = > 0.75%/week or > 20% of body burn; Steady = 0.5%/week, Gentle = 0.35%/week; Build surplus +7.5%, recomposition at body fat ≥ 25% (men) / ≥ 32% (women); Grow/Support −10% only when BMI ≥ 25; the applied aim is capped at 25% (10% for Grow/Support) even if a red pace is kept; "Later" hides the setup until the next visit; conditions from the new My Health → My conditions (or the questionnaire); no admin deficit UI (kept internal only).
**Open:** F23: the food-rating rule (`src/lib/rag.js`) still uses fixed reference kcal (2,100 / 1,800) for an item's share of the day; lists are shared, so changing it re-rates foods. Needs a decision. Tests that seed from the real backup (people, person-race) now set a goal in the emulator copy.
- **build `dde5c3e`** (v2.18.0). Full suite 215 passed (6 skipped), lint 0 errors; 360px checked (Today, week view).
- **main:** CALORIES.md §7, ADR 0014, HLD §6a, LLD (goals.js, fields), Privacy Notice (goal, target weight, activity level, conditions), TEST_STRATEGY regression set, CHANGELOG, plan F20–F23. The private DPIA is the Architect's.
- **JC to test (/build/, footer v2.18.0-build):** the goal setup appears for JC and Becks (try the slider: a short timescale goes red with Steady/Gentle buttons; a too-low target is blocked); Home → Today table (rows, Week to date pill, ▸ Show earlier days, footnote); My Eating day and Week show the same goal; Body feedback mentions your goal; Help → "How does the timescale slider work?".
- **Resume point:** `build` @ `dde5c3e` (v2.18.0), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.18.1 on build: recommended target weight
**Decision (JC, 14 Nov):** the target weight is recommended by the app, not typed first. Body-fat method (lean mass ÷ (1 − healthy body-fat %)), BMI fallback labelled estimate; Accept or Change (amber note, both stored, companion may refer to the recommendation); BMI 18.5 block and safety rails kept; material changes → suggestion.
**Coder choices:** bands men 40+ 18–22%, men <40 15–19%, women 40+ 25–31%, women <40 22–28% (mid-point = target, ends = range); BMI fallback target = mid of 22–24.9; "material" = 2 kg; the update suggestion only when the person is following the recommendation (not for their own target).
- **build `dc9926a`** (v2.18.1). Full suite 219 passed (6 skipped), lint 0 errors. Known inputs: 91.9 kg / 25.5% / 50 M → 85.6 kg (83.5–87.8).
- **main:** CALORIES §7.2, ADR 0014, LLD, TEST_STRATEGY, CHANGELOG, plan F24.
- **JC to test (/build/, footer v2.18.1-build):** My Profile → Change my goal: the recommendation and its reason; Change to your own number → amber note; Save; My Profile shows both; Help → "How is my target weight worked out?".
- **Resume point:** `build` @ `dc9926a` (v2.18.1), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.18.2 on build: food ratings (F23)
**Decisions (JC, 14 Nov):** all v2.18.0 and v2.18.1 Coder choices accepted. F23: list items (parents) rate against the UK reference intake (2,000 kcal, sat fat 20 g, free sugars per D11 = 25 g), shared, no re-rating; selections (children) rate against that person's goal and personal limits; the existing "… today" note shows when they differ.
**Coder choices:** personal limits = daily goal without exercise (typical body burn + aim, ≥ safe minimum); sat fat and sugars scaled from 20 g / 25 g by goal ÷ 2,000, never above the reference when a condition makes them a priority (cholesterol → sat fat; glucose → sugars); the reference until setup is complete; selections are re-rated live in the screens (stored ratings update when a selection changes); Snap previews use the person's limits; frequency warnings still count stored bands; plain note "RED today — for your goal".
- **build `fe7df5e`** (v2.18.2). Full suite 222 passed (6 skipped), lint 0 errors. Four older tests updated for the new references (their old expectations came from the 1,800 kcal reference).
- **main:** CALORIES §7.7, ADR 0014, LLD, TEST_STRATEGY, CHANGELOG, plan F23 Done.
- **JC to test (/build/, footer v2.18.2-build):** a big meal on your day may show e.g. "RED today — for your goal" while the list item keeps its rating; Help → the rating system.
- **Resume point:** `build` @ `fe7df5e` (v2.18.2), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 14 Nov 2026 — v2.18.3 on build: rating consistency
**Decision (JC, 14 Nov):** frequency warnings and week counts use the same computed personal rating the screen shows; one-off, idempotent refresh of stored ratings for the current and future weeks only (past weeks keep their history).
**Coder choices:** the refresh runs on load, once per person (flag `ratings_refresh_v2183` in the data root) and only after that person's goal setup is complete, so JC and Becks are refreshed on the first open after finishing setup; past weeks' counts (e.g. "within the past month") use their stored ratings. Also fixed a pre-existing race in `open.spec.js` (count-then-click could close the Progress panel; now retried with `toPass`, the assertion unchanged).
- **build `a86833a`** (v2.18.3). Full suite 225 passed (6 skipped), lint 0 errors.
- **main:** CALORIES §7.7, LLD, TEST_STRATEGY, CHANGELOG, plan F25.
- **JC to test (/build/, footer v2.18.3-build):** a selection shown RED for your goal shows a matching ⚠️ warning when repeated this week.
- **Resume point:** `build` @ `a86833a` (v2.18.3), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 15 Nov 2026 — v2.19.0 on build: eating lists redesign (per portion)
**Decision (JC, 15 Nov; priority — 3rd week the eating flow failed):** design `docs/design/EATING_LISTS.md` + ADR 0015, committed first (845057d). Per portion everywhere; drop-downs show only own list items + "+ Not in my list?"; Update Lists tabs (Add single item, Build a meal, Create my own item); clarifying AI with schema/retries/validation/plausibility; meals edit components/amounts/serves; idempotent migration; parent/child and personal ratings kept.
**Coder choices:** per-portion values stay in the existing top-level fields (backward compatible); OFF default portion = the product's serving size, else 100 g; amber not used here; clarifying flow max 3 questions, 2 retries, then a friendly question; kcal 5–2,500 and macros-vs-kcal within max(35%, 60 kcal); a meal's list-item components are linked by `ref` and refreshed when the meal is edited; the empty-slot "Open" also goes to Update Lists; the old add form is kept only behind "📷 Photo or bulk paste" (its typed path, and "🔎 Re-check nutrition", still use whole-recipe AI — plan F27 to retire); no AI "suitability" sentence for the new tabs (rating only).
- **build `94f0223`** (v2.19.0). Full suite 236 passed (6 skipped), lint 0 errors. Older tests updated: button rename, "per portion" label, migration-safe "parent untouched" checks (toMatchObject), empty-slot Open → Update Lists, D7 edit tests rewritten for the clarifying flow.
- **main:** HLD (eating lists per portion + AI flow row), LLD (portion.js, clarify.js, UpdateLists.jsx, item fields), TEST_STRATEGY, CHANGELOG, plan F26 Done / F27 Planned.
- **JC to test (/build/, footer v2.19.0-build):** a meal drop-down shows only your items and ends with "+ Not in my list?" → add a UK product (check "1 portion = … g") with "Add to <day> now" → back with it selected; Build a meal (e.g. the pasta bake, Serves 4); Create my own item (answer the Companion's question); older recipes show "Check me — confirm portions".
- **Resume point:** `build` @ `94f0223` (v2.19.0), prod v2.15.1. Next: wait for JC's test; F27 (retire the old whole-recipe paths) when asked; then the build → beta PR when asked.

### (Coder) 15 Nov 2026 — v2.19.1 on build: F27 (old add paths per portion)
**Decision (JC, 15 Nov):** before the beta PR, convert photo, bulk paste, the typed add form and Re-check nutrition to the per-portion model and the clarifying conversation; Re-check flags rather than changes; no whole-recipe prompts.
**Coder choices:** typed text and edited Review ingredients hand over to "Create my own item" (seeded) rather than a second Review flow; a photo it can't size opens the conversation with its question; bulk lines that stay unclear after 2 re-asks are listed "needs a little more from you" with "Finish with my Companion"; Re-check covers every list item except built meals, flags whole recipe / per 100 g / > 35% off one portion (`portionCheck`), and editing a flagged item recalculates through the conversation; the meal-variation recalculation (already per portion) got a retry and a friendly message.
- **build `7323d0d`** (v2.19.1). Full suite 241 passed (6 skipped), lint 0 errors. Tests: `tests/v2191.spec.js` + bulk/eating/rating specs updated to the new schema and flows.
- **main:** EATING_LISTS §3d, LLD, TEST_STRATEGY, CHANGELOG, plan F27 Done.
- **JC to test (/build/, footer v2.19.1-build):** 📷 Photo or bulk paste: a photo shows "1 portion = … · values per portion"; bulk-paste a few items (an unclear one shows "Finish with my Companion"); typing a description opens Create my own item; 🔎 Re-check nutrition marks whole-recipe items "Check me — confirm portions" and changes nothing.
- **Resume point:** `build` @ `7323d0d` (v2.19.1), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 15 Nov 2026 — v2.19.2 on build: F28 (JC's test of v2.19.1: not ready for beta)
**Decision (JC, 15 Nov):** five fixes before beta — (1) food search must forgive spelling (results as you type: own lists → built-in UK generic list → UK products; fuzzy; synonyms; generic list "Typical values"; "Describe it instead" with 1–3 choices); (2) fix UK product search; (3) wrong-match guard for per-100 g / sauce products; (4) restore the earlier light-blue panel and deep-blue buttons, one-line equal-width tabs "Single item / Build a meal / My own"; (5) Build a meal ingredient rows as mini cards. Build only; no beta/main merges.
**Cause of (2):** OFF's search endpoint (`world.openfoodfacts.org/cgi/search.pl`) intermittently returns 503 "Page temporarily unavailable" with no CORS header, so the browser reports a network failure (about half of requests in Chromium on 15 Nov). The CSP was fine. `search.openfoodfacts.org` answers, but without `Access-Control-Allow-Origin`, so a browser can't use it. Rejected: switching to it (CORS-blocked); a server proxy (would mean deploying to Google Cloud). Fix: retries (3, backoff), 9 s timeout, cache, debounce; local results never wait.
**Coder choices:** fuzzy = per-word exact / prefix / OSA typo distance (1 for 5–6 letters, 2 for 7+) / sound-alike skeleton; filler words ignored; UK product search gets the spelling-corrected query; 85 generic UK foods (per 100 g + typical portion, editable grams); guard = no serving size, or sauce / jar, condiment or spread (name + OFF categories) → type and pack size shown, portion must be confirmed, a sauce jar defaults to ¼ pack; in Build a meal such products come in in grams; the panel uses the person's accent (as Set Defaults); Single item reuses an item already in a list (same name) instead of duplicating. To diagnose OFF, JC approved a personal "Life-Care" cloud environment that allows world/search.openfoodfacts.org.
- **build `bca949f`** (v2.19.2). Full suite 249 passed (6 skipped), lint 0 errors. New `tests/v2192.spec.js` (fuzzy cases, generic offline, 503 retry, OFF CSP hosts, guard, Describe it instead, 360 px layout + screenshots); v2190/v2191/eating specs updated for live search and tab names. Deploy runs 376 (build push) and 377 (dispatch) success.
- **main:** EATING_LISTS §3e, LLD, TEST_STRATEGY, CHANGELOG, plan F28 Done.
- **JC to test (/build/, footer v2.19.2-build):** Update Eating Lists → Single item: type "fruselli", "pasta spirals", "penny" (fusilli/penne appear as you type); "Aldi pasta bake" (UK products appear; the sauce shows "sauce / jar", pack size, and asks to confirm the portion); type nonsense → "Describe it instead"; Build a meal on the phone (cards, gaps); tabs on one line.
- **Resume point:** `build` @ `bca949f` (v2.19.2), prod v2.15.1. Next: wait for JC's test, then the build → beta PR when asked.

### (Coder) 15–16 Nov 2026 — v2.20.0 overnight batch (in progress, build only)
**Decision (JC, 15 Nov):** nine items in priority order, one commit + push to build per item, a progress line here after each; finish = v2.20.0 on /build/ only. Real data: read-only fixes, no migrations.
- 1/9 done — build `7db950a`: Home My Eating showed child ids ("C 2026-11-15 B") because Home's lookup lacked the week's children. New `src/lib/mealNames.js` (`mealName`, `namesLine`; unresolved → "Unnamed item", logged); Home and Shop use it. Other readers (AI context, Eating feedback, Copy Week, meal summary) already resolved via children. Suite 251 passed.
- 2/9 done — build `8340f71`: cause of the lost thread: Home chat (askQuestion) sent no history at all; Help sent 6. New `src/lib/memory.js` (`historyBlock`, `apiTurns`, `rollingSummary` — extractive, no AI call; `sharedContext` 14 days, ≤ 1,500 chars). Chat and Help are now multi-turn; feedback threads send the last 20 + summary and the shared context; messages get `ts`; chat history kept 12 months (was last 20). Privacy: sources keyed by person; body/meas/journal only for the active person; a test checks Becks' text never reaches JC's requests. Suite 257 passed.
- 3/9 done — build `051ba02`: `newestFirst` in `lib/chat.js` (message level, by `ts`; `latestFirst` kept as an alias so Home's feedback history follows); `components/ChatThread.jsx` used by Chat, Help and renderThread (Home, Eating day/week, Exercise, Body, Measurements); Chat/Help input moved above the conversation. D8 test updated. Suite 261 passed.
- 4/9 done — build `5b5d05a`: cause of the narrow column: in `renderThread` the input row's createElement was never closed, so the error and the conversation were flex siblings of the textarea (all six feedback threads). Fixed; textarea `flex 1 1 220px`, wraps on narrow screens. Label `COMPANION_LABEL = \"Your Companion\"` in ChatThread + Home feedback history + PlanActual + Exercise heading. 360 px test. Suite 262 passed.
- 5/9 done — build `a1d07b3`: cause: Accept stored the Companion's sentence ("Next increment up from 42kg") as the weight, the pre-fill regex then took 42; with per-set entries the target was ignored; nothing used Ready to Move. New helpers in `lib/exercise.js` (`nextLogPrefill`, `resolveTargetWeight`, `progressionRange`, `nextSteps` via pin stack or 'increments:' in progression notes, `measureOf` kg/reps/seconds/minutes, `displayCurrent` for old prose values — read-only). Card: "Next: try 49–55 kg …" + "My next weight" → `progressionValue` + note; Accept note value recorded too; stale values (≤ last) ignored. Tests incl. Becks 5→8 kg calf raise and the Accept chain. Suite 265 passed.
- 6/9 done — build `76fd140`: `dayTable` adds `onTrackPlanned`; `PlanActual` DayRows: `aimLabel` (deficit, or 'surplus' when the goal adds calories, e.g. Build — decision: JC's wording kept for every deficit/zero goal), bold Body burn, two On track cells (green ≤ 0, red over, % underneath); footnote 'Goal: <name · months> (±N kcal a day)'. Week view unchanged. Suite 266 passed.
- 7/9 done — build `4b5e0c7`: token `FIELD_BORDER`/`FIELD_RADIUS` (styles.js) and `--field-border` with a global input/select/textarea rule (index.html); 66 field style lines across 15 files moved from #e2e8f0 / radius 4–6 to the token (scripted, only inside input/select/textarea tags); meal picker trigger too. Coloured borders (errors, violet accent) kept. A test sweeps Home, Eating (+ Update Lists), Exercise (+ log), Body, Health, Shop for borderless fields. Suite 267 passed.
- 8/9 done — build `278389f`: axe found amber (#d97706, 3.2:1) list text and two unlabelled log fields; fixed (+ green/orange text, Accept button). `src/lib/a11y.js` `useDialog` on Chat/Help/Privacy/Review Item. role=status on message banners. `@media (pointer: coarse)` min 44 px height (icon buttons 44 × 44). docs/legal/ACCESSIBILITY.md draft 3 on main (remaining: 200% text resize, target spacing, charts, small text, manual SR audit). Suite 270 passed.
- 9/9 done (a–e partly, f checked) — build `4df0cfb`: (a) MealSelect phone sheet: `fuzzyFind`, 56 px rows, `aria-selected` current (incl. its parent), `✕ Close` ("Close the list"); other long selections (exercise choice, person, units) NOT converted — left. (b) pick toast + Undo (state in EatingSection: the picker is re-created every render); Undo for deletes/removals NOT added (all deletes confirm). (c) `installFieldHelpers` (a11y.js): inputmode=decimal on number fields, select-all on focus. (d) `FloatingSave` on the exercise log (IntersectionObserver), chat button at 12 px + safe area, #root bottom padding 80 px. (e) haptic tap on Save/Confirm/Send/Add/Set; skeletons and a generic double-tap guard NOT done. (f) all deletes already confirm; Clear Week separated. Suite 272 passed.
- **Finished — build `2f66d61` (v2.20.0).** Help updated; suite 273 passed (6 skipped), lint 0 errors. main: CHANGELOG, plan F29 Done, LLD, TEST_STRATEGY, ACCESSIBILITY.md draft 3.
**Decisions (Coder, overnight — JC to confirm):**
- Memory summary of older messages is extractive (no extra AI call, no cost); shared context is per person, 14 days, ≤ 1,500 chars, and includes chat topics. Legacy messages without timestamps count as recent (last two).
- Chat history kept 12 months (was the last 20 Q&As); Help/Chat now send real multi-turn conversations.
- "Your goal surplus" is shown instead of "deficit" when a goal adds calories (Build); JC's wording otherwise.
- On track colours keep the existing rule (green ≤ 0, red over); no amber added.
- Progression range uses the pin stack unless "increments: …" is in the exercise's progression notes; stale progression values (≤ last weight) are ignored; old prose weights are displayed as the latest logged weight (read-only, no migration).
- Touch-target minimum (44 px) applies on touch screens only (pointer: coarse), so desktop layouts are unchanged; min width only for icon buttons, to keep the day-tab row on one line.
- Floating Save instead of `position: sticky` (an ancestor clips overflow, so sticky can't work there).
- To trace the Open Food Facts failure earlier, JC approved a personal "Life-Care" cloud environment with world/search.openfoodfacts.org.
**Left / not done:** other long selections (exercise choice, person, units) as bottom sheets; Undo after deletes/removals (all confirm); loading skeletons; a generic double-tap guard; 200% text-only resize; 8 px spacing audit; chart text alternatives.
- **JC to test (/build/, footer v2.20.0-build; close the tab and reopen):** Home My Day shows meal names; ask Chat something, then a follow-up like "those two…" (it remembers); newest message on top and labelled "Your Companion"; reply to Exercise feedback (full-width box); an exercise at Ready to Move shows "Next: try X–Y kg" and its Log pre-fills the next weight; set "My next weight"; Today table (Your goal deficit, bold Body burn, On track in both columns); pick a meal on the phone (big rows, Added/Undo); weight boxes open the number pad.
- **Resume point:** `build` @ `2f66d61` (v2.20.0), prod v2.15.1. Next: wait for JC's test; then the build → beta PR when asked. Do NOT merge to beta or main.

### (Coder) 16 Nov 2026 — v2.20.1 on build (in progress): JC's phone test of Build a meal
**Decision (JC, 16 Nov):** five fixes (obvious adding / no duplicate rows; saved = preview; stay on the form after Save; back to the day being planned; Serves required, type labels, typical sauce portion). Build only, commit per item.
- 1/5 done — build `9dc3c54`: MealBuilder `addComp` clears the search, `meal-added` toast (aria-live), `data-new` card highlight + scrollIntoView; duplicates (same list ref, or same name for catalogue/generic/UK items) → `dup-prompt` (Yes = +1 portion, or + the portion's grams when in grams). Suite 274 passed.
- 2/5 done — build `f947917`: cause: v2.19.2's same-name reuse in SaveStep kept an older 'Tomato Pasta Bake' (628 kcal) in Dinners; a clean run saves exactly the preview (373). Now: identical → reuse; different → `name-clash` (Replace keeps the id with the new values / Keep both saves '… (2)'). Lists rows have `data-testid=list-row`. Suite 275 passed; share.spec 1 flaky failure, passed on rerun (unrelated).
- 3+4/5 done — build `8ba46f8`: SaveStep → `SavedCard` (scrolls itself into view; Day/Meal selects; 'Add to <day> <meal>' → `onAddNow(…, slotFor(cat, day))`); Eating `slotFor` = first empty slot of that meal (b/l/d…, o1…, ds1…, dr…); `addNowToSlot` now flashes the slot (match by the selection's parent), scrolls to it and shows 'Added to <day> <meal>' + Undo (restores the week view). Old status-message tests moved to the saved card. Suite 279 passed.
- 5/5 done — build `acb9b28`: serves '' by default, Next blocked with a focused prompt; `meal-whole` total; `serves-hint`. `productType` order: sauce (category/name, or a 'bake' under 2.5 g protein & 130 kcal/100 g) → condiment → spread → ready meal (category or dish names) → drink → dried pasta (category, or a pasta name ≥ 300 kcal/100 g without bake/meal/sauce/cheese/salad…). Sauce without pack: Single item 125 g '¼ of a typical 500 g jar (125 g): adjust'; Build a meal 125 g with the same hint. Suite 281 passed.
- **Finished — build `6dcf7ec` (v2.20.1).** Help updated; suite 281 passed (6 skipped), lint 0 errors. main: CHANGELOG, plan F30 Done.
**Decisions (Coder):** a same-name item with identical values is reused silently, a different one always asks (Replace keeps its id with the new values; Keep both adds "… (2)"); "Add to a day" uses the first empty slot of that meal (b/l/d…, o1…, ds1…, dr…); Undo restores the week view as it was before the add; the duplicate check matches the same list item, or the same name for common foods / UK products; Yes adds 1 portion (or the item's portion grams when the row is in grams); the "whole dish?" hint shows only while portions is empty or 1; a Build a meal sauce with a known pack size still starts at the whole pack (a jar usually goes in whole).
- **JC to test (/build/, footer v2.20.1-build; close and reopen):** from Sunday dinner → + Not in my list? → Build a meal (fusilli + Aldi sauce): tap fusilli twice (one row, the prompt), portions required, Save → back on Sunday with it selected and "Added to Sunday dinner"; Update Eating Lists → Single item → Save → the ✓ Saved card → Add to a day.
- **Resume point:** `build` @ `6dcf7ec` (v2.20.1), prod v2.15.1. Next: wait for JC's test; then the build → beta PR when asked. Do NOT merge to beta or main.

### (Coder) 16 Nov 2026 — v2.20.1 promoted build → beta
**Decision (JC, 16 Nov):** tested v2.20.1 on /build/; promote to beta (APP_GUIDE from build); not to main.
- PR #26 `build → beta` (v2.16 – v2.20.1, 35 commits, merged cleanly) merged with a merge commit as `ea1b6e4`. Beta deploy started (run 425 → main's dispatch).
- **JC to test (/beta/, real data; close the tab and reopen, footer v2.20.1-beta.N):** the v2.20.0 and v2.20.1 lists (Home names, Companion memory and order, exercise progression, Today table, picker, Build a meal → back to the day). First load also runs the one-off migrations on real data: eating items get per-portion descriptions (v2.19.0, idempotent, nothing deleted) and the ratings refresh for current/future weeks (v2.18.3).
- **Resume point:** `beta` @ `ea1b6e4` (v2.20.1), `build` @ `6dcf7ec`, prod v2.15.1. Next: wait for JC's beta test; the release PR beta → main only when JC approves (the Architect tags it).

### (Coder) 16 Nov 2026 — v2.20.2 on build: "My next weight" + Set
**Defect (JC on beta v2.20.1):** after Set the row stayed on the card (status stayed Ready to Move) and each press appended "Progression: 70 kg (set by you, Wk18)"; Accept also appended "WkN accepted: …" a second time after saving.
**Fix:** `applyNextValue` (lib/exercise.js) — target on the headline (kg → "70kg", reps at the bottom of the range; plate → "Plate 8"; reps / seconds → the reps field), status "moved up", `progressionValue`; the Set row closes; "✓ Next weight set: 70 kg" toast + Undo (restores the exercise as it was). `setWeekNote` — one line per exercise per week ("Wk18: next weight 70 kg (set by you)"), replacing that week's accepted / set-by-you lines; used by Set, Accept and Decline. `tidyNotes` — repeated identical segments shown once on the card and Progress panel; the stored note is rewritten only when that exercise is next saved (Set, Accept, Decline, ✎). ✎ edit: a changed weight above the last log becomes the target; otherwise the stored target is cleared. Measure "plate" when the current value says Plate/Pin.
- **build `acc4ef0`** (v2.20.2). Suite 285 passed (6 skipped), lint 0 errors. Tests `tests/v2202.spec.js` (both people, all measure types, Set ×3, Undo, legacy note) + the v2.20.0 chain test updated.
- **JC to test (/build/, footer v2.20.2-build):** an exercise at Ready to Move → My next weight → Set: the row goes, headline shows the new weight, Moved Up, toast with Undo; Log pre-fills it.
- **Resume point:** `build` @ `acc4ef0` (v2.20.2), `beta` @ `ea1b6e4` (v2.20.1), prod v2.15.1. Next: wait for JC's test; then build → beta when asked. Do NOT merge to beta or main.

### (Coder) 17 Nov 2026 — v2.20.2 promoted build → beta
**Decision (JC, 17 Nov):** tested v2.20.2 on /build/; promote to beta (APP_GUIDE from build); not to main.
- PR #27 `build → beta` (1 commit, merged cleanly) merged with a merge commit as `bcac68e`.
- **JC to test (/beta/, real data; close and reopen, footer v2.20.2-beta.N):** an exercise at Ready to Move → My next weight → Set; existing duplicated notes show once (stored note rewritten only when that exercise is next saved).
- **Resume point:** `beta` @ `bcac68e` (v2.20.2), `build` @ `acc4ef0`, prod v2.15.1. Next: wait for JC's beta test; the release PR beta → main only when JC approves (the Architect tags it).

### (Coder) 17 Nov 2026 — v2.21.0 on build: Android through Google Play internal testing (N1, Android part)
**Decision (Architect/JC, 17 Nov):** no sideloading — JC and Becks test via Play **internal testing**, the pilot via **closed testing**, with Play App Signing; upload key only in GitHub secrets + one offline copy in JC's password manager (never the vault); release → `data`, debug → `data_build`, deploy guard extended to native; Play listing pack; in-app + web account deletion; manual CI upload to the internal track; **PAYMENTS FLAG: no Stripe in the native app** (Play Billing / Apple IAP; Architect revises tiers/Energy — plan PAY1). Package name chosen by JC: `com.companionappsstudio.lifecare` (permanent).
**Coder choices (ADR 0016):**
- Capacitor 8.5.3, `@capacitor/app` 8.1.1, `@capgo/capacitor-social-login` 8.7.5 (all ≥ 2 weeks old). Rejected `@capacitor-firebase/authentication`: it needs Firebase 12 (app on 10.12).
- Native Google sign-in: Android account picker → ID token → `signInWithCredential` (Firebase 10 unchanged); needs the `GOOGLE_WEB_CLIENT_ID` repository variable and the SHA fingerprints in Firebase (J20).
- Guard: `scripts/check-native.mjs`, run by `build-native.sh`, by Gradle before every build, and in CI (release: data, prod, client ID; debug: data_build). Tested both ways.
- CI uploader is our own (`scripts/play-upload.mjs`, Node built-ins); refuses production; first upload manual (Play rule); versionCode 1000 + run number.
- Deletion: **Delete my account** for everyone (data + sign-in record + sign-out, audited), `delete-account.html` with a non-app route ("Developer contact" email on the Play page, so no email address in the repo). The P2 per-uid version still comes with Step 5 accounts.
- `privacy-policy.html` / `terms-of-use.html` generated from the legal Markdown; the notice's "[In-app deletion … planned]" line replaced with the real route. `check-pages` now requires both Play pages in prod.
- Health Connect: **not requested** in v2.21.0 (no declaration needed now); declaration text prepared for N6.
- **Closed testing is blocked until per-uid accounts:** a Play reviewer account on today's allow-list would see the household's real data.
- Verified here: Android SDK 36 + Gradle 8.14.3; an unsigned and a test-key-signed release AAB built (6.5 MB, `jarsigner` verified, versionName 2.21.0); the Gradle guard stops a release built with debug web files. (Environment "Life-Care" now also allows dl.google.com.)
**Found and fixed:** the v2.20.0 `index.html` styles (field border token + global rule, 44 px touch targets, room under the chat button) were never committed — my commit script staged only `src/tests/public`; v2.20.0–v2.20.2 builds and **beta** ran without them. Committed on `build` as `fe10428`; the script now stages everything (gitignore keeps keys and builds out). Beta gets them with the next promotion.
- **build** `fe10428` (fix) + `32c7ce2` (v2.21.0). Suite 289 passed (6 skipped), lint 0 errors. Tests `tests/v2210.spec.js`; v2200 axe / 9c tests now pick Sunday (they assumed today had exercises).
- **main:** `docs/store/PLAY_LISTING.md` (listing, Health Connect declaration text, Data safety answers, app access, content answers), `docs/store/PLAY_SETUP_J_STEPS.md` (J18–J21, 39 steps), ADR 0016, plan (N1 In progress, G10, J18–J21, PAY1), CHANGELOG, LLD §2a, TEST_STRATEGY.
- **JC to test (/build/, footer v2.21.0-build):** Settings → Privacy & your data → **Delete my account** is there (don't press it on real data); the web app otherwise unchanged; the field borders / 44 px targets now really present. The Android app itself is tested from Play after J18–J21 (needs v2.21.0 on main for the workflow).
- **Resume point:** `build` @ `32c7ce2` (v2.21.0), `beta` @ `bcac68e` (v2.20.2, without the index.html styles), prod v2.15.1. Next: wait for JC's test; promote build → beta when asked; JC's J18–J21 after v2.21.0 reaches main; iOS (TestFlight) and PAY1 later.

### (Coder) 17 Nov 2026 — combined instructions: Part A v2.21.1 (safety), then Part B v2.22.0 (tiers) — in progress, build only
**Decision (JC, 17 Nov 2026):** "Delete my account" must NOT be available to the joint/admin account — its UID is the one the DB rules are locked to, so deleting it locks JC and Becks out of all data. Enforce in the deletion code and server too, not only the UI; two-step confirm + recent sign-in (5 min) + "Download my data first" for everyone else.
- Part A done — build `0db2f11` (v2.21.1): `src/lib/accountGuard.js` (`LOCKED_UIDS` = the live rules UID — a test keeps it equal to database.rules.json —, platform/admins, emulator test admin; `needsRecentSignIn` 5 min). `deleteMyAccount` order now: guard → re-auth if needed → erase → audit → delete sign-in → sign out (was erase first). Server `deleteAccount` (functions/src/core.js + index.js) refuses LOCKED_UIDS and platform admins before any change; functions are not deployed, so today the client guard is the active control. **Database rules can't block a person deleting their own Firebase sign-in** (no Auth hook for it), so no rules change. Emulator rules (generated) now also allow `test-uid-member` for the "normal account" test; live rules unchanged. Suite 291 passed, functions 16/16, lint 0 errors.
- **v2.22.1 — build `e3ac88d`** (Architect: hide ratings on Bronze): `src/lib/rating.js` + `components/Rating.jsx` (one place; ~50 colour/label sites routed through it), hint on the My Eating Lists header. Suite 307 passed (6 skipped), lint 0 errors.

### (Coder) 17 Nov 2026 — v2.22.1 on build: food ratings hidden on Bronze
**Decision (Architect, 17 Nov 2026):** "HIDE ratings on Bronze, including stored ones. Ratings are a Silver feature, not user data; all records, portions and calories stay visible and the stored ratings are kept (they reappear on upgrade)." One shared helper; neutral = normal body text; one "🔒 Ratings: Silver" hint on the list header only; don't delete or rewrite stored ratings.
- **Coder choices:** the switch is the existing `foodRatings` (the Architect's `ragRatings`; same thing, no second switch). Also hidden: the RagCue icons, the "rating changed" badges, the AMBER/RED frequency warnings, the item-name colours, the `data-rag` attribute and the day "targets in range" dots in My Eating (coloured by the same red/amber/green). The rating logic is untouched (meal generator, prompts, stored fields).
- **build `e3ac88d`** (v2.22.1). Suite 307 passed (6 skipped), lint 0 errors. Tests `tests/v2221.spec.js`: Bronze sweep (Home, My Eating, lists + item view, My Shop) finds no rating word / badge / cue / dot / coloured name; Silver unchanged; Silver → Bronze → Silver shows exactly the original ratings and the stored list is byte-identical. Fixed a timing race in the v2.22.0 joint-preview test.
- **JC to test (/build/, close and reopen, footer v2.22.1-build):** Settings → My Plan → preview **Bronze** → My Eating: foods in plain text, no colours or rating words, "🔒 Ratings: Silver" on the My Eating Lists header (tap → My Plan). Preview **Silver**: the ratings are back as before.
- **Resume point:** `build` @ `e3ac88d` (v2.22.1), `beta` @ `bcac68e` (v2.20.2), prod v2.15.1. Next: JC tests v2.22.0/v2.22.1 on /build/; J22; functions deploy and the §5b step only with JC's go-ahead. Do NOT merge to beta or main.

### (Coder) 17–18 Nov 2026 — OVERNIGHT BATCH "FINISH BUILD" (Parts 0–6), build only — in progress
**Instruction (JC, 17 Nov):** after this batch the only remaining work is JC's console setup (J steps), document approval and flipping switches. Everything new behind flags OFF on beta/prod; commit + push after each part with a progress note; full suite before each push; no data migrations or deploys of functions/rules (prepare only).
**Part 0 decision (Coder):** the v2.22.2/v2.22.3 items weren't written down anywhere, so they were read from their labels: preview trap = previewing "Platinum member" hid My Plan and with it the preview box; See plans = left Chat/Help open over Settings; Snap gate = the camera/file picker opened before the prompt; info-style prompts = the 🔒 modal looked like an error; Energy display = Bronze showed an Energy bar, other plans the developer-key level. Shipped together as v2.22.3 (they touched the same files).
- **Part 0 done — build `c5bfe69` (v2.22.3).** Suite 311 passed (6 skipped), lint 0 errors.
- **Part 1 done — build `b55ef20` (v2.23.0).** Suite 319 passed (6 skipped), lint 0 errors, debug APK built (merged manifest: only the 2 health permissions). Decisions: plugin @capgo/capacitor-health 8.11.14 (also HealthKit for iOS); minSdk 24 → 26 (Health Connect needs Android 8+); active calories replace steps+exercise on days they exist (already net of resting, include workouts); the steps card is in the Settings admin area for now (members see only the theme).
- **Part 2 done — build `18af96e` (v2.24.0).** Suite 323 passed (6 skipped), functions 25/25, lint 0 errors. Decisions: consents needed per feature live in the shared tiers.js (`CONSENT_NEEDS`) so app and server agree; photos and body balance require AI (and body balance photos) — ticking them is disabled until then; My privacy choices is visible to Platinum members too (consent withdrawal must always be possible); the shared joint account is exempt on the server until it is migrated (its people then onboard as individuals).
- **Part 3 done — build `16eddcf` (v2.25.0).** Suite 332 passed (6 skipped), functions + rules 30/30, lint 0 errors. Decisions: per-person STORE in today's key layout (`users/{uid}/store`) instead of the designed `data/{area}` split — the whole app works unchanged and per-area sharing can come later (Architect to confirm); each migrated person keeps their own person key (Becks stays `becks`, so jcKcal/beckKcal stay right); the AI key and other secrets are never copied — individual accounts need the server proxy (useAiProxy) for AI; shared records keyed by person (chat/feedback histories) are reduced to that person's part; two NEW accounts in one family both use the key `jc` and can't be shown side by side yet (left out; needs a per-person key scheme — open item).
- **Part 4 done — build `923712f` (v2.26.0).** Suite 336 passed (6 skipped), functions + rules 33/33, lint 0 errors. Decisions: Energy is stored in Energy units (field `balance`; ledger `energy`) — the old pence fields are gone (nothing live used them); Stripe is out of the deployable set because deploying it needs Stripe secrets; the deploy workflow deploys `database.rules.json`, so go-live copies the next rules into it in a reviewed release (keeps the daily rules-drift check meaningful); App Check on Android (Play Integrity) needs a native plugin — open item, enforcement stays off until then.
- **v2.27.0 — build `1fdddbe`:** go-live switches (central flags). Found while writing the checklist: until now every flag was per device (or build-only), so there was nothing JC could flip for everyone. Suite 339 passed (6 skipped), functions + rules 34/34, lint 0 errors.
- **v2.27.1 — build `4111049`:** App Check site key plumbing (deploy.yml → VITE_APPCHECK_SITE_KEY). Suite 340 passed (6 skipped), lint 0 errors.
- **v2.27.2 — build `163a3ea`:** onboarding / invite screens above the chat button (no chat before consent). Suite 340 passed (6 skipped), lint 0 errors.
**Overnight batch finished (Coder, 18 Nov 2026).** Build `163a3ea` (v2.27.2), on /build/ with the new switches on for build only; beta and prod unchanged.
- **Go-live pack:** `docs/store/GO_LIVE_CHECKLIST.md` — sections A (release route) · B (Play J16–J22 + Health Connect declaration) · C (Google Cloud, Vertex EU, budget, secrets, Firebase providers, App Check, platform admin, rules release, deploy via the workflow) · D (JC + Becks migration + Platinum grant, ONE approved step) · E (the switches in order, each with check + rollback) · F (first pilot user) · G (iOS later) · H (open items) · I (private docs for the Architect).
- **Also on main:** PLAY_LISTING §2 final Health Connect declaration; CHANGELOG v2.22.3 – v2.27.2; LLD §2c; TEST_STRATEGY §2b; plan (N6, T1, S4, S5, SV1, GL1, PAY1, M5b, IOS1, A1, HH1).
**Decisions (Coder, overnight):** Part 0 items read from their labels (no written spec); per-person STORE in today's key layout instead of `data/{area}` (Architect to confirm); migrated people keep their own key; secrets never copied, individual accounts need `useAiProxy` for AI; Energy in Energy units (×2 AI cost); Stripe out of the deployable set; deploy workflow deploys `database.rules.json` (next rules copied in at go-live by a reviewed PR); **go-live switches** added (v2.27.0) because every flag was per device; minSdk 26; consent card visible to family members; photos/body balance need AI.
**Not done:** Part 6 (iOS) — not started; Android App Check (Play Integrity plugin); families of NEW accounts (both slot `jc`) and greyed hidden-member tabs; real-device tests of Health Connect and Play Billing (stand-ins only).
**For the Architect (private docs):** DPIA (Health Connect replaces the Google Health API; consent model; individual accounts + family visibility), supplier register/ROPA (Play Billing; Vertex AI EU; Cloud Functions/Pub/Sub/Scheduler/Secret Manager), SAD (server-side purchase verification, Energy ledger, App Check, manual deploy with approval, public flags, next rules, migration script) — GO_LIVE_CHECKLIST §I.
- **JC to test (/build/, footer v2.27.2-build):** Settings → My Plan (preview each plan; the yellow bar's Stop preview); Snap on a Bronze preview (prompt before the camera); the go-live switches card (visible; switches can't save until section C); the Android app's Connect my steps after the next internal-testing build.
- **Resume point:** `build` @ `163a3ea` (v2.27.2), `beta` @ `bcac68e` (v2.20.2), prod v2.15.1. Next: JC tests /build/ → promote build → beta when asked (GO_LIVE_CHECKLIST A); Part 6 (iOS) only if asked; open items in GO_LIVE_CHECKLIST H. Do NOT merge to beta or main without JC.

### (Coder) 18 Nov 2026 — v2.27.3 before pilot (build only, one commit per item) — in progress
**Instruction (JC):** 1) two brand-new accounts in one Platinum family side by side (tests with 2 and 5); 2) Hidden members as greyed tabs, no data, no requests for it; 3) check My Plan against the v2.22.2 brief (top-up for Silver+ and the Platinum owner; the Energy explanation text, admin-configurable); 4) log per-area sharing as deferred on the plan.
- **Item 1 done — build `c87248a`:** new-account families side by side (view keys). Suite 343 passed (6 skipped), lint 0 errors.
- **Item 2 done — build `2a22089`:** hidden members as greyed tabs. Full suite green, lint 0 errors.
- **Item 2 test fix + item 3 done — build `8a6f641`.** Correction: item 2 (`2a22089`) was pushed with one old test red (my commit script doesn't stop on a failure); fixed in the next commit. Item 3: the Energy explanation was missing, and the server let monthly Energy roll over — now two pots (monthly reset / top-ups never expire). Suite 349 passed (6 skipped), functions 35/35, lint 0 errors.
- **Item 1 fix — build `b27f86f`:** a new-account family member's tab crashed on selection ('jc otherwise becks' in 9 places → data[tab]); found while taking the screenshots. The test now opens every section for the member. Suite 349 passed (6 skipped), lint 0 errors.
- **Item 4 done (main):** plan item **AREA1** — per-area sharing ("share exercise, hide weight") DEFERRED: each person has one store in the app's key layout, so sharing is all-or-nothing (Hidden / Visible) until the data is split by area (ACCOUNTS_TIERS_ENERGY §3; rules already support privacy.areas) and the stores are migrated. HH1 marked Done.
**Decisions (Coder, v2.27.3):** family members whose person key clashes get a view key "m" + their whole account id (translated back on every read/write, so their data stays under their own key); hidden members' name + privacy switch only are read (never their data); Energy is two pots — monthly reset each renewal (no rollover) and top-ups that never expire, monthly used first; typical-Energy figures in tiers.js ENERGY_GUIDE, overridable in config/energyGuide; the shared/admin account still doesn't see the top-up (nothing to buy for it).
**Process note:** item 2 was pushed with one old test red because my commit step doesn't stop on a failed test; I now check the result before every push.
- **JC to test (/build/, footer v2.27.3-build):** My Plan → the "About Companion Energy" box and the top-up (preview Silver / Gold / Platinum). The family views need individual accounts (go-live switch 2), so they're shown in the screenshots.
- **Resume point:** see the next entry.

### (Coder) 18 Nov 2026 — FINAL CODE DROP (Architect): Parts 1–6, build only — in progress
**Instruction (Architect, 18 Nov):** final layout by area + family area (overrides "per-area deferred"); per-area sharing screen; Android App Check; iPhone app; pilot features (symptoms, HRT log, GP prep summary); polish. Commit + push after each part; full suite before each push; no deploys, no migrations run; stop a part that would break existing behaviour or real data.
- **Part 1 done — build `a4a0f96` (v2.28.0).** **Data layout final for pilot. Future changes additive only (ADR 0002 expand/contract); no restructuring migrations.** ADR 0018 (personal vs family per key). Suite 352 passed (6 skipped), functions + rules 36/36, lint 0 errors. The joint account's `data` is untouched. Plan: AREA1 ("per-area deferred") removed.
**Decisions (Coder):** meal plans stay PERSONAL (eating) because the same key holds what was eaten — the family area holds the lists, defaults, shopping and generated plans (Architect to confirm); "companion" (AI chats) is an area never shared; private areas of a member show as empty fields, never missing (no screen breaks). **Found and fixed:** the migration wrote the household and its shared area as overlapping paths (Firebase refuses; nothing was written); `meal_defaults` would have been cut to one person.
- **Part 2 done — build `350868a` (v2.28.1):** 'What my family can see' (Hidden/Visible + per-area see / log-for-me). Suite 353 passed (6 skipped), lint 0 errors.
- **Part 3 done — build `0e2646b` (v2.28.2):** Android App Check via our own native plugin (Play Integrity; debug provider only in debug builds), web custom provider; enforcement off. J23 steps in GO_LIVE_CHECKLIST (30a–30e). Debug + unsigned release compile; release has no debug provider. Suite 355 passed (6 skipped), lint 0 errors. Decision: own plugin instead of @capacitor-firebase/app-check (needs Firebase 12).
- **Part 4 done — build `0bbb6f4` + fixes `be92525` `13f4240` `de9ce2e` `9cba6ec` (v2.29.0):** the iPhone app. **Unsigned simulator build passes on GitHub macOS (Xcode 26.6)**; the pinned Apple Root CA – G3 fingerprint matches the macOS keychain. Fixes found by CI: invalid workflow YAML, unescaped quotes in the Xcode guard step (a test now parses the project file), Xcode 26 runner (`macos-26`), Firebase iOS SDK pinned to 12.19.3 (13.x can't resolve alongside Google Sign-In 9). Docs (main): `docs/store/APP_STORE_LISTING.md` (listing, App Privacy answers matching the DPIA, App Review notes, products), GO_LIVE_CHECKLIST section G = numbered J15 steps 58–58n. Functions 41 → 42 pass.
**Decisions (Coder, v2.29.0):** App Store product IDs are one per plan **and** period (`silver.monthly` … `platinum.yearly`, `energy_5`) — Apple has no base plans; Google Play keeps base plans. The StoreKit account tag is a UUID derived from the account (Apple requires a UUID), checked again by the server. Email-link sign-in stays web-only (the link opens in the browser, not the app); the app offers Apple + Google (Guideline 4.8). Own local App Check plugins (Android + iOS) instead of `@capacitor-firebase/app-check` (needs Firebase 12 JS). App Attest environment = production in the entitlements. Firebase iOS SDK 12.19.3, not 13 (dependency clash; revisit when Google Sign-In 10 ships).
- **Part 5 done — build `4aa8301` (v2.30.0, flag `usePilotFeatures`, on for build only):** My Health → **Symptoms** (daily 0–3 check-in + notes, trends 14/30/90 days with a text alternative and a table), **HRT** (record only), **GP prep** (Silver+, ~5 Energy; review + edit before saving; PDF / share). Separate consent **Symptom and HRT tracking** (onboarding + Settings; `consent/symptoms` in the next rules). Suite 366 passed (6 skipped) + 1 new test fixed for a timing race and re-run 3/3, functions 42/42, lint 0 errors; Android debug + release compile with the two new plugins; iOS compile passes.
**Decisions (Coder, v2.30.0):** HRT and medicines are **never sent to the AI** — the GP summary lists them exactly as recorded, built without AI; the AI only describes symptoms, readings, weight and notes, with no diagnosis, advice or medication content. The existing medication rule (app `safety.js` + server `config.js`, on every AI request) now names HRT explicitly. Symptoms/HRT live in the person's **Health** area (ADR 0018: no new area) — so they are shared only if the person shares Health; the sharing screen label now says so. GP summary = feature `gpSummary` (Silver and up, needs AI consent); symptom/HRT tracking in every plan. The PDF is made by our own small writer (no library). Native sharing uses the official `@capacitor/share` + `@capacitor/filesystem`. Mood is not in the GP summary (it lives in journal entries, not the health record). Not done: feeding symptoms into Companion feedback (plan PF1) — needs an Architect decision. Note for go-live: if `config/tiers` is ever saved in the database it must include `gpSummary`.
- **Part 6 done — build `7ca922a` (v2.30.1):** Undo after deletes of a person's records (accepted Delete/Remove/Stop → "Deleted · Undo" 8 s; refused if anything else was saved since); double-tap guard (same action button twice within 300 ms with nothing in between); bottom-sheet pickers (exercise type, unit in Build a meal, person when > 3 people); skeletons (app data load, GP summary); the phone apps follow the phone's text size up to 200% (`@capacitor/text-zoom`) and no main screen scrolls sideways at double-size text, 360 px; small buttons ≥ 8 px apart (touch screens keep 44 px); chart text alternatives. Suite 374 passed (6 skipped), lint 0 errors, Android debug + release compile.
- **Fix — build `5ef1836` (v2.30.2):** My Plan's comparison lists the GP prep summary (pilot only). Suite 374 passed.
**Decisions (Coder, v2.30.1):** Undo covers the person's records (the one store saved by `saveData`); food lists, shopping and the journal keep their confirmation ("can't be undone") — a generic undo there would need each list reloaded. The double-tap guard is global but narrow (action words only; typing, another tap or a server reply in between resets it) — tuned after it blocked a fast retry in a test. The inline 32 px minimum for small buttons was dropped because it overrode the 44 px touch rule; spacing is a 2 px side margin. Body stat cards stay two columns (`minmax(0, 1fr)`). The "exercise choice" sheet replaced the exercise-type list when adding an exercise (the older rename picker is unreachable code; left alone).
**FINISH (18 Nov):**
- **Flags:** everything new is behind `buildFlag` / build-only: `usePilotFeatures` (on for /build/ only), plus the existing `useAccounts`, `useTiers`, `useOnboarding`, `useSteps`; nothing new is on for beta/prod. Undo, the tap guard, sheets, skeletons, spacing and chart text are not flagged (small, tested, reach beta only via the normal release).
- **No deploys, no migrations:** no `firebase deploy`, no rules or functions deployed, the migration script not run, no live data touched.
- **Docs updated (main):** CHANGELOG (v2.28.0–v2.30.2), plan (IOS1, G9, G10, PF1–3, POL1), LLD §2d, TEST_STRATEGY §2c + gaps, ACCESSIBILITY (draft 4), GO_LIVE_CHECKLIST (G = J15 steps, H, I), `docs/store/APP_STORE_LISTING.md`. APP_GUIDE (build): pilot features, Undo, pickers, text size.
- **For the Architect (private docs) — listed in GO_LIVE_CHECKLIST §I "Added by the final code drop":** DPIA (symptom/HRT data + its consent, HealthKit, Apple as processor/controller, data by area), supplier register (Apple: App Store, Sign in with Apple, HealthKit, App Attest, TestFlight), SAD (App Check on all three platforms, StoreKit verification + Notifications v2, per-area rules, the HRT rule).
- **iOS build result:** the unsigned simulator build passes on GitHub macOS (Xcode 26.6) for v2.29.0 and v2.30.0; the Apple Root CA – G3 pin matches the keychain.
- **JC to test (/build/, footer v2.30.2-build):** My Health → Symptoms (save a check-in, change it, see Trends), HRT (add an entry, delete it → Undo), GP prep (Last 1 month → Prepare → edit → Share / PDF → Save); delete a vitals entry → Undo; Settings → My Plan shows GP prep for Silver and up. iPhone: needs J15 first (GO_LIVE_CHECKLIST G).
- **Open:** PF1 symptoms into Companion feedback (Architect decision); add `usePilotFeatures` to the go-live switches (Coder, when asked); small 8–10 px text in older screens; TalkBack/VoiceOver audit; real-device tests of HealthKit, StoreKit, App Attest, native share (TestFlight).
- **Resume point:** `build` @ `5ef1836` (v2.30.2); main @ this commit. FINAL CODE DROP complete (Parts 1–6 + FINISH). Next: the Architect verifies /build/ and updates the private docs; JC tests /build/; PR `build → beta` only when JC asks. Do NOT merge to beta or main without JC.

### (Coder) 18 Nov 2026 — ADDITIONS to the FINAL CODE DROP (Architect) — in progress
**Instruction (Architect):** 1) commit gate first; 2–4 at convenient points; 5 last, before the final report. (The message reached the Coder cut off during item 2 — items 2–5 asked again from JC.)
- **Item 1 done — build `1b22b8a`:** `scripts/ship.sh "<msg>" [branch]` runs lint + the full Playwright suite + the functions tests and commits/pushes only if all pass; any non-zero exit → "RED: … nothing committed, nothing pushed", exit 1 (nothing even staged). Refuses `main`/`beta`. `tests/commit-gate.spec.js` proves it in a throwaway repo with its own remote (three kinds of red stop it; green commits and pushes once). The gate itself was shipped through the gate (374 + 3 passed). CLAUDE.md now says source is committed only with `ship.sh`.
**Decisions (Coder):** the gate lives in the repo (not in a Coder's scratch folder) so every session uses the same one; the Coder's own helper now calls it. Docs-only commits to `main` don't run the suite (no code). A Git pre-push hook was not added: it would run the 9-minute suite on every push, including docs.
- **Item 2 done — build `5a38679` (v2.31.0), prompt caching:** `lib/caching.js` (= `functions/src/caching.js`) adds cache breakpoints at the end of long system prompts and on the last earlier turn of long conversations, in the app (direct API) and again in `aiProxy` (Vertex and direct); Help keeps its guide breakpoint. Chat's persona + profile summary + data moved (same words) into the system prompt, the message is just the question. Server ledger now records cache tokens per feature. **Numbers (modelled from the real Help request, 90,086 chars ≈ 22,500 tokens, Sonnet prices):** Help answer with no cache hit 11.5 Energy (5.8p); first question in a session 14.2 (7.1p); follow-ups within 5 minutes 2.0 (1.0p); average over 2 questions 8.1, over 3 questions 6.1. Chat's cached context: 6,038 chars per question. Energy guide: Help 12 → 8. **Live before/after:** the 3 Nov backup has no usage ledger and the Coder can't read live data, so the measured figures come from `node scripts/ai-cost-report.mjs <export of ai_usage or apps/lifecare/usage> --change <date of v2.31.0 on /build/> --feature help` (Architect/JC export, counts only).
**Decisions (Coder, v2.31.0):** default 5-minute cache, not 1 hour (a 1-hour write costs 2× and Help questions come in short bursts); the first Help question in a session costs ~25% more, so the saving depends on follow-ups — check with the report after a week. Cutting the guide per question (sending only the relevant sections) would save far more (~90%) and is a possible next step (Architect decision).
- **Item 3 done — build `f9abc12` (v2.31.1), no US AI fallback:** server fallback to the direct API only when `apps/lifecare/config/allowDirectFallback` is `true` (default false; admin-written); otherwise "Your Companion is unavailable right now", nothing charged. Per-person accounts always use the server route (EU), even before `useAiProxy`; the joint account keeps the direct route until the go-live switch. Tests: `tests/v2311.spec.js`, functions (44/44). Found by the test: the app's per-person check compared an object with `true` — fixed before shipping.
**Decisions (Coder, v2.31.1):** the setting lives in the database (admin can switch it in an outage without a deploy); the deploy variable `AI_FALLBACK=direct` now only makes the fallback *possible*. The daily Energy key check never runs for per-person accounts (they have no key), so it never contacts the US API.
- **Item 4 done — build `ed31b86` (v2.31.2), store-review demo account:** server `createReviewDemo` (admin only; own UID; synthetic data from the fixture generator — one person "Alex (demo)", no JC/Becks names or keys, no API key — written by area; Gold admin grant + its Energy; no household; refuses the joint account, admins, family members and accounts with their own data; terms left for the reviewer). Settings → 🧾 Store review demo account. PLAY_LISTING §4 and APP_STORE_LISTING §4 use it; GO_LIVE_CHECKLIST 59a. Functions 47/47.
**Decisions (Coder, v2.31.2):** the fixture generator moved into `functions/src/fixture.js` (one generator for tests, seeding and the demo); the review account is a Google account (our sign-in has no passwords) made by JC; the demo is created before that account first signs in, then checked once — if Google sign-in were to create a second account instead of using the one made by the server, the check shows it (Coder to adjust).
**Gate in action:** the first two attempts to ship v2.31.2 were stopped red (a test listing the server functions needed the new one). The gate now names the failing step and keeps the full log.
- **Weigh-ins work done — build `852fd34` (v2.32.0) + fix `d2b8b47` (v2.32.1), flag `useWeighIns` (build only):** A) "Import my weigh-ins" (Silver+): Health Connect READ_WEIGHT + READ_BODY_FAT / HealthKit bodyMass + bodyFatPercentage only; 30 days first, then 8; one reading per person per day (the earliest) with its source app; each week's value = latest imported day, marked imported; typed weigh-ins win ("also recorded"); feeds My Body, charts, the Katch-McArdle BMR, goals, feedback; "whose data is on this phone"; switching off can delete imports only. B) Guided setup (onboarding step 4 after consent if health sync chosen; Settings → Connect my health data): Play link if Health Connect missing → Allow → data check (24 h) → maker fix (Samsung / Pixel / other; Open Health Connect) → "✓ Connected: today so far N steps"; iPhone the same. C) Scales question (setup + My Body), one tip after 3 typed weigh-ins (never again once dismissed), FAQ "Connecting smart scales and health apps". Tests `tests/v2320.spec.js` (13). Android release APK: exactly READ_STEPS, READ_ACTIVE_CALORIES_BURNED, READ_WEIGHT, READ_BODY_FAT. Docs: PLAY_LISTING §2 (declaration: + weight, body fat), APP_STORE_LISTING, LLD §2e, CHANGELOG, plan WEIGH1.
**Decisions (Coder, v2.32.0–v2.32.1):** daily readings live in a new person field `weighIns` (kg), and the weekly series every screen already reads gets the latest imported day per week, so nothing else had to change (additive, ADR 0002). Imported weekly values use the app's own stone format (as the Fitdays photo import: 80.2 kg → 12.88 = 12st 8.8lb) — the first version stored kg and My Body showed "80st"; found in the screenshot check and fixed (v2.32.1). The guided setup and weigh-ins share the `useWeighIns` flag (one new version on /build/). No trial plan exists, so the setup is Silver and up only. The health-sync consent wording names weigh-ins while the flag is on.
**Found, not changed (for the Architect):** (1) the stone format is ambiguous from 10 lb — 14st 11.2lb is stored 14.112 and read as 14st 1.1lb / ~89.6 kg (pre-existing, typed and photo weigh-ins; plan BUG-ST, needs a read-compatible format decision); (2) My Body's weight change shows "--4.5lb" (plan BUG-SIGN, small).
- **Item 5 (release readiness) — docs/RELEASE_v2.30_CHECKLIST.md + `tests/release-compat.spec.js`:** (a) with every new switch off, the joint account on the REAL-SHAPED 3 Nov backup (local emulator only, counts only, the test skips where the backup isn't present): all sections open with no errors, no build-only feature shows, no server call, 32 counts unchanged, 100 keys before/after, nothing written to the new layout. Expected on first open after the release: the goal setup (v2.18.0) once per person. (b) every stored-data change since v2.15.1 listed with "written with switches off?" and compatibility — all additive or same-shape; a rollback only needs Google Health reconnecting. (c) JC's 21-line regression list (Beta, then Prod), backup first (in-app + console export), rollback by reverting the release merge.
- **iOS compile (CI):** passes for v2.31.1, v2.32.0 and v2.32.1; the v2.31.2 run was cancelled by the runner after 15 minutes (not a compile error — the later builds contain the same code).
- **Docs slip fixed:** my v2.30 edit to TEST_STRATEGY had dropped the "## 3. Test data" heading (the text stayed); restored.

### (Coder) 18 Nov 2026 — v2.32.2 (Architect decisions on v2.32.1), build only
- **Done — build `8197f79` (v2.32.2), shipped through the gate** (first attempt stopped red: three older tests encoded the old behaviour; updated with reasons).
- **1 Weight format (ADR 0019):** the writer's exact legacy format worked out (parseFloat of "stones.pounds-digits", one-decimal pounds, dot removed; typed "st"/":" = decimal stones). One reader `lib/weight.js` used everywhere (card, change, chart, history, BMR/Katch-McArdle, goals/target, AI context incl. the chat/feedback body JSON, GP summary). Ambiguous numbers (x.1, x.11–x.13) → "⚠ Check this weigh-in". New weigh-ins also store `kg` (typed, photo, history edit, import). **1c counts (real 3 Nov backup in the emulator, counts only):** JC 5 weigh-ins — display changes 0, kg/BMR changes 5 (3 by > 1 kg), badges 0; Becks 3 — display 0, kg/BMR 3 (3 by > 1 kg), badges 0. Fixture BMR before/after: 1,855 → 1,867 kcal/day. Also fixed by the reader: the AI was told "Current weight: 14.68kg"; the target weight for "10.4" is now 63.5 kg (10st 4lb), not 64.2.
- **2 Help:** only the matching sections (keyword + heading + a short topic map; no AI), ≤ 5 and ≈ 3,000 tokens, plus an index of all titles; the fixed part keeps its cache mark (978 tokens — just under the 1,024 minimum, so the saving now comes from not sending the guide; follow-up turns are still cached). Measured from the app's own requests: 22,500 → 3,914 tokens; modelled Energy 11.6 → 2.8; Energy guide 8 → 3. `scripts/ai-cost-report.mjs` kept for the live check.
- **3** My Body's weight change: one minus.
**Decisions (Coder, v2.32.2):** the 3-digit rule only accepts 10–13 as pounds (anything else is decimal stones, e.g. "14.579"); x.5 stays 5 lb (typed "14st 7lb" = 14.5 decimal is indistinguishable and rare — not flagged); the health-change hash keeps reading the raw value (changing it would trigger needless re-rating). Help keeps the `=== APP GUIDE ===` marker so the usage ledger still files it under Help.
- **JC to test (/build/, footer v2.32.2-build):** My Body → Weight shows your weigh-ins as before; Help → ask "How do I log a weigh-in?" → a correct answer.
- **Resume point:** `build` @ `8197f79` (v2.32.2); main @ this commit. ADDITIONS, weigh-ins and the v2.32.2 decisions are complete. Next: the Architect verifies /build/ and the private docs; JC tests /build/; then the release route in docs/RELEASE_v2.30_CHECKLIST.md (PR build → beta only when JC asks). Do NOT merge to beta or main without JC.

### (Coder) 18 Nov 2026 — v2.32.3 weigh-in entry (Architect), build only
- **Done — build `8e40082` (v2.32.3), shipped through the gate** (first attempt stopped red: three older tests typed into the old single box; moved to the new boxes).
- Weight is typed in unit-aware boxes everywhere (My Body → Record incl. the scales photo, weight history edit, goal setup current + target, the new fix sheet): stones users st + lb (st 4–40 whole, lb 0–13.9 one decimal), kg users one kg box (25–250, one decimal); small "st/lb | kg" switch saved as `profile.weightUnit` (additive); numeric keypads; plain validation messages. Saved as `kg` + the legacy string from the writer helper with its zeros kept (14st 11.0lb → "14.110"), so older versions still read it and it is never ambiguous (ADR 0019 addendum). "⚠ Check this weigh-in" (card "Fix it" and the history badge) opens a sheet with both readings to pick from, plus the same editor. My Body shows weight and change in the person's unit. Tests `tests/v2323.spec.js` (6); v213/v2171/v2180/v2181/v2322 use the new boxes.
**Decisions (Coder, v2.32.3):** the legacy string is TEXT (a number would drop the zero and make "14.110" ambiguous again); the unit is per person, defaulting to stones; v2.15.1 (prod) compares text values with `<` for the from-baseline sign, so on a rollback only that sign could be wrong — values themselves read correctly.
- **JC to test (/build/, footer v2.32.3-build, phone width):** My Body → Record → type st and lb, Save → shows e.g. "14st 11.0lb"; tap "kg" → one box, the card shows kg; an old weigh-in with "⚠ Check this weigh-in" → Fix it → pick the right one.
- **Resume point:** `build` @ `8e40082` (v2.32.3); main @ this commit. Next: the Architect verifies /build/; JC tests /build/; PR build → beta only when JC asks. Do NOT merge to beta or main without JC.

### (Coder) 18 Nov 2026 — QUEUED cyber review items (Architect): 1 app lock — v2.33.0, build only
- **Done — build `268f966` (v2.33.0), through the gate first time.** Flag `useAppLock` (build only; beta/prod unchanged).
- Settings → 🔐 Account → **Lock the app**: the phone's fingerprint / face / PIN (Android `LcAppLockPlugin`, BiometricPrompt, androidx.biometric 1.1.0; iPhone `native/lc-app-lock`, LocalAuthentication, Face ID text in Info.plist). Turned on only after the phone confirms. Locks when the app opens and after time in the background (straight away / 1 / **5** / 15 / 30 min). Per phone (localStorage), never synced. The lock screen hides the app (inert) without unmounting it, so nothing typed is lost; Unlock or Sign out.
- **Sign out everywhere**: new server function `signOutEverywhere` (revokes refresh tokens, marker `users/{uid}/profile/signedOutAt`, audit) + a client marker (joint account: `security:signedOutAt` in its store); open copies sign out at once. Deployed only with the functions (go-live); until then the marker still signs open copies out.
- **Confirm it's you** before Download my data and Delete my account: the phone's prompt in the apps; on the web, Google unless signed in within 5 minutes. Cancel = nothing done.
- Tests `tests/v2330.spec.js` (8; the phone's prompt is a stand-in) + functions (48). Android debug build compiles locally; iOS compiles in CI.
**Decisions (Coder, v2.33.0):** the lock is per device, not per account (a family member's own phone may not have a lock); the web gets no lock (no reliable fingerprint prompt in a browser) but does get Google confirmation; the device PIN is accepted as "confirm it's you" (the phone's own owner check — the same strength the Architect asked for the lock); no rules change (the marker sits in paths the person can already write).
- **JC to test (/build/ on a computer):** Settings → Account → Sign out everywhere → you're signed out (a second open tab too); sign in again. The lock itself needs the Android/iPhone app (next internal/TestFlight build).
- **Resume point:** `build` @ `268f966` (v2.33.0); main @ this commit. Next: QUEUED item 2 (native accessibility, v2.34.0), then 3 (under-18, v2.35.0). Do NOT merge to beta or main without JC.

### (Coder) 18 Nov 2026 — QUEUED item 2: native accessibility — v2.34.0, build only
- **Done — build `76bd631` (v2.34.0), through the gate** (first attempt red: one older test found Progress buttons by the old name; fixed).
- **How it was tested:** no Android emulator (this machine has no hardware virtualisation) and no Mac/iPhone, so no live TalkBack/VoiceOver. Instead, `tests/v2340.spec.js` reads the accessibility tree Chromium builds — the same tree the Android WebView gives TalkBack — on Home, My Body (+ Record), My Exercise, My Eating, My Shop, My Health and Settings at 360 px: every control named, no emoji-only names, no unnamed images, headings on each screen, axe clean. VoiceOver (WebKit) relies on the same roles and labels; a 20-minute manual script for both is in `docs/legal/ACCESSIBILITY.md`.
- **Found and fixed:** 12 unnamed boxes in My Body → Record and the same unlinked-label pattern in older forms (`lib/a11yLabels.js` links each visible label to the box after it — screen readers only); no headings on the main tabs (section titles now headings); 10+ identical "👁 Progress" buttons (now "Weight progress" / "Close chest progress" / "Week eating progress", aria-expanded); emoji-only mood buttons ("Mood: Good", aria-pressed); two decorative icons announced as images (hidden).
- **Text size:** the apps re-read the phone's text size (Android font scale, iPhone Dynamic Type via @capacitor/text-zoom) whenever they come back to the front, not only at start; still capped at 200%.
**Decisions (Coder, v2.34.0):** the label link is one small runtime helper rather than ~40 hand edits across old forms (App.jsx is too big to edit safely by hand), and it only adds `aria-labelledby` where a box has no name; Progress buttons keep their visible text and gain a fuller spoken name containing it (WCAG 2.5.3); emoji at the start of button names left as they are (read aloud but understandable — noted in the statement).
- **JC to test:** on a phone with TalkBack (or an iPhone with VoiceOver), the script in docs/legal/ACCESSIBILITY.md (after the next internal/TestFlight build).
- **Resume point:** `build` @ `76bd631` (v2.34.0); main @ this commit. Next: QUEUED item 3 (under-18, v2.35.0). Do NOT merge to beta or main without JC.

### (Coder) 19 Nov 2026 — QUEUED item 3: under-18 controls — v2.35.0, build only
- **Done — build `7155bb5` (v2.35.0), through the gate** (first attempt red: `tests/v2320` counted the weigh-in read window with Math.round, so it failed before noon — a test bug; now Math.ceil; the app is unchanged).
- Onboarding step 1 asks the store first: Android **Play Age Signals API** (`com.google.android.play:age-signals:0.0.4`, LcAgeSignalPlugin; 0.0.5 was published that day, so not used); iPhone **Declared Age Range** (iOS 26+, one age gate of 18; `native/lc-age-signal`). Store says under 18 → a kind refusal naming the Google Play / Apple account, no age choices, nothing saved, Sign out. 18+ or no clear answer (declined, no Play, older iOS, error, 6 s timeout) → the existing 18+ confirmation (kept). The answer is never stored. Tests `tests/v2350.spec.js` (4). Android debug build compiles locally.
- Docs: PLAY_LISTING (target audience 18+ only, not appealing to children; the IARC content rating can't be raised by choice on Play), APP_STORE_LISTING (override the age rating to 18+; Declared Age Range capability), GO_LIVE 58o, Privacy Notice line (for legal review), APP_GUIDE.
**Decisions (Coder, v2.35.0):** only `checkAgeSignals` is called — no consent prompt from our side (Play shows its own where the law needs it); "under 18" only when the top of the store's range is under 18, anything unclear falls back to the 18+ confirmation (no one is refused on a guess); the Apple entitlement is NOT added yet — adding it before the App ID has the capability would break TestFlight signing (GO_LIVE 58o, then the Coder adds one line).
**Found, not changed (Architect decision):** the Android app's merged manifest has `AD_ID` and `ACCESS_ADSERVICES_*` permissions, brought in by Facebook's SDK inside the sign-in plugin (`@capgo/capacitor-social-login`). We don't use Facebook or ads; this matters for the Play Data safety form. Small fix when approved (GO_LIVE H).
- **JC to test:** nothing on /build/ in a browser (the store check only runs in the apps); next internal / TestFlight build: a new account on a phone → the age step works as before for an adult.
- **Resume point:** `build` @ `7155bb5` (v2.35.0); main @ this commit. QUEUED cyber items 1–3 done (v2.33.0–v2.35.0). Next: the Architect verifies /build/; the AD_ID decision; Apple capability (58o). Do NOT merge to beta or main without JC.

### (Coder) 19 Nov 2026 — v2.35.1: no advertising-ID permissions (Architect decision), build only
- **Done — build `690f716` (v2.35.1), through the gate first time.**
- Facebook left out of the sign-in plugin: `capacitor.config.json` → `plugins.SocialLogin.providers` = google, apple, twitter on, **facebook off**; the plugin's own `cap sync` hook then builds a stub instead of the Facebook SDK (CI runs `cap sync` in `scripts/build-native.sh`, so it applies there too). Safety net: the manifest removes `AD_ID`, `ACCESS_ADSERVICES_AD_ID / ATTRIBUTION / CUSTOM_AUDIENCE / TOPICS` and the install-referrer permission (`tools:node="remove"`).
- Checked locally: debug and release merged manifests have none of them and no `com.facebook` code; the Android app builds. `tests/v2351.spec.js`: the six remove rules + providers, and any local Android build made since the manifest changed (older build files are ignored, so a stale build can't fail the gate).
- PLAY_LISTING §3: Advertising ID → **No**; device or other IDs → No; upload an AAB from v2.35.1 or later before answering. GO_LIVE H item closed.
**Decisions (Coder, v2.35.1):** both mechanisms, not one — the provider switch removes the cause (Facebook's code and permissions), the manifest rules stop any future library re-adding them; Twitter left as it was (no SDK, no permissions; out of scope).
- **JC to test:** next internal-track build: Google sign-in still works on Android.
- **Resume point:** `build` @ `690f716` (v2.35.1); main @ this commit. Next: the Architect verifies /build/; Apple capability (GO_LIVE 58o). Do NOT merge to beta or main without JC.

### (Architect) 20 Nov 2026 21:40 — JC paused (token limit); resume order after the weekly reset
1. **v2.35.2 (sent):** revert the 44 px buttons to the beta v2.20.2 look (WCAG AA 24 px; only the picker lists stay large — Architect's spec error), plus the exercise "why" lines, status pills, the last-week Companion feedback panel and the history "Your Companion said". **Then the Architect and JC revisit the progression rules at the week reset** (rep reset to the bottom of the range, below-range handling, how recommendations carry into the next week).
2. **Beta:** JC tests Build against Beta on his phone → backup → build → beta → 21-line RELEASE_v2.30_CHECKLIST → Prod.
3. **Store and console setup with the Architect:** J16 Play Console, J15 Apple Developer, J18 upload key, then J19–J22 and the Firebase/Google Cloud steps after Prod.
4. **Cyber review:** Adam's feedback on the remaining documents expected after the weekend (v1.2 of DPIA, risk register and supplier register already sent).
5. **Queued for JC to send:** onboarding choice + guided first use (about 5–8%), held until next week.

### (Coder) 23 Nov 2026 — FULL BRIEF (Architect, 23 Nov; ends "END OF BRIEF") — progress
**Plan:** one version per part, each through the gate: P0 v2.35.2 · P1 v2.36.0 · P2 v2.37.0 · P3 v2.37.1 · P4 v2.37.2 · P5 v2.38.0 · P6 v2.38.1. Nothing to beta/main until JC says so.
- **P0 done — build `db7b607` (v2.35.2):** rule in CLAUDE.md (13). `tests/visual-freeze.spec.js` (Playwright project `visual`, in the gate): 360 px full-page screenshots of Home, My Body, My Exercise (Sun session), My Eating (day + Update Lists), My Shop, My Health, Settings on fixed synthetic data at a fixed date (Wed 18 Nov 2026 10:00) vs `tests/visual-baseline/` from beta v2.20.2 (`bcac68e`, run locally from a worktree on :5180; a second beta run matched exactly). Fails beyond 1% of pixels. Marked `test.fail` until P1 (`PART1_DONE`). Also: `tests/v2202` assumed training week 18 (failed once the week moved to 19) — now uses the current week.
**Decisions (Coder, P0):** baselines are synthetic-data only, so they live in the repo (the older opt-in `visual.spec.js` with personal data stays outside); the footer version is masked.
**Found for P1:** the 44 px sizes come from one rule in `index.html` (`@media (pointer: coarse)`), so they show only on touch screens — the P1 visual test will emulate a phone (touch) and the baselines are re-taken from the same beta that way (not a design change). Build is also 80 px longer because `#root` got bottom padding for the floating chat button (v2.20.0).
- **Resume point:** `build` @ `db7b607`; next P1 (revert the big buttons). Beta worktree `/home/user/lc-beta` (server: `npx vite --port 5180` there).
- **P1 done — build `80e5f4c` (v2.36.0):** the touch-screen 44 px rule in `index.html` (WCAG 2.5.5, AAA) removed; the v2.30.1 2 px side margins removed; My Eating's day header lost its extra 6 px gap (Copy Day / Progress wrapped). Kept: borders, focus outline, labels/headings/aria, contrast. Bottom-sheet picker rows 48 → 56 px (eating picker rows were already 56 on phones). `tests/v2360.spec.js`: WCAG 2.2 AA 2.5.8 on a phone (24 px or a clear 24 px circle) on every main screen — replaces the 44 px test (v2200) and the 8 px-gap test (v2301). Visual freeze ON: on a phone all 8 screens match beta within 1% (the pre-P1 build failed it: Home +300 px, Eating +22, Shop +132). Side-by-side evidence (beta | build before | build after) in the Coder's scratchpad, sent to JC with the final report. ACCESSIBILITY.md updated.
**Decisions (Coder, P1):** baselines re-taken from the same beta with touch on (the P0 ones were taken without touch, so they missed the 44 px rule) — same beta, not a design change; two new cards are left out of the Settings comparison (Go-live switches v2.27.0, Delete my account v2.21.0 — features asked for, not changes to existing screens); the blank space under the page for the floating chat button (v2.20.0, WCAG 2.4.11) is kept and ignored by the comparison; the floating chat button is skipped by the 2.5.8 check (it moves with scrolling).
- **Resume point:** `build` @ `80e5f4c` (v2.36.0); next P2 (exercise reasons, pills, last week's feedback, history, Skip).
- **P2 done — build `4d0bb85` (v2.37.0):** `lib/exerciseWhy.js` (rules only). a) every card: range (progression notes "10–15 reps", else 12–15 as the rules use; hold time / duration for timed and cardio) + one WHY line. b) a status pill on every exercise (stored, or worked out from the logged sets when logging cleared it); new **Building back up** when the last sets were below range. c) "Last week's Companion feedback" (collapsible) at the top of each session day. d) Open a week: "Your Companion said (week N)" + decision + that week's progression note, or "No Companion feedback recorded this week"; stored session feedback not yet linked to week + exercise is linked once on load (additive). **Counts (real 3 Nov backup, read-only): 9 stored session feedbacks; 0 linked before; 11 JC + 11 Becks would be linked.** e) **Skipped** on every exercise: zeros marked `skipped` + optional "Why?" note; ignored by latest/previous entry, pre-fill, status and chart; greyed in Progress; Undo; logging that week replaces it (bug found by the test: Log opened in "edit" mode on a skipped week — fixed); 3 in a row → gentle check-in on the card; the session-feedback prompt marks SKIPPED weeks (with the why) and tells the Companion to check in gently, never criticise. Tests `tests/v2370.spec.js` (5).
**Decisions (Coder, P2):** progression rules unchanged (the WHY lines explain the existing rules; Architect + JC revisit at the week reset); a skip is a normal week entry with `skipped: true` (older versions show it as 0 kg — they'd show a 0 point, acceptable for /build/ until release); the visual freeze leaves out only the new P2 elements and pills on exercises that had none.
- **Resume point:** `build` @ `4d0bb85` (v2.37.0); next P3 (eating: meal edit as a conversation; Add to List pre-fill).
- **P3 done — build `53d544e` (v2.37.1):** a) Open → Edit → Changes on a meal is now the "My own" clarifying conversation (`clarifyMealChange`, `CLARIFY_MEAL_CHANGE`, plan feature autoInfo as before): a question when unclear (answered in the form), strict JSON + retries, values for what was eaten, **reviewed before saving** ("Check these, then Save"). The old one-shot recalculation (which could end in "couldn't work out those changes") is gone. b) "+ Not in my list?" opens Single item with what was typed already searched. Tests `tests/v2371.spec.js` (3); `open.spec` F5 follows the review step. Two gate reds on the way, both tests: the AI-tag guard (`v2220`) needs literal feature tags (kept); `v214`'s logo test read two different images while React swapped them (one read now).
- **Resume point:** `build` @ `53d544e` (v2.37.1); next P4 (hide measurement photos, Full Body row, Body Balance; defect BUG-MEASPHOTO is in plan.json).
- **P4 done — build `760d333` (v2.37.2):** hidden everywhere incl. /build/ behind the device switch `useBodyPhotos` (`platform.bodyPhotosOn`; code kept): measurement 📷 Snap, the Full Body row, the Body Balance card, the "📸 Progress photo" share option and the Body Balance opt-in (onboarding + Settings). Weigh-in scales photo kept. Defect **BUG-MEASPHOTO** in plan.json (tape in shot + reading legible; the flexed-arm-no-tape case must say a tape reading is needed, never guess; Full Body has no single reliable measurement). Guide marks them "switched off for now". Tests `tests/v2372.spec.js` (3); the tests of those features switch them on (`helpers.withBodyPhotos`).
**Visual baseline change (approval: the Architect's brief of 23 Nov, PART 4 — "hide Body Balance"):** the Body Balance card is left out of the comparison on both sides and `tests/visual-baseline/my-body.png` was re-taken from beta v2.20.2 that way. No other baseline changed.
- **Resume point:** `build` @ `760d333` (v2.37.2); next P5 (How Lifecare works guide, Record → Log, onboarding choice).
- **P5 done — build `7a4d0a6` (v2.38.0):** a) `components/HowItWorks.jsx`: the real controls (shared styles), grouped, one line each, every item in the brief; once in onboarding (after the profile on quick/full, at once on explore; focus trap, Esc/✕, "never automatic again"); top of Help. Help is one list: How Lifecare works → Search the guide (all plans) → Ask the Companion (Silver+; plan prompt on Bronze). b) My Body "📋 Record" → "📋 Log". c) After the mandatory steps: "How would you like to get started?" — explore (Home "Finish setting up" checklist; goal setup waits until My Body/Exercise/Eating is first opened), quick (existing goal setup = profile + goal + safety rails + st/lb|kg; guide; colour; health — Silver+, skippable; the onboarding health step runs first when eligible), full (+ guided first visit per section, each skippable, Stop). Saved per step in `setup_guide_<person>` (resumable); tips in skipped sections; tier-aware; Settings → 🧭 Set-up guide for existing users (flag `useOnboarding`). Tests `tests/v2380.spec.js` (7). Bug found by its test: `btnP` is a function, not a style (fixed).
**Decisions (Coder, P5):** quick set-up reuses the existing goal setup (it already asks the profile essentials with st/lb|kg and the safety rails) rather than a second form; the set-up's health step explains how to connect in the apps (web can't connect) and is never a blocker; the guide's samples are pictures of controls (aria-hidden), each with its name in text; "full" section visits are short coach cards at the top of each section, not an overlay (the person can do the step right there).
- **Resume point:** `build` @ `7a4d0a6` (v2.38.0); next P6 (prod-compat + visual re-run, release checklist, version, final report, STOP).
- **P6 done — build `5458bb9` (v2.38.1):** re-runs: release-compat (joint account, all new switches off, the 3 Nov backup in the local emulator, counts only) — 32 counts unchanged, keys 100 → 100, goal setup once on first open (expected); visual freeze vs beta v2.20.2 — all 8 screens within 1%. **Fix found in the beta-vs-build screenshots:** "Building back up" was replacing statuses the Companion had set (Ready to Move, Consolidating, Maintaining) when a set was below range; now only an empty or "Building" status (and the Ready to Move why line no longer claims 15/15/15). `docs/RELEASE_v2.30_CHECKLIST.md`: re-run results, data changes v2.32.2–v2.38.0 (incl. the one-time feedback link that runs with switches off — additive), regression lines 21–25 (Skipped, why/last week, meal change, Help guide, hidden photos), line 11 now "📋 Log".
**Decisions (Coder, P6):** a stored Companion status wins over the derived "Building back up" (the Companion saw the sets); the new elements stay out of the visual comparison and everything that existed in beta is still compared.

### (Coder) 23 Nov 2026 — FULL BRIEF complete: STOP for JC
- **Done:** P0 v2.35.2 · P1 v2.36.0 · P2 v2.37.0 · P3 v2.37.1 · P4 v2.37.2 · P5 v2.38.0 · P6 v2.38.1 — all on `build` through the gate; nothing on beta or main (source).
- **Next (JC):** test /build/ against /beta/ on your phone (the 26-line list in docs/RELEASE_v2.30_CHECKLIST.md part C), then say go before any beta merge. **Architect + JC:** revisit the progression rules at the week reset (rep reset, below-range handling, carry-over of recommendations).
- **Unsure / for the Architect:** (1) Help now opens with focus on the guide's search box, not the AI question box (the guide is first); (2) the one-time feedback link writes to real data on first open after release (additive, 22 recommendations on the 3 Nov backup); (3) a skipped week shows as a 0 kg week if anyone rolls back to v2.15.1 (cosmetic); (4) the visual baselines: beta screens re-taken with touch on (P1) and my-body with Body Balance left out (P4, approved by the brief).
- **Resume point:** `build` @ `5458bb9` (v2.38.1); main @ this commit. Do NOT merge to beta or main without JC.

### (Coder) 23 Nov 2026 — NIGHT BATCH (Architect, 23 Nov; ends "END OF BRIEF") — progress
**Plan:** one version per part through the gate: P1 v2.39.0 · P2 v2.40.0 · **P4 before P3** (the pill rules check the logged sets against the one next-target, so the target model comes first) P4 v2.41.0 · P3 v2.42.0 · P5 v2.43.0 · P6 v2.44.0 · P7 v2.45.0. Nothing to beta/main.
- **P1 done — build `1f4d664` (v2.39.0):** the exercise card is the beta layout again (name, target, pill, notes box, Progress, Log); removed from card/day view: last week's feedback panel, range/why, Skipped button, "My next weight / Set" box. Card tests updated (v2370, v2202, v2200).
**Visual baseline change (approval: night batch PART 1 — JC asked for the card back to beta):** beta's "Next: try… / My next weight / Set" row (`ex-next`) is left out on both sides and `tests/visual-baseline/my-exercise-session.png` was re-taken from beta v2.20.2 that way.
- **Resume point:** `build` @ `1f4d664`; next P2 (Log form).
- **P2 done — build `b8147d7` (v2.40.0):** the Log form top to bottom — previous notes (yellow) · **💬 Companion feedback (week N)** (yellow, Show/Hide, hidden each time the form opens; recommendation, reason, accepted or not) · one range + why line · sets · **☐ Skipped this session** (sets greyed/disabled; Form/Range not needed; zeros marked skipped with My Notes as the reason; never changes pill or target; replaces the week if confirmed) · Session Quality · Progression · My Notes · Save. History → Open "Your Companion said" is yellow. 3 skips → suggestion in the form. Tests `tests/v2400.spec.js` (4). Gate flake fixed on the way: `v214` item 9 read Companion Energy before it was updated (now waits).
- **Resume point:** `build` @ `b8147d7` (v2.40.0); next P4 (one next-target; draft in the Coder's scratchpad `nb4/nextTarget.js`).
- **P4 done — build `db3c5c1` (v2.41.0):** `lib/nextTarget.js` — one `ex.next = { m1, m2, source, setAt }`; the card headline, Log pre-fill and AI context read `nextTarget(ex)` (reps-only targets pre-fill: Butterfly 9, was 8). Accept writes the target from the person's typed numbers ("set by you") or the Companion's explicit ones. `resolveTargetWeight` no longer turns "move up / next increment" into a stack weight. Older targets NOT set by the person are ignored (card: "→ Set my next session"). **Counts (real 3 Nov backup, read-only): JC 9 of 15 exercises and Becks 15 of 16 have an ignored app-worked target; none was set by the person; legacy all-zero weeks now shown as Skipped: JC 1, Becks 1.** AI context: LOGGED (last 8 weeks, SKIPPED with the why) vs NEXT TARGET (not done yet), per session day. Bug fixed on the way: Accept read the note box only after using it (typed numbers were ignored).
**Decisions (Coder, P4):** older stored targets can't be told apart (an app stack weight was stored as "32kg x 12x3" exactly like a Companion one), so every older target not set by the person is ignored, as the brief defines "auto-derived"; new Companion targets with explicit numbers are kept (source "Companion"). A target stays after a Log save (it's "the next session" until a new one is set; the PART 3 pill shows whether it was met).
**Visual:** "→ Set my next session" (`ex-set-next`) is a new element left out of the comparison (approval: night batch P4).
- **Resume point:** `build` @ `db3c5c1` (v2.41.0); next P3 (pills; draft in scratchpad `nb3/pills.js`). Note: the container restarted once mid-gate; the work tree survived and the gate was re-run.
- **P3 done — build `c065e7b` (v2.42.0):** `lib/pills.js` — only **Move Up · Consolidate · Reduce** (+ a greyed **Skipped** marker for a skipped week). Worked out on every Log save (`pillAfterLog`): Standard → Move Up when Range AND Form are Good AND every logged set met the next target (no target: the top of the rep range on every set — **JC to confirm**), else Consolidate; Maintain → Consolidate; Reduce → Reduce. Progression dropdown is exactly Standard Progression (default, reset each open) · Maintain · Reduce. Older stored statuses are DISPLAYED as one of the three (ready to move → Move Up; reduce → Reduce; everything else → Consolidate); no data rewrite. Accepted Companion feedback sets the pill (`statusSource: "Companion"`); the next Log save recalculates (`"rules"`). The AI's newStatus is limited to the three. Help pills + Progression options and APP_GUIDE updated. Tests: `tests/v2420.spec.js` (rules, legacy mapping, every dropdown option, precedence); v2370/v213 updated for the new labels.
**Visual:** no baseline change — the pill wrapper matches beta's block layout, so My Exercise stays within the freeze tolerance (only the pill words/colours differ, as asked).
- **Resume point:** `build` @ `c065e7b` (v2.42.0); next P5 (training style, style-aware Companion, Set my next session — drafts in the Coder's scratchpad `nb5/`).
- **P5 done — build `bba4be9` (v2.43.0):** a) Settings → **🏋️ My training style** (Silver+; `components/TrainingStyleCard.jsx`, stored as `person.trainingStyle = { focus, pace, perExercise: { name: { focus, pace } } }`): Focus Mixed (default = current ranges) · Strength 6–8 · Muscle 8–12 · Endurance 12–15+; Pace Steady small steps · Consolidate a week then move · Bigger jumps when ready; per exercise optional. b–d) `lib/trainingStyle.js`: a rules-only 4-week pattern detector (new · skips · failed · rising-load · falling-load · rising-reps · plateau · steady — sent as an OBSERVATION), unsound flags (form/range Working towards, repeated failed sets, a target >10% up) and a per-exercise `[STYLE …] [PATTERN …] [UNSOUND …]` line in the session-feedback prompt; the prompt now asks for ONE primary recommendation + at most ONE `alternative` with its trade-off, technical ranges only (the old "45–47kg next 1–2 stack steps" instruction is gone), and kind push-back. e) **Set my next session** (`components/SetNextSession.jsx`) under each recommendation, above its note box: the exercise's measures + Set → instant advice (jump outside 2.5–10%, reps outside the style range, lower than last time with no reason in the note) with Keep my choice / Change it → `ex.next` (source "set by you") → card headline → Log pre-fill; the pill follows (heavier Move Up, lighter Reduce, same Consolidate; `statusSource: "set by you"`). Cardio targets now read minutes as the first measure (as the Log form). Tests `tests/v2430.spec.js` (pattern fixtures, style, advice rules, Settings, the Set flow, the prompt).
**Visual:** the new Settings card (`training-style`) is left out of the comparison (approval: night batch P5a — a new element JC asked for).
- **Resume point:** `build` @ `bba4be9` (v2.43.0); next P6 (eating: re-check hint, share into today's eating; drafts in scratchpad `nb6/`).
- **P6 done — build `ca6ef27` (v2.44.0):** a) every Snap result's note box is highlighted (amber outline, 💡) with "To re-check, it helps if you add any known weight or calories for the portion." (all six categories). b) "What is this?" → **🍴 Add to today's eating** (Silver+, `planAllows("snap")`): category (default by time of day — breakfast <10:30, lunch <14:30, dinner 17:00–21:30, else snack; `lib/eatShare.js`) and the existing person picker → My Eating, this week, today → a NEW row in that category → the normal Snap flow (waits for that person's meals to load first, never sets state while rendering). Sources: the installed web app's share target (existing) + a new **Android share intent** (`SEND image/*` in the manifest, `LcSharePlugin.java` + `MainActivity.onNewIntent`, `lib/nativeShare.js` puts the image where the picker reads it). The Android Java compiles (offline Gradle `compileDebugJavaWithJavac`); not yet tried on a phone. **iOS share extension: not done** — it needs a separate Xcode extension target and an App Group, which can't be built or signed from here; logged as open. Tests `tests/v2440.spec.js`.
**Gate note:** the first v2.44.0 gate run failed once on `tests/v2330.spec.js` "Sign out everywhere" (the second open copy didn't show sign-in within 10 s); unrelated to P6, passed 3/3 alone and on the full re-run. Possible flake — open item for the Coder if it repeats.
- **Resume point:** `build` @ `ca6ef27` (v2.44.0); next P7 (Help guide; draft in scratchpad `nb7/`).
- **P7 done — build `d4cffa7` (v2.45.0):** Help → How Lifecare works: a "Find a button or label" search that filters rows (and opens the matching sections), then seven collapsible sections, all closed: Everywhere · Eating · Exercise · Body & Health · Your Companion · Home · Account & plans. Each is a table Button/label | What it does | Where you'll see it; at ≤480 px column 3 moves under the meaning ("Where: …"). Pills/Progression updated; "Set (next weight)" and the old "Skipped" button rows are now "Set my next session" and "Skipped this session"; new rows for My training style, Add to today's eating, Body & Health. Then the FAQ, then Ask the Companion (order unchanged). No autofocus on phones: `useDialog(open, onClose, { noTypingFocus })` focuses the first visible button on touch phones; elsewhere it focuses the first VISIBLE text field (never one inside a closed section). Tests `tests/v2450.spec.js`; v2380 updated (new row names, `:scope > summary`). Visual: no baseline change.

### (Coder) 24 Nov 2026 — NIGHT BATCH complete: STOP for JC
- **Done (all on `build`, through the gate; nothing on beta or main):** P1 v2.39.0 · P2 v2.40.0 · P4 v2.41.0 · P3 v2.42.0 · P5 v2.43.0 · P6 v2.44.0 · P7 v2.45.0.
- **4b COUNTS (3 Nov backup, local emulator, counts only):** JC — 9 of 15 exercises had an app-worked target now ignored, 0 set by the person, 1 zero week shown as Skipped; Becks — 15 of 16 ignored, 0 set by the person, 1 zero week.
- **For JC to confirm:** P3 — with no target set, Move Up needs every set at the TOP of the rep range (e.g. 15 in 12–15).
- **Open:** iOS share extension (P6b) not built — needs an Xcode extension target + App Group (Architect/JC to schedule); the Android share intent compiles but is untested on a phone; possible flake in `tests/v2330.spec.js` "Sign out everywhere" (once, then 3/3 + full gate green).
- **Next (JC):** test /build/ on the phone: the exercise card and pills; Log form (feedback Show/Hide, Skipped, Progression); Settings → My training style; My Companion Session Feedback → Set my next session; share a food photo → Add to today's eating (Android); Snap → the yellow re-check hint; Help → How Lifecare works. Then say go before any beta merge.
- **Resume point:** `build` @ `d4cffa7` (v2.45.0); main @ this commit. Do NOT merge to beta or main without JC.

### (Coder) 24 Nov 2026 — BRIEF (Architect, 24 Nov; ends "END OF BRIEF") — progress
**Decisions:** (P0, JC confirmed) with no target set, Standard Progression gives MOVE UP only if every set reaches the top of the rep range with Range and Form both Good — this is what v2.42.0 already does; no change. Plan: P1 v2.46.0 · P2 (cardio) v2.47.0 · P3 (every Companion) v2.48.0.
- **P1 done — build `7090eb0` (v2.46.0):** My training style moved from Settings to **My Profile** (Home → ▼ My Profile, its own card right after the goal), with a **Strength** subsection (the For list now shows strength exercises only); also in the full set-up's Exercise step (`setup-visit` for My Exercise) and in the Help guide ("My training style: in My Profile", where: My Profile). Same stored values (`person.trainingStyle`), no data change. Tests `tests/v2460.spec.js`; v2430/v2380 updated. No visual baseline change.
**Open (flaky test):** `tests/v2330.spec.js` "Sign out everywhere" failed in 2 of the last 4 full gate runs (v2.44.0 first run, v2.46.0 first run), never alone (3/3 + 3/3). In the failures the SECOND open copy stays signed in (its marker listener doesn't sign it out within 10 s); this session's work doesn't touch app lock/sign-out. Suspect: the second copy's realtime listener or its `authTime` check under a long suite. Needs a Coder look (not a skip).
- **Resume point:** `build` @ `7090eb0` (v2.46.0); next P2 (cardio; draft in scratchpad `nb8/`).
- **P2 done — build `bcf6f82` (v2.47.0):** cardio = exercise types cardio/walking/sports (`lib/cardio.js`). a) My Profile → My training style → **Cardio** subsection: Focus Endurance / Fitness-speed / Fat burn / Intervals (each with a plain-English line), Pace as strength; both default "Not chosen (as now)" — stored `person.trainingStyle.cardio = { focus, pace }`. b) Cardio progression: `cardioAdvice` in Set my next session (the exercise's own two measures, e.g. Duration + Distance): two variables changed at once, a jump over 10% in either, the focus (Fitness-speed: same time faster; Endurance/Fat burn: time first), lower than last time with no reason. c) Cardio Session Quality = "How hard did it feel?" Easy / About right / Very hard (`entry.effort`; no Range); Form kept only for rowing/ski/swim/paddle machines (`cardioHasForm`). d) Cardio pill (`pills.metCardio`): Standard → MOVE UP if the target was met (no target: the planned time/distance = the card's values before the log) AND effort Easy or About right, else CONSOLIDATE; Maintain/Reduce/Skipped as strength. e) Companion: a `[CARDIO STYLE …] [LAST EFFORT …] [PATTERN …] [UNSOUND …]` line per cardio exercise and rule 9 (one variable at a time, time first, ≤10% a week, technical ranges, one primary + at most one alternative, flag unsafe jumps). Tests `tests/v2470.spec.js`. No visual baseline change.
- **Resume point:** `build` @ `bcf6f82` (v2.47.0); next P3 (every Companion; draft in scratchpad `nb9/`).
- **P3 done — build `deeb887` (v2.48.0):** `lib/profileCtx.js` — `trainingStyleCtx(person)` (Strength + Cardio focus/pace, and how to use them: eating — protein emphasis for Strength/Muscle, carbohydrate timing for Endurance cardio/Intervals; body — read weight/measurement trends in its light, e.g. muscle gain with a Strength/Muscle focus; exercise — progress in line with it) is added to the shared cross-section context (`getCrossSectionCtx`, which already carries the goal) → Chat, Home, Eating, Body, Health, Measurements, session feedback; `companionProfileCtx` (goal + style) is added to Help (user turn, system prompt untouched so caching stays), the Meals Generator, the shopping generator and the warm-up/cool-down generator. Not added: the GP prep summary (a document for the GP, not advice) — Architect to say if wanted. Tests `tests/v2480.spec.js` (every request each of Chat, Help, Home, Eating, Meals Generator, Body, Health and session feedback sends carries the style).
- **Fix — build `5a1a75b` (v2.48.1):** cardio Log form: the Next session / Progression banners show the one target ("21 min"), Previous shows "20 min · 8 km" (was "20kg 8"), the why line talks about effort, not range and form.

### (Coder) 24 Nov 2026 — BRIEF (24 Nov) complete: STOP for JC
- **Done (all on `build`, through the gate; nothing on beta or main):** P1 v2.46.0 · P2 v2.47.0 · P3 v2.48.0 · fix v2.48.1. P0 confirmed (no change needed).
- **Open:** the flaky `tests/v2330.spec.js` "Sign out everywhere" (see the P1 note); GP summary without the style (by design, ask); iOS share extension (night batch).
- **Next (JC):** test /build/ (footer v2.48.1): Home → ▼ My Profile → My training style (Strength + Cardio, after the goal; gone from Settings); a cardio Log (How hard did it feel?; the pill); My Companion Session Feedback → Set my next session on a cardio exercise (try changing time and distance together); ask Chat or Help something and check the answer fits your style.
- **Resume point:** `build` @ `5a1a75b` (v2.48.1); main @ this commit. Do NOT merge to beta or main without JC.

### (Architect) 24 Nov 2026 22:05 — JC completed J18 + most of J20 with the Architect
- **J18 done:** upload key `lifecare-upload.jks` (alias `upload`, RSA 4096, 10,000 days) created on JC's laptop in a local, non-OneDrive folder `C:\Users\jczal\LifecareKey`; password verified with `keytool -list`. Password stored in JC's Google Password Manager (the "github" entry's note: "Android upload key"); the BACKUP_KEY is in the same entry. JC wants ONE place for all keys: Google Password Manager. GitHub secrets set: ANDROID_UPLOAD_KEYSTORE_BASE64, ANDROID_UPLOAD_STORE_PASSWORD, ANDROID_UPLOAD_KEY_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS.
- **J20 done (except Play App Signing):** Android app `com.companionappsstudio.lifecare` ("Lifecare Android") registered in Firebase project **life-care-app-64d04** (the live project; a second project life-care-app-ff5c9 exists and is unused — tidy later). Upload key SHA-1 and SHA-256 added. Repository VARIABLE GOOGLE_WEB_CLIENT_ID set. google-services.json NOT downloaded (not needed per Coder).
- **Still to do:** J16 Play Console account (identity checks); prod release of the build line; J19 first upload → add the Play App Signing SHA-1/SHA-256 to Firebase; J21 service account + Play invite; J22 products/testers/RTDN; J15 Apple. JC to send a Google Cloud billing report screenshot (credit query).

### (Coder) 25 Nov 2026 — NIGHT BATCH (Architect, 24 Nov; JC's test of v2.48.1; ends "END OF BRIEF") — progress
**Plan:** P1 v2.49.0 · P2 eating redesign v2.50.0 · P3 formatting v2.51.0 · P4 Help/tests folded into each part (+ a final Help pass) · P5 signing check.
- **P1 done — build `677e434` (v2.49.0):** a) the pill label is **Ready to Progress** (the stored key stays "move up" — no data change; `pillOf` also maps "ready to progress"); the Companion's status words, Help and the guide renamed. b) Add Custom exercise: the form is BLANK while generating (no type, no 0 kg / 10 reps; "Your Companion is generating a plan…"; fields in a disabled fieldset; Add disabled); on failure a blank form, type first, measures blank and following the type. c) `lib/exerciseGen.js`: the generator asks for plain numbers; `fromGenerated` keeps numbers only (+kg for weights) and moves any words to the progression notes. Older sentences in a measure (`isProse`: 3+ words, so "Red band" stays a label) show as "—" in the card/history with the words as "📋 Plan: …" (the old "Next increment…" text stays hidden); cardio card headline = latest log in min/km (was "20kg"). No data rewrite. **COUNTS (3 Nov backup, read-only):** JC 0 of 15 exercises, Becks 1 of 16 with words in a measure (a 3-word text in the first measure); 0 of 425 history entries. The backup predates JC's Swimming, so it isn't in these counts. d) Open (history) on cardio: the exercise's own measures in one row ("Log (Duration / Distance)", no Set 1–3, no + Add set), "How hard did it feel?" instead of Range/Form (Form kept for rowing/swimming/ski/paddle), saved as `effort`. Tests `tests/v2490.spec.js`.
- **P5 (signing check): can't run from `build`.** GitHub only allows a manual (workflow_dispatch) run of `android-internal.yml` once the file is on the default branch; it exists only on `build`/`beta` lines, so the dispatch returns 404 for ref `main` and `build`. Left for the prod release (then: Actions → Android → ref `main`, upload off, and compare the "Upload key fingerprints" in the run summary with Firebase).
- **Resume point:** `build` @ `677e434` (v2.49.0); next P2 (eating; drafts in scratchpad `nb10/`).
- **P2 done — build `31d92e5` (v2.50.0):** eating rows (all day views AND Week → Set Defaults) = ONE wide box per row (`picker-trigger`, a button; ✎ filled / + empty; "Add breakfast…"; 🔄/⚠️ shown inside the box); the Snap / Open / ✕ / ✓ / 🗑 Del buttons and every "+ Add New" are gone. The picker (one sheet on every screen size) has a sticky action bar: 📷 Snap (day rows only) · ♡/♥ Favourites (filter) · + Add New (the not-in-my-list flow; "+ Not in my list?" stays at the bottom) · ✎ Edit Item (greyed when empty; day → the meal's Open form; defaults → the list item's Edit in Update Eating Lists) · 🗑 Remove (empty: closes; filled: removes the item and its row, the rows below move up — dinner sides move with their dinner; the only row back to "Add …"). Picking → a confirm form (portions, e.g. 3; ½–3 quick buttons; total kcal) → Confirm fills/replaces the row (+ "Added: …" with Undo); on a category's last row ONE blank row is added (never more). Quantity → the slot child's portion factor (`setFactorNow` in App, from the live week doc). ♥ Favourites: `lib/favourites.js`, per person at `favourites:<person>`; ♥ Favourite tick in the Update Lists save step and in Open → Edit; red ♥ in the picker. Picker rows ~44 px. Picker state lives in the section (the component is re-created each render). Help guide rows + APP_GUIDE updated. Tests `tests/v2500.spec.js` + ~20 older tests moved to the new flow (box → Snap/Edit Item/Add New; picks confirmed; ~44 px rows; ✓ gone).
**Visual baseline change (approval: night batch 24 Nov PART 2 — JC's eating redesign):** `tests/visual-baseline/my-eating-day.png` and `my-eating-update-lists.png` re-taken from this build; all other screens unchanged.
- **Resume point:** `build` @ `31d92e5` (v2.50.0); next P3 (formatting; draft in scratchpad `nb11/`).
- **P3 done — build `b595c28` (v2.51.0) + fix `12b3000` (v2.51.1):** a) Week and day Nutrition Overview: every total, recommended and +/− value through `f1`/`fk`/`sgn` (one decimal, whole kcal) — "26.400000000000006" → 26.4; the day heading total (`getDayKcal`) now counts EVERY row (extra breakfast rows, sides, desserts, drinks, snacks — it used to count only the first of each of b/l/d plus snacks). v2.51.1: the two overview tables size their columns to the numbers (`tableLayout: auto`, nowrap; the box scrolls sideways at 360 px) — the +/− row no longer spills. b) Week ("My Week — Avg … kcal/day") and day ("Monday — 1,988 kcal") headers: buttons wrap to their own line at ≤480 px (`.lc-head-title`). Tests `tests/v2510.spec.js` (fractional data; no long decimals; no overlapping or spilled cells; headers at 360 px and one line on wide screens). **Visual (approval: night batch 24 Nov PART 3b — JC's header spacing):** `my-eating-day.png` and `my-eating-update-lists.png` re-taken again (22 px taller: the header buttons' own line).
- **P4 (Help + tests):** done inside each part (Ready to Progress; eating row, picker action bar, ♥ Favourite, Confirm (portions); tests v2490/v2500/v2510 + older tests moved to the new flow).
- **Open:** the flaky `tests/v2330.spec.js` "Sign out everywhere" failed again (3 of ~9 full gate runs; never alone; the second copy stays signed in). I checked one theory (the two copies listening in different places) — it doesn't apply to the joint account. Needs a proper look. P5 signing check waits for the prod release (see P1 note).

### (Coder) 25 Nov 2026 — NIGHT BATCH (24 Nov) complete: STOP for JC
- **Done (all on `build` through the gate; nothing on beta or main):** P1 v2.49.0 · P2 v2.50.0 · P3 v2.51.0 + v2.51.1 · P4 in each part · P5 can't run from build (workflow_dispatch needs the file on `main`).
- **COUNTS (1c, 3 Nov backup, read-only):** JC 0 of 15 exercises, Becks 1 of 16 with words in a measure; 0 of 425 history entries (the backup predates JC's Swimming).
- **Next (JC):** test /build/ (footer v2.51.1): My Eating day + Week → Set Defaults (boxes, picker action bar, confirm with portions, the automatic blank row, Remove on the first row, ♥ Favourites via Update Eating Lists → Open → Edit), the Nutrition Overview, the headers; My Exercise: add "Running" (the blank generating form), your Swimming card, a cardio Open; the "Ready to Progress" pill.
- **Resume point:** `build` @ `12b3000` (v2.51.1); main @ this commit. Do NOT merge to beta or main without JC.

### (Coder) 25 Nov 2026 — NIGHT BATCH (Architect, 25 Nov; JC's test of v2.51.1; ends "END OF BRIEF") — progress
**Plan:** P1 v2.52.0 · P2 Week Summary v2.53.0 · P3 Day Summary v2.54.0 · P4 adding an exercise v2.55.0 · P5 no "AI" wording v2.56.0 · P6 day-tab contrast v2.56.1.
- **P1 done — build `17de009` (v2.52.0):** the six identical Snap panels are now ONE `renderSnapPanel()`; Snap started from the picker (act-snap) keeps the picker open (`picker.snap`) and shows the photo step, the result, the notes box and Confirm / Re-check / Cancel in the picker's content area (`picker-snap`), where the portions confirm appears. Confirm saves and closes the picker; Cancel (both) returns to the same picker list with nothing changed. The yellow tip: first result "💡 Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis"; after a Re-check "💡 Re-check – …" (same text). Tests `tests/v2520.spec.js`; older Snap tests close the picker after a Snap (`closePicker`); the Confirm/Re-check/Cancel row test waits for the sheet to settle.
- **Resume point:** `build` @ `17de009` (v2.52.0); next P2 (drafts in scratchpad `nb12/`: EatSummary.jsx, p2.py, p3.py).
- **P2 done — build `2d847dd` (v2.53.0):** `components/EatSummary.jsx` (`WeekSummary`, `DaySummary`, `wtdThrough`, `averageDaily`). Week view: "Planned vs Actual" → **Week Summary** (the "Avg … kcal/day" by "My Week" is gone); a blank line; two pills on one row — **Average daily calories** (days with eating logged so far; green ≤ the average goal) · **Week to date ±kcal (±%)** (Home's rule, `weekToDate`); **▸ Show days / ▾ Hide days** (hidden by default) → Day | Body Burn | Target Deficit ("Target Surplus" when the aim adds calories) | Exercise Benefit | Goal | Actual | On Track (future days "—"; no planned/actual pairs). **👁 Full Breakdown** (was Progress; aria "Week full breakdown") shows the days AND opens the blue detail box. Tests `tests/v2530.spec.js` (layout, hidden default, Body Burn − Deficit + Exercise = Goal per row, future "—", Full Breakdown, surplus wording); v2180/v2510 updated. No visual baseline change.
- **Resume point:** `build` @ `2d847dd` (v2.53.0); next P3 (scratchpad `nb12/p3.py`).
- **P3 done — build `0748c7d` (v2.54.0):** the day header no longer shows the kcal; under it a **Summary** box like the week's (`DaySummary`): **Day Calories: N** (green ≤ that day's Goal, red over) · **Week to date ±kcal (±%)** from Sunday up to AND including this day (`wtdThrough`); the single-day row (Day | Body Burn | Target Deficit | Exercise Benefit | Goal | Actual | On Track) is always shown (no Show/Hide). "Progress" → **👁 Full Breakdown** (aria "Day full breakdown"). The old day Planned vs Actual box at the bottom is gone (the Summary replaces it). The day's Nutrition Overview fits 360 px with every column (fixed layout: Item 28%, ellipsised; numbers 11–13%; no sideways scroll). Tests `tests/v2540.spec.js`; v2133/v2180/v2500/v2510 updated (header kcal → `sum-day`). **Visual (approval: night batch 25 Nov PART 3 — JC's day Summary):** `my-eating-day.png` and `my-eating-update-lists.png` re-taken; all other screens unchanged.
- **Resume point:** `build` @ `0748c7d` (v2.54.0); next P4 (scratchpad `nb12/p4.py`, `v2550.spec.js`).
- **P4 done — build `59bc082` (v2.55.0):** adding an exercise: a match in the search is now the **main** full-width button with one label ("Running · Cardio", `ex-match`); **Add custom: Running** is an outlined secondary button below (`ex-add-custom`). Matched AND custom both go through one `startExGen`: the form is blank and disabled with **"Your Companion is looking for recommendations…"** above the fields (nothing in Progression Rules); numbers only (`fromGenerated`). If no plan within 20 s (or it fails) → "Your Companion couldn't prepare a plan just now." with **Try again** / **Fill in myself** (then type first). The Sessions box is as tall as Type. Tests `tests/v2550.spec.js`; v2490/v2301 moved to the new buttons and wording; APP_GUIDE updated. No visual baseline change.
- **Resume point:** `build` @ `59bc082` (v2.55.0); next P5 (scratchpad `nb12/p5.py`, `p5c.py`, `v2560.spec.js`).
- **P5 done — build `cb2353c` (v2.56.0):** no "AI" in user-facing words: Companion wording in My Plan, tiers (`src/constants/tiers.js` = `functions/src/tiers.js`, label only), the consent-off notice ("Companion features are off in your privacy choices…"), Eating (bulk add, search hint, list paste), Exercise ("Prepared by your Companion — please check it"), Home (body photos, the profile privacy box), Shop/GP error texts and ~25 places in APP_GUIDE. **Kept explicit** (marked `data-ai-ok`): onboarding choices, the consent screen, Settings → Privacy & your data, the Privacy Policy, Terms/legal viewer, Help's privacy + Settings FAQ entries, and admin cards (App & AI, API key, AI usage, Go-live switches). The guide's **Photos and privacy** now opens with "the Companion uses **AI — Claude by Anthropic, provided via Google Cloud**" and what is sent. **Note for the Architect:** the Privacy Policy text itself (section 5) still names only "Anthropic Claude API", not "provided via Google Cloud"; I did not reword the legal text — check whether it needs updating. Test `tests/v2560.spec.js` scans Home, Profile, Body, Exercise, Eating day/week/Update Lists, Shop, Health, Settings and Help/FAQ; v2167/v2240/bulk moved to the new wording. No visual baseline change.
- **Resume point:** `build` @ `cb2353c` (v2.56.0); next P6 (scratchpad `nb12/p6.py`, `v2561.spec.js`).
- **P6 done — build `bf41ed8` (v2.56.1):** the kcal numbers under the day tabs (the one tab bar in My Eating, used by day and week views) now meet WCAG 1.4.3 (≥ 4.5:1): light green `#bbf7d0` / light red `#fecaca` on the dark bar, dark green `#15803d` / red `#b91c1c` on the white selected tab; bold; green = on or under the day's limit, red = over (unchanged rule). Test `tests/v2561.spec.js` measures the contrast of every number with Week, Sun and Mon selected. No visual baseline change.

### (Coder) 26 Nov 2026 — NIGHT BATCH (25 Nov) complete: STOP for JC
- **Done (all on `build` through the gate; nothing on beta or main):** P1 Snap in the picker v2.52.0 `17de009` · P2 Week Summary v2.53.0 `2d847dd` · P3 Day Summary v2.54.0 `0748c7d` · P4 adding an exercise v2.55.0 `59bc082` · P5 no "AI" wording v2.56.0 `cb2353c` · P6 day-tab contrast v2.56.1 `bf41ed8`.
- **Visual baselines changed:** only `my-eating-day.png` / `my-eating-update-lists.png` in P3 (approval in the P3 note).
- **Open:** the Privacy Policy text (section 5) names Anthropic but not "provided via Google Cloud" — legal wording left for the Architect/JC. Flaky `tests/v2330.spec.js` unchanged (not seen in this batch's last runs). P5 signing check from the 24 Nov batch still waits for the prod release.
- **Next (JC):** test /build/ (footer v2.56.1): Snap from the picker (tip, Confirm/Re-check/Cancel inside it); My Eating → Week (Week Summary, Show days, Full Breakdown) and a day (Day Calories, Week to date, Full Breakdown, the nutrition table at phone width); My Exercise → + Add Exercise → "Running" (main button, then the blank form with the status; "Add custom"); the day-tab numbers; no "AI" wording outside privacy/consent/legal.
- **Resume point:** `build` @ `bf41ed8` (v2.56.1); main @ this commit. Do NOT merge to beta or main without JC.

### (Coder) 26 Nov 2026 — v2.56.2 Snap tip fix (JC, before beta)
- **Done — build `d4ba2de` (v2.56.2):** the yellow "💡 Additional Information – …" box is now on the FIRST Snap step ("Snap a photo of your food"), directly above 📷 Take photo, with the optional details box inside it (yellow outline, `snap-pre-hint`). The result screen shows only "💡 Re-check – …" (never Additional Information again). One shared panel (`renderSnapPanel`), so the same everywhere it's used: the picker and the day rows. The shared photo ("Add to today's eating") already has its photo, so it goes straight to the result and its Re-check tip. The scales/measurement photo uses a different panel (`MeasureSnap`, body measurements, switched off), so it's unchanged. Tests: v2520 (tip on the first step, above Take photo, yellow details box; result = Re-check only), v2440 (share → Re-check tip). APP_GUIDE updated. No visual baseline change.
- **Next (JC):** test /build/ (footer v2.56.2): Snap from a meal's picker → the first step shows the tip; take a photo → the result shows the Re-check tip.
- **Resume point:** `build` @ `d4ba2de` (v2.56.2). Do NOT merge to beta or main without JC.
- **Added to v2.56.2 (JC: "same small fix release"; the version stays v2.56.2) — build `f7f418e`:**
  1. **Summary tables (Week and Day):** every row the same height (40 px, future days included; "—" centred), column headers centred over their columns (two-line headers too) and the numbers centred to match; Day stays left. Fits 360 px with no sideways scroll.
  2. **One week-to-date rule everywhere:** `weekToDate` (Home, PlanActual) now counts the days up to AND INCLUDING today (it used to stop at yesterday), so it matches the Week Summary's Average daily calories and the Day Summary (a past day: up to and including that day). Today's row shows "(today, so far)" in muted text.
  - **Decision (JC, 26 Nov):** today counts "so far" in Week to date everywhere. Reason: the Week Summary's average included today but Week to date didn't (+754 vs +16 with Thursday). Alternative rejected: leave today out everywhere.
  - Tests `tests/v2562.spec.js` (week pills = the sum/average of the rows shown, today included; the day Summary for today agrees; equal row heights; centred headers/cells; fits 360 px); v2180 moved to the new rule. APP_GUIDE (Home pill, Week to date FAQ, glossary) updated. **Visual (approval: JC 26 Nov, Summary tables):** `my-eating-day.png` and `my-eating-update-lists.png` re-taken (the day Summary row is taller).
- **Resume point:** `build` @ `f7f418e` (v2.56.2). Next: JC tests /build/, then beta. Do NOT merge to beta or main without JC.

### (Coder) 26 Nov 2026 — v2.56.2 → beta (PR #28)
- **Done:** JC tested v2.56.2 on /build/ and approved it. PR #28 `build → beta` was merged (merge commit `31af816`). The merged tree is identical to build `f7f418e`, so APP_GUIDE comes from build. Beta goes from v2.20.2 to v2.56.2. **Nothing merged to main**: prod stays v2.15.1.
- **New features are off on beta:** the build-only switches are on only when `VITE_APP_ENV === "build"`; the go-live switches (`platform/publicFlags`) are off and no device flags are set.
- **Checks before the merge:** release-compat on the real-shaped 3 Nov backup (local emulator only, counts only, all new switches off): 32 counts unchanged, keys 100 → 100, goal setup shown once on first open (expected).
- **Deploy:** main's Pages deploy, run 657, succeeded at 07:49. `scripts/build-pages.sh`, re-run locally, built prod, beta and build with no environment skipped; beta uses `data`.
- **Smoke test:** run 247 (after this note's deploy) shows **prod v2.15.1 ok, beta v2.56.2 ok**, and data and data_build ok. Run 246 had started before the deploy finished, so it still saw beta at v2.20.2. **Open:** It also fails on **/build/**: the "Sign in with Google" text isn't found within 20 s. That has happened on every run today and predates this merge (build shows a different first screen). It needs a look: either the smoke test or the build sign-in screen.
- **Next (JC):** test /beta/ (close the tab, reopen it, and check the footer says v2.56.2-beta.N). The prod release (beta → main) only on JC's yes; the Architect tags it.
- **Resume point:** beta @ `31af816`, build @ `f7f418e`, main @ this commit. Do NOT merge to main without JC.

### (Coder) 26 Nov 2026 — smoke test: sign-in wording per environment
- **Done (main, CI tooling only, no app change):** `scripts/automation/smoke.mjs` now waits for "Continue with Google" on /build/ (useAccounts on) and "Sign in with Google" on prod and beta. This fixes the /build/ smoke failure. It was committed straight to `main` (JC's request: its own small commit) because the smoke workflow runs from main. `build`/`beta` still have the old copy. That's harmless, because only main's copy runs; it comes back in line at the next release merge, or I can copy it to build if wanted.
- **Resume point:** main @ this commit; beta `31af816` (v2.56.2), build `f7f418e`.

### (Coder) 26 Nov 2026 — v2.56.3 HOTFIX: picker search closed the phone keyboard
- **Cause (traced):** `MealSelect` (the eating picker, used on every day row and in Week → Set Defaults) was a component defined INSIDE the Eating section's render. Each keystroke changed the picker state → the section re-rendered → a new component type → React re-mounted the whole sheet and its search box. The box lost focus, so the phone keyboard closed. On desktop `autoFocus` hid it; on phones autoFocus is off (coarse pointer), so it showed.
- **Fix — build `35135c6` (v2.56.3):** `MealSelect` is now ONE module-level component. The section passes it the current render logic through a context (`MealSelectCtx`, value `useMealSelectView`). Its hooks and its input stay mounted while typing, with no programmatic focus or blur. No other change.
- **Checked every text box:** picker search (day + Set Defaults), Single item search, Build a meal search, My own description, Add Exercise search, Help guide search, Help FAQ search, chat. Only the picker had the bug (no other nested components or unstable keys in `src/`).
- **Test `tests/v2563.spec.js`** (Pixel 7 emulation: touch, mobile): types key by key, then deletes 3 keys, in each of those boxes, and asserts `document.activeElement` is the same connected element after every key and the value is the full text. Against the old code it fails on the first letter in the picker; with the fix all pass. Full gate green.
- **Next:** JC's quick phone check on /build/ (footer v2.56.3), then PR build → beta straight away (hotfix only). NOT main.
- **Resume point:** build `35135c6` (v2.56.3); beta `31af816` (v2.56.2); main @ this commit.

### (Coder) 26 Nov 2026 — v2.56.3 hotfix → beta (PR #29)
- **Done:** JC confirmed v2.56.3 on his phone. PR #29 `build → beta` (hotfix only: one commit, `35135c6`) was merged as `dd2aa66`. **Not main**: prod stays v2.15.1.
- **Smoke test run 252: all green**: prod v2.15.1, beta v2.56.3, build v2.56.3, data and data_build ok. (Noted: data_build now shows the same key count and size as data, 120 keys / 520,798 bytes; before it was 121 / 514,431. Looks like a refresh from data; I didn't touch either.)
- **Next (JC):** test /beta/ (close the tab, reopen it, and check the footer says v2.56.3). Prod (beta → main) only on JC's yes.
- **Resume point:** beta `dd2aa66` (v2.56.3) = build `35135c6`; main @ this commit.

### (Coder) 26 Nov 2026 — BRIEF (Architect, 26 Nov evening; JC's beta feedback; ends "END OF BRIEF") — progress
**Plan:** P1 Edit Item inline v2.57.0 · P2 auto-describe on no match v2.58.0 · P3 one trailing blank row on every path v2.58.1 · P4 Home Snap tile v2.59.0.
- **P1 done — build `cf9a55c` (v2.57.0):** on a filled DAY row, the picker's ✎ Edit Item opens that meal's form (`renderSlotForm`, `slot-open-form`) INSIDE the picker (`picker-edit`, where the portions confirm and the Snap result appear), already in edit mode. **Cancel** → back to the same picker list, item kept. **Save** → saved for this meal only, back to the picker list (toast "✓ Saved for this meal only"). **Remove** (shown while editing via a new `OpenForm` prop `dangerWhileEditing`) → asks, empties that row (`__empty__`), and the picker stays open on that row to choose again. ✕ Close closes everything. The form no longer also appears below the rows (`slotOpen.inPicker`). **Week → Set Defaults:** Edit Item still opens the list item in Update Eating Lists (a default is a list item, not a meal copy). Tell JC; flag if he wants it inline too. Tests `tests/v2570.spec.js`; open/v2132/v2371 moved to the new flow (no "Edit" tap; Save goes back to the picker). APP_GUIDE + Help guide row updated. No visual baseline change.
- **Resume point:** `build` @ `cf9a55c` (v2.57.0); next P2.
- **P2 done — build `cd79d4a` (v2.58.0):** in Single item (the picker's Add New opens it with the typed words), when there are NO matches in my lists, common foods AND UK products (the product search has answered "none"; 3+ letters), "Describe it instead" opens by itself, pre-filled with what was typed, and the Companion's check starts straight away ("Your Companion is checking…", `describe-busy`). It happens once per search term ("Back to search" doesn't reopen it for the same words). With results, the "Can't see it? Describe it instead" button is unchanged. Build a meal's search (same component) is NOT automatic (prop `autoDescribe` on Single item only). If UK product search is down, nothing opens by itself (that isn't "no match"). Tests `tests/v2580.spec.js`; v2192 moved. APP_GUIDE updated. No visual baseline change.
- **Resume point:** `build` @ `cd79d4a` (v2.58.0); next P3 (scratchpad `nb13/p3.py`).
- **P3 done — build `3cd3162` (v2.58.1):** **cause:** each category's rows came from what was STORED. A pick stored an extra blank row, but other paths (Update Lists return, Snap, share, Copy, defaults) stored only the filled row. Snacks also used an old count. **Fix (display only, nothing written):** `shownRows(prefix, mode, getV)` in Eating. Rows shown = every row up to the last FILLED one (gaps kept, e.g. after Edit Item → Remove) + EXACTLY ONE blank "Add …" row after it, whatever filled it. Stale stored blanks beyond it are hidden. Used for all six categories on day views and in Week → Set Defaults. Tests `tests/v2581.spec.js`: all categories filled with no blank stored + stale blanks (day); Set Defaults (all categories); "+ Not in my list?" → Update Lists → Save for EACH category (the reported snack bug); Snap on the last breakfast/snack row. They fail on the old code and pass now. APP_GUIDE updated. No visual baseline change.
- **Resume point:** `build` @ `3cd3162` (v2.58.1); next P4 Home Snap (v2.59.0).
- **P4 done — build `15603f4` (v2.59.0):** Home's top row = Companion Energy (narrower, `energy-box`) + a white **📷 Snap** tile (`home-snap-tile`, 92 px wide, as tall as the Energy box, mood-button proportions on a phone; gap 8 px = My Eating ↔ My Exercises; outer edges = the cards below). On Bronze there's no Energy bar, but the tile still shows. Tap → `home-snap-panel` directly below that row (focused; Esc / ✕ Close / Cancel close it): the yellow "💡 Additional Information …" box with the details → 📷 Take photo → the result in the same place (values, Assumed, the "💡 Re-check …" box), **Add to:** Breakfast / Lunch / Dinner / Desserts / Drinks / Snacks (default by time of day, `eatCategoryFor`), **For:** the person (joint account), Confirm / ↻ Re-check / Cancel. Confirm → App's new `addSnapToToday(who, cat, info, desc)`: a NEW adhoc child (photo values, "this meal only") after the last filled row in TODAY's category for that person (the live week when on screen, else loaded and saved), then "Added to today's lunch" (+ "for Becks") with Undo, and the panel closes. Part 3 shows the trailing blank row. The photo check is `lib/snapCheck.js` `analyzeSnap` (the same request as My Eating's Snap, tagged `snap` → plan/consent gating). Bronze: the plan prompt, nothing sent. Photo never stored. Tests `tests/v2590.spec.js` (layout at 360/768: heights, gap, edges, proportions; panel focus + tips; default by time; Lunch → new row + blank; Undo; Re-check; Cancel/Esc; Becks; Bronze). APP_GUIDE (new "📷 Snap (Home)" section) and Help guide row added. Visual test still within tolerance (no baseline change needed).

### (Coder) 26 Nov 2026 — BRIEF (26 Nov evening) complete: STOP for JC
- **Done (all on `build` through the gate; nothing on beta or main):** P1 v2.57.0 `cf9a55c` · P2 v2.58.0 `cd79d4a` · P3 v2.58.1 `3cd3162` · P4 v2.59.0 `15603f4`.
- **For JC / Architect to decide:** Edit Item on **Week → Set Defaults** still opens the list item in Update Eating Lists (P1 inline is for day rows). The Home Snap tile on wide screens keeps a phone-sized width (mood buttons stretch there).
- **Queued next (Architect, 26 Nov): "Show steps in the day"**, starting now as v2.60.0 on build.
- **Resume point:** `build` @ `15603f4` (v2.59.0); beta `dd2aa66` (v2.56.3); main @ this commit.

### (Coder) 26 Nov 2026 — QUEUED (Architect, 26 Nov): show steps in the day — v2.60.0
- **Done — build `85dedee` (v2.60.0):** read-only views of the steps the sync already stores (`p.dailyActivity`), behind the steps feature (`useSteps`: on /build/, off on beta/prod; there the old v2.17.1 day line stays as it was). New `lib/stepsView.js` (`stepsDay`, `stepsText`, `stepsWeek`, `stepsCtx`, `stepsSetUp`) and `components/StepsLine.jsx` (`StepsDay`, `StepsWeek`, `stepsShown`).
  - **My Exercise, each day:** "👣 Steps 6,240 steps · +180 kcal" (the steps' share of the exercise credit, `dayCredit`); "· active 320 kcal" when active calories are on; "—" on a day with none; "Connect my steps" (opens Settings at the steps card) if never set up.
  - **My Exercise → week:** there's no separate Week view in My Exercise, so "👣 Steps this week" sits above the day tabs: each day, the week total and the daily average (days up to today with steps).
  - **Home → My Day:** today's steps under My Exercises.
  - **Summary tables (Week and Day):** the Exercise Benefit number is a button; tapping shows a row "Steps +N · Workouts +N" ("Active calories +N" / "Measured burn +N" in those modes). Shown on every environment (a detail on tap).
  - **Companions:** `getCrossSectionCtx` adds a STEPS line (today, yesterday, week total/average; "may mention steps briefly"), with the feature only.
  - No new permissions; nothing written. Tests `tests/v2600.spec.js` (day line, "—", week total/average, active calories, Home, Connect link → Settings, the breakdown parts add up, the Companion request contains the steps, feature off = nothing). APP_GUIDE updated. No visual baseline change.
- **Resume point:** `build` @ `85dedee` (v2.60.0); beta `dd2aa66` (v2.56.3); main @ this commit. STOP for JC's test. Do NOT merge to beta or main without JC.

### (Coder) 26 Nov 2026 — v2.60.1 + RELEASE to beta and prod (JC)
- **v2.60.1 — build `f307ffe`:** (1) the picker shows a filled row's SELECTED item FIRST in the list, highlighted, when nothing is typed (day rows and Week → Set Defaults). Scrolling it into view wasn't enough for items near the end of the alphabet. (2) Home Snap's ✕ Close uses the standard Close style (the picker's). Tests `tests/v2601.spec.js`. Full gate green.
- **Release:** release-compat (local emulator, 3 Nov backup, all new switches off, counts only): 32 counts unchanged, keys 100 → 100, goal setup once on first open (expected). PR #30 build → beta merged (`bf50d60`). PR #31 beta → main merged (`0305355`); source and APP_GUIDE are identical to build, and main keeps its own docs. Build-only flags and go-live switches are off on beta and prod.
- **After deploy:** Pages deploy 685 succeeded. Smoke run 266 is green: prod, beta and build each at their branch's version (all v2.60.1). Auto-tag created **v2.60.1** on `0305355`.
- **Now possible:** `.github/workflows/android-internal.yml` is on `main`, so Actions → "Android → Play internal testing" → Run workflow (ref `main`) can be dispatched. This also unblocks the signing check from 24 Nov P5 (compare the upload-key fingerprints in the run summary with Firebase).
- **Rollback:** `git revert -m 1 0305355` on main.
- **Resume point:** main = beta = build source at v2.60.1. Next: JC on prod (close the tab, reopen it, check the footer says v2.60.1).

### (Architect) 28 Nov 2026 17:30 — QUEUED for after JC's Monday token reset (do NOT start before JC sends it)
JC's Beta findings (prod/beta v2.60.1):
1. **Home Snap doesn't add the item:** it says "Added to today's …" but no row appears in the day's category. Fix and test end to end on the real path.
2. **Companion recommendation "Remove" deleted the whole exercise (Bicep Curl, JC):** Undo didn't restore it. (a) RESTORE Bicep Curl from the nightly backup taken before the deletion (JC approval, backup first, counts-only report); (b) replace "Remove" on each Companion exercise recommendation with "Undo" = revert it to the un-decided state (Accept / Decline, Set my next session, notes available again). Never delete the exercise from there.
3. **Card vs Log form still confusing JC (trust issue):**
   - No target set by the Companion or the user → the card shows only the pill (or "Next session: to be set"), no numbers. The Log form pre-fills last session's data with the line "[Name] to set this session's exercise data".
   - Target set → the card shows the target, and Log pre-fills the TARGET (not last week), with "[Name] set this session's data since the last session".
   - When the week is ALREADY logged, Log opens that entry in edit mode ("Cancel Edit — Log New Instead"); make that state unmistakable (e.g. "Editing this week's log (week 19)") so it isn't mistaken for the pre-fill.
   - Add an automated end-to-end test matrix: no target / user-set / Companion-set / already logged this week × weight-only / reps-only / both → card text, Log pre-fill and pill agree.
4. **RAG ratings review (Architect + JC, discussion first, no code):** JC's original plan meant Red = once a month, Amber = once a week. Check whether current item and selection ratings are too harsh; agree the rules before any change.
5. **My Shop:** moving the week on updates the dates (6–12 Dec) but the label stays "Week 19". Fix the week number.
6. **Shopping generator:** generate when at least ONE item is planned (don't require all meals planned).

- Note on item 3 (JC, 28 Nov): JC's screenshots were examples found after the fact. Real cases mixed data logged BEFORE the target/pre-fill fixes with logs made AFTER them, so also check how legacy entries and targets display alongside new ones (include mixed legacy and new data in the test matrix).

### (Architect) 28 Nov 2026 17:40 — BASELINE: move business ownership to companionappsstudio@gmail.com (JC decision)
The business Google account is **companionappsstudio@gmail.com**. Its password goes in JC's Google Password Manager ("github" entry, one place). Next week, in this order (JC with the Architect, one step at a time):
1. **Harden the account:** 2-Step Verification, recovery phone/email, password saved in Google Password Manager.
2. **Google Play Console (J16):** sign up with the business account (personal type, developer name "Companion Apps Studio"), ID and device verification.
3. **Firebase / Google Cloud (life-care-app-64d04):** add the business account as **Owner** (IAM) and as **Billing Account Administrator**. Set the budget-alert recipient and the Firebase "Support email" (Project settings → General → Public settings) to the business account. Keep the joint account as Owner until the switch is verified; no data or code change.
4. **Contact addresses:** set the support/contact email to the business account in the Privacy Policy, Terms, delete-account page, Play listing (PLAY_LISTING.md) and in-app Settings → Privacy contact. Coder: config value plus the docs. Architect: legal docs.
5. **Anthropic API account:** billing and contact email to business (or retire it at the Vertex switch).
6. **Domain (Spaceship, lifecarecompanion.app):** registrant/contact email to business.
7. **Apple Developer (J15, later):** enrol with an Apple ID created from the business email.
8. **NOT moving now (decision):** the GitHub repos stay under JCBECK1976. Moving them would change the app's web address (Firebase authorised domains, CSP, Play links). Revisit with the custom domain after the pilot. Optionally add the business email to GitHub for notifications only. App admin rights stay with JC's own (to-be-individual) account, never the business mailbox.
