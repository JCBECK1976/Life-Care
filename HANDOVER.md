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

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: v1.374.2 (3 November 2026)
- **Status**: In daily use by JC and Beck for tracking exercise, nutrition, body composition, and health
- **File size**: ~860KB single HTML file (Babel compiles but approaching practical limits)

### Technology Stack
| Component | Technology |
|-----------|-----------|
| Frontend | React 18.2.0 (via CDN) |
| JSX Compilation | Babel 7.23.9 (in-browser) |
| Database | Firebase Realtime Database |
| Auth | Google Identity Services → Firebase Auth |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Hosting | GitHub Pages |
| Spreadsheet parsing | SheetJS 0.18.5 |
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
2. **File size limit** — Single file at ~860KB, Babel compilation on mobile increasingly slow
3. **Silent Firebase errors** — `sGet()`/`sSet()` swallow permission errors, app loads defaults instead of showing error
4. **GitHub PAT** — regenerated 3 Nov 2026 with **no expiry**; if it is ever exposed, delete it at github.com/settings/personal-access-tokens, make a new one and update the vault
5. **No error boundary** — A single JSX error causes blank screen (no graceful degradation)
6. **No automated tests** — All testing is manual via live deployment
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

#### Step 1: Vite Migration (FIRST TASK)
The single-file Babel architecture has hit its ceiling. Migrate to:
- **Vite** for build tooling
- **Component files** — split the 7500-line monolith into components
- **Local dev server** — test before deploying (eliminates blank-screen risk)
- **Proper bundling** — removes the ~340KB Babel mobile limit

This was attempted on Sep 19 2026 but reverted. Claude Code with local dev server testing makes this feasible.

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

### Deployment
```python
import urllib.request, base64, json
token = '<YOUR_GITHUB_PAT>'  # Store securely — never commit real tokens
url = 'https://api.github.com/repos/JCBECK1976/Life-Care/contents/index.html'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
# GET current SHA
req = urllib.request.Request(url, headers={'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Python'})
sha = json.loads(opener.open(req).read())['sha']
# PUT new content
with open('index.html','rb') as f: content = base64.b64encode(f.read()).decode()
payload = json.dumps({'message': 'v1.X.Y: description', 'content': content, 'sha': sha}).encode()
req2 = urllib.request.Request(url, data=payload, method='PUT', headers={'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Python'})
print('Deployed:', json.loads(opener.open(req2).read())['commit']['sha'][:7])
```

**CRITICAL**: Must use `urllib.request.ProxyHandler({})` to bypass session proxy for GitHub API calls.

### Babel Syntax Check (run before EVERY deploy)
```bash
# Extract JSX from index.html
python3 -c "
import re
with open('index.html', 'r') as f: content = f.read()
match = re.search(r'<script type=\"text/babel\">(.*?)</script>', content, re.DOTALL)
if match:
    with open('/tmp/test_script.jsx', 'w') as f: f.write(match.group(1))
"

# Compile with Babel to check for syntax errors
node -e "
const babel = require('@babel/core');
const fs = require('fs');
const code = fs.readFileSync('/tmp/test_script.jsx', 'utf8');
try {
  babel.transformSync(code, { presets: ['@babel/preset-react'], filename: 'test.jsx' });
  console.log('SUCCESS');
} catch(e) { console.log('ERROR:', e.message.substring(0, 500)); }
"
```

A Babel syntax error = **blank screen** in production. No error boundary exists.

### Scope Check (run before EVERY deploy, since v1.366.2)
Babel only checks syntax. It does **not** catch a function called from a place where it isn't defined — that shipped a dead Confirm button on 2 Nov 2026. This check walks the compiled tree and lists any identifier used where nothing defines it:

