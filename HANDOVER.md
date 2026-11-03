# Claude Code Handover — Life Care Companion

## Context for Claude Code

This document hands over the **Life Care Companion** app from its development phase in Claude Chat (Opus 4.6) to Claude Code for platform engineering and commercialisation. The app has been built iteratively across multiple chat sessions from approximately August–October 2026, totalling 365+ version increments. It is a working product in live daily use by its two founding users (JC and Beck).

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
| v1.374.1 | Energy bar: percentage only (no $ shown to users); 100% level set by admin in Settings; fixed 0% when record lacked `initial` |

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: v1.374.1 (3 November 2026)
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
4. **GitHub PAT expiry** — Current token expires 4 December 2026
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

### Technical Migration Path

#### Step 1: Vite Migration (FIRST TASK)
The single-file Babel architecture has hit its ceiling. Migrate to:
- **Vite** for build tooling
- **Component files** — split the 7500-line monolith into components
- **Local dev server** — test before deploying (eliminates blank-screen risk)
- **Proper bundling** — removes the ~340KB Babel mobile limit

This was attempted on Sep 19 2026 but reverted. Claude Code with local dev server testing makes this feasible.

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
4. **PAT expiry** — GitHub token expires 4 Dec 2026. New token needed before then.
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

## 7. Session Log — 2 November 2026 (v1.365.5 → v1.371.0)

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
