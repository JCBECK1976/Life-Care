# Technical Reference — Life Care Companion

> **Purpose**: Complete technical architecture reference for any developer continuing this project.  
> **Version**: v1.365.0 | **File**: `index.html` (~860KB)  
> **Live**: https://jcbeck1976.github.io/Life-Care  
> **Repo**: https://github.com/JCBECK1976/Life-Care

---

## 1. Architecture Overview

### Single-File React App
The entire application is one `index.html` file containing:
- HTML `<head>` with CDN imports (lines 1–42)
- Firebase config and initialisation (lines 45–53)
- All JavaScript/JSX in a single `<script type="text/babel">` block (lines 55–7522)
- Babel compiles JSX in the browser at page load — no build step

### CDN Dependencies
| Library | Version | CDN |
|---------|---------|-----|
| React | 18.2.0 | unpkg.com |
| ReactDOM | 18.2.0 | unpkg.com |
| Babel Standalone | 7.23.9 | unpkg.com |
| Firebase App | 10.12.0 | gstatic.com |
| Firebase Database | 10.12.0 | gstatic.com |
| Google Identity Services | latest | accounts.google.com |
| SheetJS (xlsx) | 0.18.5 | cdn.sheetjs.com |

### Component Structure
There is ONE React component: `Dashboard`. It contains all ~150+ useState variables, all business logic, all rendering. It is rendered via `ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />)`.

---

## 2. File Layout (line numbers)

| Section | Lines | Description |
|---------|-------|-------------|
| HTML head + CDN imports | 1–42 | Script tags for React, Babel, Firebase, GIS, SheetJS |
| Firebase config | 45–53 | `firebase.initializeApp({...})` |
| Constants & Helpers | 55–88 | `TONE_RULES`, `MOOD_LABELS`, `getMoodContext()`, `buildExProfileInfo()` |
| DEFAULT_DATA | 90–540 | Hardcoded JC/Beck fallback data (~450 lines) |
| Exercise type configs | 440–451 | `weights`, `bodyweight`, `timed_hold`, `cardio`, `walking`, `sports`, `stretching` |
| Exercise utilities | 543–620 | `getExerciseType()`, `getExerciseTypeConfig()`, `nextPin()`, `countStatus()`, `autoStatus()` |
| Shared helpers | 620–790 | `calcAge()`, `LoadingBtn`, `handleApiError()`, `parseStLb()`, `fbIcon()`, `calcWeek()` |
| Button style constants | 790–794 | `btnAction`, `btnMuted`, `btnClose`, `btnClear` |
| Storage: sGet/sSet | 799–809 | Firebase read/write with error swallowing |
| API key & energy | 811–864 | `ensureApiKey()`, `trackApiUsage()`, fetch interceptor, energy helpers |
| Dashboard component start | 868–1048 | `LoadingBtn` component, `Dashboard` function declaration |
| useState declarations | 1049–1274 | All ~150+ state variables |
| Data loading useEffect | 1275–1389 | Firebase data fetch on mount, loads all keys |
| Google Health Connect | 1390–1510 | OAuth + Health API sync (weight, body fat, steps, exercise) |
| Dynamic RAG system | 1310–1388 | `recalcRAG()` — AI-powered food rating recalculation |
| Feedback thread reply | 2507–2541 | `threadReply()` — conversational follow-up on AI feedback |
| Image parsing | 2654 | `handleFitdaysImage()` — body comp photo → structured data via AI |
| Admin import | 2656–2657 | JSON data import/merge |
| Return/render start | 2686 | Main JSX return begins |
| Header + person toggle | 2686–2704 | App header, person tabs, add person |
| Section navigation | 2705–2708 | Tab bar rendering with state resets |
| **Home section** | 2712–3305 | Energy meter, mood, My Day, companion feedback |
| **Body section** | 3306–3631 | Body Stats tab, Measurements tab, charts, image upload |
| **Exercise section** | 3632–4634 | Day tabs, exercise cards, logging, warm-up/cool-down, guides |
| **Eating section** | 4635–6586 | Weekly meals, day food selection, RAG ratings, AI meal gen |
| **Shop section** | 6587–6820 | Food Checker (text + camera), shopping list generator |
| **Health section** | 6821–7019 | General notes, vitals, medications, blood results |
| **Admin/Settings** | 7020–7143 | Profile, API key, onboarding, data management |
| **Data section** | 7144–7200 | Export, backup, reset |
| Footer | 7200–7522 | Version display, person switcher, Ask a Question floating button |