```javascript
// check.js — run with: NODE_PATH=./node_modules node check.js
const babel=require('@babel/core'),fs=require('fs'),traverse=require('@babel/traverse').default;
const html=fs.readFileSync('index.html','utf8');
const code=html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)[1];
const ast=babel.parseSync(code,{presets:['@babel/preset-react'],filename:'t.jsx'});
const known=new Set(Object.getOwnPropertyNames(globalThis).concat('window document React ReactDOM firebase XLSX navigator localStorage sessionStorage location alert confirm prompt FileReader Image Blob URL requestAnimationFrame getComputedStyle history screen Chart html2canvas jspdf google gapi Babel arguments undefined'.split(' ')));
const miss={};
traverse(ast,{ReferencedIdentifier(p){const n=p.node.name;if(p.isJSXIdentifier()&&/^[a-z]/.test(n))return;if(p.parentPath.isJSXMemberExpression())return;if(!p.scope.hasBinding(n)&&!known.has(n))(miss[n]=miss[n]||[]).push(p.node.loc.start.line);}});
console.log(Object.keys(miss).length?'SCOPE ERRORS: '+JSON.stringify(miss):'CHECKS PASS');
```
Abort the deploy if it reports anything. It also checks syntax, so it can replace the Babel step.

### Version Convention
- Feature/layout change: increment major sub → `v1.366.0`
- Bug fix: increment minor → `v1.365.1`
- Always update version in THREE places:
  1. Footer display text
  2. Button styles comment block near the top of the script
  3. Feedback email body (App Version in emailBody string)

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
- **HANDOVER.md is the project memory** (Chat = architect, Claude Code = builder). Read it in full once per session, then before each action read only the diff since your last read (`git diff <last-read-commit> HEAD -- HANDOVER.md`); after every action add a dated Session Log entry (what, version, commit, what to test, open items); record every design decision with its reason under "Decisions". Applies to both Chat and Code sessions. Every entry is labelled **(Chat)** or **(Code)**.
- **Chat sessions (architect):** don't read this whole file each chat. Fetch it in the workspace and print only what follows the last **(Chat)** entry (i.e. what Claude Code has done since). Read other sections only when a design discussion needs them.
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
| `index.html` | The entire application (single file) |
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

1. **Blank screen on syntax error** — No error boundary. One misplaced bracket = dead app for all users. Always Babel-check before deploy.
2. **Firebase silent failures** — `sGet`/`sSet` return null on error. App treats null as "no data" and loads defaults. Users see their data vanish without warning.
3. **Babel mobile limit** — File is at ~860KB. Vite migration is urgent for performance.
4. **PAT exposure** — the GitHub token has no expiry, so a leaked token works until deleted. Keep it in the vault only; never commit it.
5. **No rollback** — Deployment overwrites. The only rollback is git revert via GitHub.
6. **DEFAULT_DATA coupling** — The default data object serves as both a "safety net" when Firebase fails and as initial demo data. These two concerns need separating.
7. **State variable count** — The component has 100+ useState variables. Refactoring into context/reducers is needed for the Vite migration.
8. **AI cost** — Every feedback generation, food check, and guide generation calls the Anthropic API. The energy meter tracks this but costs can add up. Prompt optimisation needed for commercialisation.
9. **No offline support** — App requires both Firebase and internet. No service worker, no caching.
10. **Single-user assumption** — Many patterns assume max 2 users (JC/Beck person toggle). Multi-user needs a different approach.
11. **Section-scoped functions** — Big sections (e.g. `section === "meals"`) render inside an IIFE. Functions defined there are invisible to markup outside it (e.g. the global Review Item overlay near the end of the file). Either define at component level or publish on `window` each render (pattern: `window._confirmReviewItem`). The scope check catches this.
12. **Page messages behind modals** — `formMsg` renders at the top of the page; inside a fixed overlay the user never sees it. Render the message inside the panel too.
13. **AI output limits** — JSON responses cut off at `max_tokens` fail to parse. Check `stop_reason === "max_tokens"` and show a retry message; store errors under the same key the UI reads (`activeTab + "_" + day`), or the failure is invisible.
14. **Two user switches** — the top name tabs and the switch inside the exercise log both call `loadUserSettings(k)`. Any new per-user setting must be loaded there, not in the tab button.


---

## 7. Session Log — 2 November 2026 (v1.365.5 → v1.371.0) — (Chat)

### What went wrong before this session
The add-item flow had five patches (v1.365.1–5) that each failed. Every one targeted `handleApiError`. The real cause was elsewhere:

