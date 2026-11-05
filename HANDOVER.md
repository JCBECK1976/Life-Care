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

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: v2.6.0 (5 November 2026) — Vite build, deployed by GitHub Actions. Test environments: `/Life-Care/beta/` (real data) and `/Life-Care/build/` (`data_build`)
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