---

## 3. State Management

All state is in `useState` hooks inside the `Dashboard` component. There is no Context, no Redux, no reducers.

### Core State (~150+ variables)

**App-level**:
- `data` — the entire app data object (all persons, config)
- `loading` — initial data load state
- `saving` — save-in-progress indicator
- `activeTab` — current person key (`"jc"`, `"becks"`, or custom)
- `section` — current section (`"overview"`, `"body"`, `"weights"`, `"meals"`, `"shop"`, `"bloods"`, `"admin"`, `"data"`)
- `formMsg` — global form message/toast
- `weekOff` — week offset for navigation

**Exercise state**:
- `logEx` — currently logging exercise (index or null)
- `logSets` — sets data for current log entry
- `logComment`, `logOverride`, `logWeek` — log form fields
- `logFullRange`, `logGoodForm` — quality toggle states
- `selectedEx` — selected exercise for detail view
- `exerciseSearch`, `exCategory` — exercise search/filter
- `warmUpOpen`, `coolDownOpen` — warm-up/cool-down collapsible states
- `sessionGuides` — AI-generated warm-up/cool-down content

**Body state**:
- `bodyView` — `"data"` or `"measurements"`
- `showBodyForm` — body stats form visibility
- `bodyInputs` — form field values for body composition
- `bodyMetricOpen`, `measMetricOpen` — expanded metric cards
- `measLogKey`, `editMeasKey` — measurement logging/editing
- `imgParsing` — Fitdays image processing state

**Eating state**:
- `meals` — meal selections per day
- `mealTracking` — consumption tracking per day/meal
- `customMeals`, `customFoods` — user-added items with RAG ratings
- `eatFbResults`, `eatFbExpanded` — eating feedback
- `copyDayOpen`, `copyWeekOpen` — copy day/week dialogs
- `mealGenLoading` — AI meal generator state
- `helpEatOpen`, `helpEatResult` — "Help Me with What to Eat" feature
- `offResults`, `offSearch`, `offLoading` — Open Food Facts search

**Feedback & AI state**:
- `feedbackResults` — home page feedback per person
- `sessionFeedback` — exercise session feedback
- `bodyFeedback`, `measFeedback`, `healthFb` — section feedback
- `fbExpanded`, `eatFbExpanded`, `homeFbExpanded`, `healthFbExpanded`, `bodyFbExpanded`, `measFbExpanded2` — feedback panel toggles
- `threadLoading` — per-thread loading states (object)
- `companionEnergy` — API credit tracking object

**Health state**:
- `healthView` — `"general"`, `"vitals"`, `"meds"`, `"bloods"`
- `bloodResults` — blood test records
- `vitals` — vitals data

**Other**:
- `qaOpen`, `qaLoading`, `qaHistory` — Ask a Question feature
- `userMood` — 5-level mood (1–5)
- `googleToken`, `googleConnected` — Google Health Connect
- `showOnboarding`, `setupTab` — onboarding flow
- `ragRecalcLoading` — dynamic RAG recalculation
- `userColour` — current user's selected colour theme key
- `showPrivacy` — privacy policy overlay visibility

---

## 4. Data Architecture

### Firebase Structure
All data stored under `/data/` in Firebase Realtime Database. Keys are sanitised: `[.#$/[\]]` replaced with `_`.

**Storage pattern**: Most data is stored as JSON-stringified values via `sSet(key, JSON.stringify(value))` and parsed back via `JSON.parse(await sGet(key))`.