- **"Companion Energy Empty" was false.** The `window.fetch` override rejected every Anthropic request *before sending it* once the app's own spend estimate (`companion_energy` in Firebase, priced at a hardcoded $5 ceiling) passed 95%. Requests never left the browser, so response-side error handling could never fix it. A `400` ping also kept the depleted percentage, re-arming the gate on reload. **Fix (v1.366.1):** gate removed; the meter is display-only; Anthropic's own `credit balance` error is the only source of "Energy Empty".
- **Dead Confirm button.** The v1.366.0 rebuild moved the confirm logic into `confirmReviewItem`, defined inside the My Eating IIFE. The global overlay sits outside it, so Confirm threw a silent ReferenceError. Babel passed. **Fix (v1.366.2):** published as `window._confirmReviewItem`; scope check added to the deploy routine.
- **Stale values could be added.** If the recalculation reply had no parseable JSON, the code fell through and added the item with old numbers. Now throws and stays on the form.

### Add-item flow (current design)
- **Single item** (any entry point, inline or overlay): AI lookup → Review Item panel → user edits ingredients → Confirm. If ingredients changed: recalculate, show "values updated", buttons become **✓ Continue — Add** / **Edit Again**. Unchanged: adds immediately. Failure: error shown in panel, retry or cancel, never adds.
- **Bulk** (📋 Bulk in Update Eating Lists): paste items one per line or comma-separated, pick a category, **Upload Items**. AI calculates baseline nutrition and description; items auto-load with no per-item review; duplicates/unrecognised skipped with a count. User is told they can edit any item for accuracy.
- **Update Item** (✎ Update in Update Eating Lists): green panel under the item with name, nutrition, rating, description, type, ingredients. Same confirm → recalc → Continue — Save / Edit Again flow.
- Items now store `suitability` (description). Single-add items created before v1.368.0 have none.
- Entry points preserved: MealSelect `__add_new__` (Week defaults and day tabs), Update Eating Lists, camera, Open Food Facts search.

### Other changes
- Day tabs: 🗑 Del on first breakfast/lunch/dinner row sets the slot to `"__empty__"` (clears, keeps the box).
- Exercise log user switch now calls `loadUserSettings` (colour, mood, journal, meal tracking, wellbeing flags, feedback panels).
- Session feedback: `max_tokens` 1000 → 2500, cut-off detection, errors stored under `activeTab + "_" + day`.
- Exercises: `ex.stopped` / `ex.stoppedAt` fields. Stop applies to that day's entry only. Stopped exercises are hidden, listed under "Stopped Exercises (n)", view-only, excluded from session feedback, and blocked from logging (including dual logging).
- Floating ? button → white chat bubble icon; panel retitled "Chat with your Companion" and restyled as a conversation thread (user = `accentChatUser`, companion = `#334155`, reply box + Send at the bottom).

### Lessons for whoever picks this up
1. Find where the failure actually happens before patching. Five patches to the wrong function cost a day.
2. Babel passing proves nothing about runtime. Run the scope check.
3. Ship each change as its own version and deploy, so a bad one can be identified and reverted.

