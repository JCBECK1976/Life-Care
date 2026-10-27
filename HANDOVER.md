# Claude Code Handover — Life Care Companion

## Context for Claude Code

This document hands over the **Life Care Companion** app from its development phase in Claude Chat (Opus 4.6) to Claude Code for platform engineering and commercialisation. The app has been built iteratively across multiple chat sessions from approximately August–October 2026, totalling 344+ version increments. It is a working product in live daily use by its two founding users (JC and Beck).

---

## 1. Where We've Come From

### Origin
JC and Beck have a comprehensive Life Care Plan (PDF, built in ReportLab Python) covering exercise, diet, medical health, and wellbeing. The React dashboard app was created to make this plan interactive, trackable, and AI-powered — replacing static PDF tables with a living companion that learns from their data.

### How It Was Built
- **Entirely in Claude Chat** — no local IDE, no build tools, no dev server
- **Single-file architecture**: One `index.html` containing all React JSX, compiled by Babel in the browser
- **Deployed via GitHub API**: Claude pushes the file directly to GitHub Pages using the Contents API
- **Iterative development**: One feature per version, one version per deploy, tested live after each push
- **344+ versions** from v1.0.0 to v1.344.1, each individually versioned and deployed

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

---

## 2. Where We Are Now

### Live Product
- **URL**: https://jcbeck1976.github.io/Life-Care
- **Repo**: https://github.com/JCBECK1976/Life-Care
- **Version**: v1.344.1
- **Status**: In daily use by JC and Beck for tracking exercise, nutrition, body composition, and health
- **File size**: ~329KB single HTML file (approaching Babel mobile compilation limit of ~340KB)

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
2. **File size limit** — Single file at ~329KB, Babel fails on mobile at ~340KB+
3. **Silent Firebase errors** — `sGet()`/`sSet()` swallow permission errors, app loads defaults instead of showing error
4. **GitHub PAT expiry** — Current token expires 4 December 2026
5. **No error boundary** — A single JSX error causes blank screen (no graceful degradation)
6. **No automated tests** — All testing is manual via live deployment
7. **Hardcoded default data** — DEFAULT_DATA object contains JC/Beck specific data that needs removing for multi-user

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

### Version Convention
- Feature/layout change: increment major sub → `v1.345.0`
- Bug fix: increment minor → `v1.344.2`
- Always update version in both:
  1. Footer display text
  2. Button styles comment block near the top of the script

### Design System

| Context | Style | Constant |
|---------|-------|----------|
| Inside content cards | Grey/muted `#94a3b8` | `btnMuted` |
| Outside content on white bg | Deep blue gradient `#1e3a5f→#2563eb` | `btnAction` |
| Close/cancel buttons | Deep blue outline | `btnClose` |
| Clear/delete | Red text button | `btnClear` |
| Loading state | Grey `#94a3b8`, opacity 0.7, animated dots | — |
| AI features | Blue scheme `#eff6ff` bg, `#bfdbfe` border | — |

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
- Conversation thread messages: user = grey, companion = dark grey (#334155)

---

## 5. Reference Files

| File | Purpose |
|------|---------|
| `TECHNICAL_REFERENCE.md` | Full technical architecture, state management, component structure, data schema |
| `FIREBASE_SECURITY.md` | Firebase security requirements and implementation plan |
| `HANDOVER.md` | This document — context, history, roadmap, development guide |
| `index.html` | The entire application (single file) |

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
3. **Babel mobile limit** — File is at ~329KB. At ~340KB+ phones can't compile it. Vite migration is urgent.
4. **PAT expiry** — GitHub token expires 4 Dec 2026. New token needed before then.
5. **No rollback** — Deployment overwrites. The only rollback is git revert via GitHub.
6. **DEFAULT_DATA coupling** — The default data object serves as both a "safety net" when Firebase fails and as initial demo data. These two concerns need separating.
7. **State variable count** — The component has 100+ useState variables. Refactoring into context/reducers is needed for the Vite migration.
8. **AI cost** — Every feedback generation, food check, and guide generation calls the Anthropic API. The energy meter tracks this but costs can add up. Prompt optimisation needed for commercialisation.
9. **No offline support** — App requires both Firebase and internet. No service worker, no caching.
10. **Single-user assumption** — Many patterns assume max 2 users (JC/Beck person toggle). Multi-user needs a different approach.