### Key Firebase Paths
```
/data/
├── main_data              → JSON string of entire data object
├── anthropic_api_key      → plain string
├── companion_energy       → JSON: {balance, initial, pct, keyStatus, spent, lastUsed}
├── feedback_results       → JSON: {jc: {...}, becks: {...}}
├── eat_feedback           → JSON: {jc: {monday: {...}, week: {...}}, ...}
├── session_feedback       → JSON: {jc_sunday: {...}, ...}
├── body_feedback          → JSON: {jc: {...}, becks: {...}}
├── meas_feedback          → JSON: {jc: {...}, becks: {...}}
├── health_feedback        → JSON: {jc: {...}, becks: {...}}
├── session_guides_sunday  → JSON: {warmup: "...", cooldown: "..."}
├── session_guides_monday  → JSON: {warmup: "...", cooldown: "..."}
├── session_guides_friday  → JSON: {warmup: "...", cooldown: "..."}
├── qa_history             → JSON: {jc: [{q, a, when}], becks: [...]}
├── user_mood_jc           → JSON: {level: 1-5, when: "..."}
├── user_mood_becks        → JSON: {level: 1-5, when: "..."}
├── meal_tracking:jc       → JSON: {monday_breakfast: true, ...}
├── meal_tracking:becks    → JSON: {...}
├── custom_meals_jc        → JSON: [{id, name, kcal, protein, ...}]
├── custom_meals_becks     → JSON: [...]
├── custom_foods_jc_*      → JSON: [...] (per meal category)
├── google_token_jc        → string
├── google_client_id       → string
└── ex_guides              → JSON: {exerciseName: "guide text", ...}
```

### Main Data Object Structure
```javascript
{
  config: {
    week: 7,                    // Current training week number
    session: 15,                // Current session number
    trainingStart: "2026-07-19", // Phase 1 start date
    lastUpdate: "4 Sep 2026"    // Last manual update note
  },
  jc: {
    profile: { name, dob, age, sex, height, bodyType, fibreType, idealWeight, notes, equipment },
    meds: [{ name, type, dosage, timing, frequency, notes, started, active }],
    medsHistory: [...],         // Stopped medications
    attachments: [{ name, date, extracted }],  // Uploaded document summaries
    body: {
      weight: [{ wk, v, date?, source? }],     // v = stones as decimal (14.68 = 14st 6.8lb)
      bodyFat: [{ wk, v }],                     // v = percentage
      muscleMass: [{ wk, v }],                  // v = "Xst Y.Zlb" string
      muscleRate: [{ wk, v }],                  // v = percentage
      skeletalMuscle: [{ wk, v }],
      visceralFat: [{ wk, v }],
      subcutFat: [{ wk, v }],
      bmr: [{ wk, v }],
      bodyWater: [{ wk, v }],
      boneMass: [{ wk, v }],                    // v = "Xst Y.Zlb" string
      bodyAge: [{ wk, v }],
      bmi: [{ wk, v }]
    },
    measurements: {
      fullBody: [{ wk, v, img? }],
      bicep: [{ wk, v }],       // v = cm
      forearm: [], calf: [], quad: [], chest: [], waist: [], shoulders: []
    },
    bloods: [{ date: "YYYY-MM", tests: { tsh, ldl, hba1c, cholRatio, ... } }],
    exercises: {
      sunday: [{
        name: "Exercise Name",
        current: "42kg",         // Current working weight
        reps: "12×3",            // Current rep scheme
        status: "building",      // building|consolidating|moved up|ready to move|deload|new
        target: "49kg × 10×3",   // Optional next target
        notes: "...",            // Optional notes
        prog: [{                 // Progression history
          wk: 1,                 // Week number
          w: "36kg",             // Weight used
          r: "12×3",             // Reps achieved
          note: "...",           // Optional log note
          fullRange: true,       // Quality: full range of motion
          goodForm: true         // Quality: maintained form
        }]
      }],
      monday: [...],
      friday: [...]
    }
  },
  becks: { /* identical structure */ }
}
```

---

## 5. Core Functions

### Storage
```javascript
sGet(key)    // Read from Firebase: /data/{sanitised_key} → value or null
sSet(key, val) // Write to Firebase: /data/{sanitised_key} = val
// CRITICAL: Both silently swallow ALL errors including PERMISSION_DENIED
// Returns null/undefined on error — app treats as "no data" and loads defaults
```

### API Key Management
```javascript
window.ensureApiKey()    // Returns cached key or fetches from Firebase
window._anthropicKey     // Cached API key (set after first ensureApiKey call)
```

### Companion Energy System
```javascript
window.trackApiUsage(inputTokens, outputTokens)
// Calculates cost at Claude Sonnet 4.6 rates ($3/M in, $15/M out)
// Deducts from energy balance stored in Firebase
// Updates window._companionEnergyPct and window._companionEnergyStatus
// Triggers UI update via window._setCompanionEnergy if available
```