### Later the same night (v1.371.1 → v1.373.0)
- **v1.371.1** — remove-exercise bug fixed (removes by name; feedback positions don't match the day list because stopped exercises are excluded). Scope check now runs with no exclusions.
- **v1.372.0** — energy meter calibrated (see Critical Known Issues #8).
- **APP_GUIDE.md** — written from an extraction of every on-screen label, button, placeholder and message (929 strings) plus code checks of rules (RAG frequency, statuses, moods, setup tabs, admin-only areas).
- **v1.373.0 — ❓ Help.** A floating ? button (above 💬 Chat) opens "Help — using the app", styled like the feedback threads. `askHelp()` fetches `APP_GUIDE.md` once per session (`window._appGuide`), sends it as a **cached system prompt** (`cache_control: ephemeral`), with the last 6 exchanges and the current person and tab. Answers have markdown stripped (panel is plain text). History: Firebase `help_history` (per person, last 30). Tested end to end before release with three real questions: answers were accurate; first question in a session ≈ $0.04 (cache write of ~9.1k tokens), later ones ≈ $0.005 (cache read).

### Ready for migration
The add-item flow, energy meter, exercise stop/restart, Help and Chat are stable. Next: the Vite migration (Section 3, Step 1). The Admin API cost endpoint for a live energy balance belongs in the post-migration backend.

### (Chat) Decisions — 3 November 2026
- **Working model:** Claude in Chat (with JC) is the architect: scope, design decisions, briefs, checkpoint reviews. Claude Code (Opus 5.5) is the builder: code, tests, previews, deploys and docs. JC approves anything that goes live.
- **Project memory:** `HANDOVER.md` is the shared memory between Chat and Code sessions. Read in full once per session, then only the changes since the last read before each action (token saving); record after every action and decision (rule 9 in `MIGRATION_BRIEF.md`, to be copied into `CLAUDE.md`).
- **Companion Energy commercial model:** in-app energy packs via a payment provider, with server-side AI proxy and per-user ledger (Section 3, Step 6). Users see a percentage only.
- **Migration scope:** Step 1 (Vite) only, behaviour-identical; Steps 2–6 wait for JC's go-ahead.

### (Chat) Decisions — 3 November 2026 (continued)
- **Efficiency pass (Step 1b)** added after the Vite cutover. Baseline measured from Chat: 100 keys, ~198KB, no images; Firebase is free-tier at 2 users; AI is the real running cost.
- **Known risk recorded:** `saveData()` rewrites the whole `dashboard:data` blob (~59KB, both people) on every save, so two devices saving close together can lose updates. Fix via granular writes (Step 1b or Step 2/5).
- **Token rules for Claude Code:** never read `index.html` in full (~250k tokens); do mechanical moves with scripts; keep `CLAUDE.md` under ~60 lines.
- **PAT:** regenerated 3 Nov 2026 with **no expiry**; if it is ever exposed, delete it at github.com/settings/personal-access-tokens, make a new one and update the vault. Stored in the vault.

### (Chat) 3 November 2026 — access fixed, migration ready to start
- **GitHub access:** claude.ai was connected to the wrong GitHub account (JCBECK1976-Git). Reconnected as **JCBECK1976**, with the Claude GitHub App installed on Life-Care and vault. Verified from Chat (both visible, push allowed) and from a Claude Code test session (read vault at `67b927c`; pushed branch `ccr-3a01afa0-4xkg6h`, identical to `main` at `def9ce0`, no code changed).
- **Decisions:** source work goes on the `vite-migration` branch; `main` stays live until cutover (only `next/` preview builds go to `main` before then). Sessions log a **Resume point** in each (Code) entry so a fresh session can continue after time limits.
- **Next:** JC starts a fresh Claude Code session (Opus 5.5) after 12:00 on 3 Nov with the kickoff message; Claude Code begins at MIGRATION_BRIEF.md §3.0. Checkpoint (a) comes back to Chat for review.

### (Code) 3 Nov 2026 — Step 1 §3.0, checkpoint (a): partly done, 2 items blocked
- **Read:** HANDOVER.md in full at `33dd6cc`. No version shipped; live app unchanged at v1.374.2.
- **Done:** branch `vite-migration` created from `main` at `33dd6cc` and pushed. Baseline checks (HANDOVER §4) on `index.html`: Babel syntax check passes and the scope check reports CHECKS PASS, so the baseline is clean.
- **Blocked: tag.** `legacy-v1.374.2` exists locally (at `33dd6cc`), but this session's git connection disconnects on every tag push (branch pushes work). The REST API fallback with the vault PAT was refused by the session's permission system. Waiting for JC.
- **Blocked: PAT check (§3.0.4).** Not run, for the same reason (permission refusal, not a token rejection). Waiting for JC.
- **Blocked: Firebase backup (§3.0.2).** The session network policy refuses `life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app`. Not skipped: it waits until JC allows that host. Note: a backup saved in a cloud session is lost when the container is reclaimed, so JC also needs a copy he keeps.
- **Decision:** the backup is saved to `/home/user/firebase-backup/` (outside both repos, so it can never be committed). Reason: the brief says local only.
- **Resume point:** branch `vite-migration`, last commit = this entry. Next: (1) push the tag `legacy-v1.374.2` → `33dd6cc` (or create it on GitHub); (2) take the Firebase backup once the host is allowed; (3) run the PAT check; (4) report checkpoint (a) to JC. Do not start §3.1 until JC replies. Branch `ccr-3a01afa0-4xkg6h` is still there (ask JC before deleting it).

### (Chat) 3 Nov 2026 — checkpoint (a) review
- **Reviewed:** checkpoint (a). Rules were followed correctly (stopped when blocked, didn't skip the backup, logged a Resume point).
- **Done from Chat:** tag `legacy-v1.374.2` created on GitHub → `33dd6cc` (verified: index.html is v1.374.2). Full Firebase backup taken (100 keys, 201KB) and sent to JC to keep on his computer, not committed anywhere. PAT verified working from Chat today (both repos, push allowed), so the §3.0.4 PAT check is closed.
- **Decisions:**
  - **HANDOVER.md and the other docs live on `main` only.** Code commits doc updates (Session Log entries etc.) straight to `main` as doc-only commits, so Chat and Code always read one copy. Source code stays on `vite-migration`. (Code's checkpoint (a) entry was copied from the branch to `main` here.)
  - **Code sessions don't use the PAT** (their safety check blocks reading it). Anything needing it (tags, Pages settings, or other API-only GitHub actions) is done from Chat or by JC on request.
  - ~~Firebase must be reachable from Code~~ **Superseded (13:05):** see the next entry.
  - Old test branch `ccr-3a01afa0-4xkg6h`: JC to confirm deletion.
- **Watch at cutover (§3.7):** pushing `.github/workflows/*` may need the GitHub App's *workflows* permission. If the push is refused, Code reports it and Chat/JC adds the workflow file.
- **Resume point for Code:** checkpoint (a) is complete. Next: §3.1 (see the next entry).

### (Chat) 3 Nov 2026 13:05 — decision: Firebase emulator for development
- **Decision:** Code sessions never connect to the live Firebase. Development and Playwright tests run against the **Firebase Realtime Database Emulator** inside the session, seeded from JC's backup `lifecare_firebase_backup_2026-11-03.json` (attached by JC, kept outside the repo, never committed). This replaces the `data_dev` plan.
- **Why:** the Claude mobile app has no setting to allow the Firebase host for Code sessions, and the emulator is safer anyway: zero risk to live data and no network change needed. Confirmed from Anthropic's docs: cloud sessions include OpenJDK 21, and `storage.googleapis.com` (the emulator download) is allowed by default.
- **Live data is touched only** when JC tests the `next/` preview in his own browser.

### (Code) 3 Nov 2026 — Step 1 §3.1–3.3 stage 1, checkpoint (b): verbatim lift on preview
- **Read:** HANDOVER.md/brief diff to `99ea1bb`. Checkpoint (a) closed from Chat (tag, backup, PAT). Backup stored at `/home/user/firebase-backup/` (outside the repo, not committed).
- **Done (source, `vite-migration` @ `d4bcafd`):** Vite 5 + React 18.2.0, firebase 10.12.0 compat, xlsx 0.18.5. `src/App.jsx` = the Babel script body lifted **verbatim by script** (`scripts/lift-legacy.py`; byte-identical apart from 2 imports and `export default`). `src/lib/firebase.js` = same config plus a dev-only `useEmulator` (not in builds: checked). Firebase RTDB emulator (`firebase.json`, `npm run emulator`, `npm run seed`). ESLint (`no-undef`, `jsx-no-undef`, hooks rules): **0 errors**, 5 `exhaustive-deps` warnings in the untouched code. Playwright smoke tests (3) pass against the emulator with the Claude API mocked: loads with no errors, all 6 tabs for JC and Becks, APP_GUIDE.md served. `CLAUDE.md` added (47 lines, rule 9 word for word). Legacy single file kept as `public/legacy.html`.
- **Done (preview, `main` @ `996d8e0`):** build with base `/Life-Care/next/` committed to `next/` only; Pages deploy succeeded. Live `index.html` untouched, still v1.374.2.
- **JC to test:** https://jcbeck1976.github.io/Life-Care/next/ (uses **live** data). See the checkpoint (b) report.
- **Not yet:** the full §3.5 test list (add item, bulk, stop/restart, Help, Chat, energy %) and the error boundary (§3.4). They come with the split (checkpoint c).
- **Decisions:**
  - `APP_GUIDE.md` stays **once, at the repo root**; a small Vite plugin serves it in dev and copies it next to `index.html` in builds. Reason: docs are edited on `main`, and a second copy in `public/` would drift. Rejected: copying it into `public/` (as the brief first said).
  - Legacy file moved to `public/legacy.html` on the branch now (its §3.7 home), so Vite can use the root `index.html`. It's also served at `next/legacy.html`.
  - Seed script swaps the real Claude key for a placeholder in the emulator, so dev and tests can never spend AI credit.
  - Preview keeps the version text **v1.374.2** (verbatim). The single version constant and v1.375.0 come at cutover.
  - SheetJS is installed as the brief says but **not imported**: the app code never uses `XLSX` (only its old script tag did).
- **Note:** a local boot check of the *production* build briefly tried the live Firebase host (WebSocket slipped past the test block); the session network refused it, so no data was read or written. Production builds are no longer run in this session.
- **Open:** remote branch `ccr-3a01afa0-4xkg6h` can't be deleted from Code (git connection refuses ref deletes, like tags). Chat or JC to delete.
- **Resume point:** source branch `vite-migration` @ `d4bcafd`; preview `main` @ `996d8e0`; checkpoint (b) waiting for JC. Next after JC's OK: §3.3 stage 2 (split into files, one area per commit) + §3.4 error boundary + full §3.5 tests → checkpoint (c). Start the emulator first (`npm run emulator`, `npm run seed`).

### (Chat) 3 Nov 2026 13:30 — checkpoint (b) review
- **Verified from Chat** (this session can reach github.io and Firebase): `/Life-Care/next/` and `/next/APP_GUIDE.md` are served (200), and the bundle has no in-browser Babel. A headless real-data comparison of preview vs live, both people × all 6 tabs (12 views, read-only, nothing saved), found **0 content differences**. Preview loaded in 1.5s vs 71.6s for live in the same headless browser. No app errors in the preview; the only console error (a certificate error on one external resource) also appears on live and comes from the Chat sandbox's proxy. Screenshot check: Becks's theme and layout are correct.
- **Housekeeping:** old test branch `ccr-3a01afa0-4xkg6h` deleted from Chat. Branches now: `main`, `vite-migration`.
- **Decisions:**
  - **Accepted** Code's deviation: a single root `APP_GUIDE.md`, copied into the build (no second copy in `public/`). This must hold for the GitHub Actions build at cutover too.
  - **SheetJS (xlsx):** unused since the file import was removed. Code may drop the dependency during the stage 2 split (no behaviour change).
  - **Energy ping on every load** (1-token Claude call in `checkCompanionEnergy`): added to the Step 1b candidates.
  - Lint's 5 hook-dependency warnings: leave them as they are (behaviour-identical rule).
- **Status:** checkpoint (b) approved from Chat. Waiting on JC's own phone test of `/next/` before stage 2 (§3.3 split) starts.

### (Code) 3 Nov 2026 — Step 1 §3.3 stage 2 in progress: tests, constants, lib, components
- **Read:** HANDOVER diff to `be499f6` (checkpoint (b) approved; Chat decisions noted: root APP_GUIDE.md kept, SheetJS may go, hook warnings left).
- **Done (`vite-migration`):** `e78f5e2` full §3.5 Playwright list written **before** the split (11 tests, emulator re-seeded per test, AI and Open Food Facts mocked) plus an opt-in pixel check of 17 views (`VISUAL=1`; baseline images kept outside the repo at `/home/user/lc-visual-snapshots/`, as they show health data). `ecc0d3a` constants → `src/constants/`; `da54ee7` helpers → `src/lib/` (incl. `api.js`: fetch wrapper installed once at import); `18cde9a` top-level components → `src/components/`. Each move done by script; each commit: 0 lines lost/added, lint 0 errors, build ok, 11/11 tests, pixel-identical.
- **Decisions:** tests before the split (so every split commit is checked by the full list). Sections become real components that receive the Dashboard values they use as one `ctx` prop (none of them reassigns a Dashboard variable, so this is behaviour-identical); state management unchanged.
- **Resume point:** branch `vite-migration` @ `18cde9a`. Next: sections one per commit (overview, body, weights, hidden meds, meals, shop, bloods, admin, data), then overlays, then error boundary, drop SheetJS, rebuild `next/`. Start the emulator first (`npm run emulator`).

### (Code) 3 Nov 2026 — stage 2: Data + Settings sections
- **Done:** `98f7019` Data section → `src/sections/Data.jsx`; `8261905` Settings (admin) → `src/sections/Settings.jsx`. Checks green on each (lint 0 errors, build, 11/11 tests, pixel-identical).
- **Resume point:** `vite-migration` @ `8261905`. Next: bloods (Health), shop, body, overview (Home), weights (Exercise), hidden meds, meals (Eating); then overlays, error boundary, SheetJS, `next/`.

### (Code) 3 Nov 2026 — stage 2: Health, Shop, Body sections
- **Done:** `f662e11` Health (bloods) → `src/sections/Health.jsx`; `dc56332` Shop → `src/sections/Shop.jsx`; `bcfdeea` Body → `src/sections/Body.jsx`. Checks green on each.
- **Resume point:** `vite-migration` @ `bcfdeea`. Next: overview (Home), weights (Exercise), hidden meds, meals (Eating); then overlays, error boundary, SheetJS, `next/`.

### (Code) 3 Nov 2026 — stage 2: Home, Exercise, hidden meds, Eating sections
- **Done:** `1a8e989` Home → `src/sections/Home.jsx`; `de52934` Exercise → `src/sections/Exercise.jsx`; `ae2637a` hidden meds block (never shown) → `src/sections/HiddenMeds.jsx`; `fb32e66` Eating → `src/sections/Eating.jsx` (its own try/catch and `MealSelect` kept inside it unchanged; `window._confirmReviewItem` still published from it). Checks green on each.
- **Resume point:** `vite-migration` @ `fb32e66`. All sections are components. Next: overlays/footer (privacy, help, chat, review item) → components, then error boundary, SheetJS, `next/`.

### (Code) 3 Nov 2026 — stage 2: overlays and footer pieces
- **Done:** `b285bae` ReviewItemOverlay, ChatPanel, HelpPanel → `src/components/`; `3cfd3cf` PrivacyPolicy, FeedbackForm → `src/components/`. Checks green on each.
- **Mistake caught and reverted:** first overlay attempt `63c7df8` used stale line numbers, so Chat/Help became empty wrappers in front of the original code (tests still passed because the original code stayed). Reverted in `ad6d500` and redone by matching content; the commit script now refuses an empty `ctx`.
- **Resume point:** `vite-migration` @ `3cfd3cf`. Split complete. Next: §3.4 error boundary, drop SheetJS, rebuild `next/`, checkpoint (c).

### (Code) 3 Nov 2026 — checkpoint (c): split complete on preview, all tests passing
- **Done (`vite-migration` @ `69f17eb`):** `d3c1410` §3.4 error boundary around each section, each overlay and the whole app (message: "Something went wrong in this section — your data is safe. Reload to try again."; error logged to console; tested by a dev-only crash switch that is not in builds). `69f17eb` SheetJS dependency dropped (Chat-approved).
- **Layout now:** `src/App.jsx` (2.1k lines: state, handlers, header, nav, person tabs, footer shell) · `src/sections/` Home, Body, Exercise, Eating, Shop, Health, Settings, Data, HiddenMeds · `src/components/` charts, exercise, LoadingBtn, ReviewItemOverlay, HelpPanel, ChatPanel, PrivacyPolicy, FeedbackForm, ErrorBoundary · `src/lib/` firebase, storage, api, aiContext, colour, exercise, utils · `src/constants/` tone, mood, themes, defaultData, food, exercise, health, styles.
- **Proof of no change:** against the verbatim lift `d4bcafd`, the only lines changed are the 12 section-wrapper lines (now component wrappers); everything else is component headers, `ctx` lists and boundary call sites. Lint 0 errors (5 known warnings), build ok, **13/13 Playwright tests** (full §3.5 list + error boundary), 17 views pixel-identical to the verbatim lift.
- **Preview (`main` @ `21fc86a`):** `next/` rebuilt from `69f17eb`. Live `index.html` untouched, still v1.374.2.
- **JC / Chat to test:** https://jcbeck1976.github.io/Life-Care/next/ (live data). Same real-data comparison as (b), plus the add-item, bulk, ✎ Update, Stop/Restart, Help and Chat flows.
- **Decisions:**
  - Sections and overlays receive the Dashboard values they use as one `ctx` prop (none reassigns a Dashboard variable). State management unchanged, as the brief says.
  - **Kept as they are (behaviour-identical):** `MealSelect` stays inside the Eating section (it's created per render there; moving it out would change when it remounts); `renderThread` stays a Dashboard function; `window._confirmReviewItem` kept (works, and the brief says remove a `window.*` workaround only once a replacement is proven; the overlay and Eating are now separate files, so a shared handler would be a state change). Alternatives rejected for this step: lifting them out now.
  - Version text still in 4 places (`App.jsx` header comment and footer, `FeedbackForm.jsx` email body, `constants/styles.js` comment): the single constant comes with v1.375.0 at cutover.
- **Open (not fixed, for JC):** unused code found: `ExTable`, `StrengthBanner`, `LoadingBtn`, `PBar`, `RC`, `SNACK_TEMPLATES`, `DAY_TYPE`, `DEFAULT_OTHER_GB`, `JC_BASE`, `BECK_BASE`; the hidden meds block is never shown. Eating keeps its own old try/catch inside the new boundary.
- **Resume point:** source `vite-migration` @ `69f17eb`; preview `main` @ `21fc86a`; **waiting for JC's checkpoint (c) approval. Do not start §3.7 cutover.** Visual baseline images: `/home/user/lc-visual-snapshots/` (outside the repo; regenerate from `d4bcafd` if the container was reset).

### (Chat) 3 Nov 2026 23:10 — checkpoint (c) review
- **Verified from Chat on real data** (read-only, nothing saved, no AI calls sent): preview `/next/` (`assets/index-ZaYR427j.js`) vs live. Both people × 6 tabs = 12 views, **0 differences**. Help, Chat, Privacy Policy, Send Feedback and Settings all open with the same content as live. The Help panel shows JC's real history (so the split overlays are wired correctly; Code's earlier empty-shell slip is confirmed fixed). The error-boundary message appears nowhere. Load: preview 1.8s vs live 68.5s (headless). The live root is unchanged (v1.374.2).
- **Assessment:** checkpoint (c) approved from Chat. Good practice noted: the mistake was reverted in the open and a guard added; unused code was listed, not deleted.
- **Decisions:**
  - Removing unused code (`ExTable`, `StrengthBanner`, `LoadingBtn`, `PBar`, `RC`, `SNACK_TEMPLATES`, `DAY_TYPE`, `DEFAULT_OTHER_GB`, `JC_BASE`, `BECK_BASE`, hidden meds block) is its own small version **after** cutover, not part of it.
  - `MealSelect` rebuild and `window._confirmReviewItem` stay as-is until after cutover.
- **Cutover watch-points (§3.7):**
  - **Zero downtime.** Code must sequence the merge, the workflow file and JC's Pages-source switch so the live site never goes blank, and tell JC the exact moment to flip.
  - **The workflow file needs "Workflows" permission.** Neither the Claude GitHub App connection nor JC's PAT (Contents-only) is known to have it. If Code's push of `.github/workflows/` is refused, the fallback is either JC adding the file in the GitHub web editor (Code supplies the text) or JC adding "Workflows: Read and write" to the PAT so Chat can add it.
  - The single root `APP_GUIDE.md` must still be served at `/Life-Care/APP_GUIDE.md` after cutover.
  - `legacy.html` rollback is to be tested before switching.