### Fetch Interceptor
```javascript
// window.fetch is overridden to:
// 1. Check energy balance before Anthropic API calls — reject with ENERGY_EMPTY if ≤5%
// 2. Clone response and extract usage tokens for tracking
// 3. Pass through all non-Anthropic calls unchanged
// window._origFetch — original fetch, used for energy checks to avoid infinite loop
```

### Exercise Utilities
```javascript
getExerciseType(name)       // Returns type key from name pattern matching
getExerciseTypeConfig(name) // Returns full config object for exercise type
nextPin(current)            // Returns next weight stack pin value (Marcy HG5000 specific)
countStatus(exercises)      // Counts exercises by status across all days
autoStatus(prog)            // Determines status from progression history
calcWeek(trainingStart)     // Calculates current week from training start date
```

### AI Integration Pattern
All AI calls follow this pattern:
```javascript
const resp = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": await window.ensureApiKey(),
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 500–2000,  // varies by feature
    messages: [{ role: "user", content: prompt }]
  })
});
```

### Key AI Functions
- **Home companion feedback** — mood-aware, cross-pillar analysis of all data
- **Section feedback** — eating day/week, exercise session, body comp, measurements, health
- **threadReply()** — conversational follow-up on any feedback (line 2507)
- **handleFitdaysImage()** — body comp screenshot → structured data via vision API (line 2654)
- **Dynamic RAG recalculation** — `recalcRAG()` re-rates all food items against health profile
- **Food Checker** — text + camera input → nutritional analysis
- **Help Me with What to Eat** — location-aware food guidance
- **Exercise guides** — per-exercise how-to instructions
- **Session warm-up/cool-down** — AI-generated stretching routines
- **Ask a Question** — floating button, any-section Q&A

---

## 6. Design System

### Colour Theming (v1.345+)
Users can choose from 8 colour themes: blue, purple, green, teal, rose, amber, indigo, slate. Each theme defines `accent` and `light` values. Per-user colour stored via `sGet/sSet("user_colour_" + activeTab)`.

**Derived colour variables** (computed inside component from user's accent):
| Variable | Derivation | Use |
|----------|-----------|-----|
| `accent` | From COLOUR_THEMES | Primary colour |
| `accentLight` | From COLOUR_THEMES `.light` | Sub-section backgrounds |
| `accentDark` | `accentVariant(accent, 25)` | Very dark elements |
| `accentMid` | HSL S:30 L:40 | Muted dark tab backgrounds |
| `accentBtnLight` | `accentVariant(accent, 93)` | Themed button backgrounds |
| `accentBtnBorder` | `accentVariant(accent, 80)` | Themed button borders |
| `accentChatUser` | `accentVariant(accent, 88)` | User chat bubbles |
| `accentBorder` | `accentVariant(accent, 78)` | Section borders |

**CRITICAL**: Top-level constants (`btnS`, `btnMuted`, `btnAction` etc.) MUST use static values only. Themed variants (`btnST`, `btnMT`) are computed inside the component using `Object.assign()`.

### Button Styles
| Constant | Use | Appearance |
|----------|-----|------------|
| `btnAction` | Outside content cards | Deep blue gradient `#1e3a5f → #2563eb`, white text |
| `btnMuted` | Inside content cards (static) | Light grey `#f1f5f9` bg, `#94a3b8` text |
| `btnST` | Standard themed (computed) | `accentBtnLight` bg, `accentBtnBorder` border |
| `btnMT` | Muted themed (computed) | `accentBtnLight` bg, `accentBtnBorder` border |
| `btnDelete` | Delete actions | Red `#fee2e2` bg, `#dc2626` text |

**CRITICAL RULE**: Inside main content cards = `btnMuted`/`btnMT` (grey/themed). Outside = `btnAction` (deep blue).

### Header Hierarchy (3 tiers)
| Tier | fontSize | fontWeight | color |
|------|----------|------------|-------|
| 1 (main) | 13px | 800 | #0f172a |
| 2 (sub) | 12px | 700 | #0f172a |
| 3 (grey) | 11px | 700 | #475569 |

### Container Hierarchy
grey page bg → white section → `accentLight` sub-section → white user inputs ONLY

### Info Box Standard
`background: accentLight, color: #334155, fontSize: 12, border: 1px solid #cbd5e1`

### Colour Palette
- Header: `#0f172a → #1e293b` gradient
- Default accent (JC): `#2563eb` (blue), Default accent (Beck): `#7c3aed` (purple)
- AI feature backgrounds: `#eff6ff` bg, `#bfdbfe` border
- Feedback companion messages: dark grey `#334155`
- User thread messages: `accentChatUser` (L:88)
- Success toast: `#e0f2fe` bg, `#0c4a6e` text
- Error toast: `#fee2e2` bg, `#991b1b` text

### Layout
- Max width: 520px centred
- Font: Inter, -apple-system, sans-serif
- Mobile-first responsive (single column)

---

## 7. External Integrations

### Anthropic Claude API
- Model: `claude-sonnet-4-6`
- Header: `anthropic-dangerous-direct-browser-access: true` (client-side calls)
- API key stored in Firebase, entered by user in Settings
- Energy meter tracks spend against user-set budget

### Open Food Facts API
- UK product search: `https://uk.openfoodfacts.org/cgi/search.pl`
- Product lookup by barcode
- Used in Eating section for adding packaged foods

### Google Health Connect
- OAuth via Google Identity Services
- Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`
- Syncs: weight, body fat, steps (7 days), exercise sessions
- Client ID: `464885753789-a8flgh64f1u9qeocktt6uljvjvsd0sf2.apps.googleusercontent.com`

### Firebase Realtime Database
- Project: `life-care-app-64d04`
- URL: `https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app/`
- Region: europe-west1
- Auth: Google OAuth via GIS
- **CRITICAL**: Security rules are currently WIDE OPEN (see FIREBASE_SECURITY.md)

---

## 8. AI Prompt Architecture

### Tone Rules (TONE_RULES constant, line ~62)
Applied to all AI calls. Key rules:
- Never use 3rd person — always direct "you"
- Vary openers — no fake-casual filler
- Home = coffee with a friend (casual, cross-pillar)
- Sections = video call about that specific area
- No hardcoded user-specific data — only user-entered data from the app

### Mood System
5-level mood selector (1–5) stored per person. `getMoodContext()` builds mood-aware context string injected into all feedback prompts.

### Profile Context
`buildExProfileInfo(prof)` builds a string from the user's profile fields (body type, fibre type, conditions, equipment, notes) injected into exercise-related prompts.

### Feedback Object Structure
All feedback responses follow a similar pattern:
```javascript
{
  good: ["..."],           // Positive observations
  opportunities: ["..."],  // Areas for improvement
  focus: ["..."],          // Priority actions
  wins: ["..."],           // Achievements
  tweaks: ["..."],         // Suggested adjustments
  outlook: "...",          // Forward-looking summary
  summary: "...",          // Brief overall summary
  exercises: [{            // Exercise-specific (session feedback only)
    name: "...",
    verdict: "...",
    _decision: "...",
    _userNote: "..."
  }],
  _thread: [{              // Conversation thread
    role: "user"|"companion",
    text: "...",
    when: "..."
  }]
}
```

---

## 9. Person/Multi-User Architecture

### Current Pattern
- Footer contains person toggle buttons (JC, Beck, + Add Person)
- `activeTab` state holds current person key
- All data access: `data[activeTab].body`, `data[activeTab].exercises`, etc.
- Person key derived from name: `name.toLowerCase().replace(/[^a-z0-9]/g, "_")`
- New person gets empty data structure with all required fields

### Add Person Flow (line 2701)
Creates a new person with empty profile, exercises (sunday/monday/friday), body metrics, measurements, bloods, and meds arrays. Immediately saves and switches to new person.

### NOT Authentication
The person toggle is a UI switch, not authentication. Both JC and Beck see all data. For multi-user, this needs replacing with Firebase Auth per-user namespacing (see FIREBASE_SECURITY.md).

---

## 10. Exercise System

### Exercise Types (line 440–451)
Each type defines: label, metric1/2 (what's tracked), hasSets, defaultSets, defaultM1/M2, progression keys, chart labels.

| Type | Metric 1 | Metric 2 | Sets |
|------|----------|----------|------|
| weights | Weight (kg) | Reps | Yes (3) |
| bodyweight | None (BW) | Reps | Yes (3) |
| timed_hold | None (BW) | Duration (sec) | Yes (3) |
| cardio | Duration (min) | Distance (km) | No |
| walking | Duration (min) | Distance (km) | No |
| sports | Duration (min) | None | No |
| stretching | None (BW) | Duration (sec) | Yes (3) |

### Progression Model
Double progression: 12 → 15 reps across 3 sets, then weight moves up and reps reset to 12.

Status flow: `new → building → consolidating → ready to move → moved up → building...` (with `deload` as escape valve).

`autoStatus(prog)` calculates status from the last few progression entries.

### Logging
Each log entry: `{ wk, w, r, note?, fullRange?, goodForm? }`. Quality toggles (full range, good form) are boolean flags per log entry.

### Warm-up / Cool-down
AI-generated per session day. Stored in Firebase as `session_guides_{day}`. Collapsible sections, default closed, reset on section switch, stay open on user switch within exercise.

---

## 11. Eating System

### RAG Rating System
Every food item has a RAG (Red/Amber/Green) status:
- **GREEN/GREAT**: Allowed every day
- **AMBER**: Max once per week
- **RED**: Max once per month

`recalcRAG()` uses AI to dynamically re-rate items against the user's health profile (lipid levels, conditions, targets).

### Meal Structure
- 7 days × 4 meal slots (breakfast, lunch, dinner, snacks)
- Items selected from custom food lists (per person, per category)
- Shopping list auto-generated from selected meals only

### Open Food Facts Integration
Search UK food database, classify as packaged/ingredient, import nutritional data. Items get RAG-rated on import.

### AI Meal Generator
Generates meal suggestions using only custom-added items (with RAG status), never default/generic items.

---

## 12. Deployment

### GitHub Pages via API
```python
import urllib.request, base64, json
token = '<GITHUB_PAT>'
url = 'https://api.github.com/repos/JCBECK1976/Life-Care/contents/index.html'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
# GET SHA, PUT new content — see HANDOVER.md for full script
```

**CRITICAL**: Must use `ProxyHandler({})` to bypass session proxy.

### Pre-Deploy Checklist
1. ✅ Run Babel syntax check (see HANDOVER.md for script)
2. ✅ Update version in footer display text
3. ✅ Update version in button styles comment block
4. ✅ Never bundle multiple features in one version
5. ✅ Feature/layout = v1.X.0, bug fix = v1.X.Y

### GitHub PAT
- Expires: **4 December 2026**
- Scope: `JCBECK1976/Life-Care` repo, Contents read/write
- **Never commit real PAT to repo** (GitHub secret scanning blocks it)

---

## 13. Known Technical Debt

1. **No error boundary** — single JSX error = blank screen for all users
2. **Silent Firebase errors** — sGet/sSet swallow PERMISSION_DENIED, app loads defaults
3. **~329KB single file** — approaching Babel mobile limit (~340KB)
4. **~150+ useState in one component** — needs Context/reducers for Vite migration
5. **No automated tests** — all testing manual via live deployment
6. **DEFAULT_DATA coupling** — serves as both safety net and demo data
7. **Hardcoded exercise days** — Sunday/Monday/Friday specific to JC/Beck
8. **No offline/PWA support** — requires internet for all operations
9. **Wide-open Firebase rules** — see FIREBASE_SECURITY.md
10. **Client-side API keys** — Anthropic key visible in browser DevTools

---

## 14. Key Patterns to Preserve

### Section State Resets
When switching sections (line 2706), these states reset:
- All feedback expanded states → false
- Exercise log → null
- Body view → "data"
- Body/measurement forms → closed
- Warm-up/cool-down → closed

When switching persons within a section, forms close but section-specific state persists.

### Data Save Pattern
```javascript
const saveData = async (newData) => {
  setSaving(true);
  setData(newData);
  await sSet("main_data", JSON.stringify(newData));
  setSaving(false);
};
```

### Feedback Save Pattern
Each feedback type has its own update helper that:
1. Merges new feedback into the correct nested path
2. Updates local state
3. Persists to Firebase under the appropriate key

### Thread Pattern
All feedback supports conversational follow-up via `threadReply()`:
1. User types in thread input
2. Full conversation history + original feedback context sent to AI
3. Response appended to `_thread` array
4. Updated feedback object saved

---

## 15. Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| `HANDOVER.md` | GitHub repo | Context, history, roadmap, development guide |
| `FIREBASE_SECURITY.md` | GitHub repo | Security requirements and implementation plan |
| `TRANSFER_GAPS.md` | GitHub repo | 12 identified risks and recommended first actions |
| `TECHNICAL_REFERENCE.md` | GitHub repo | This document — full architecture reference |
| `index.html` | GitHub repo | The entire application |
