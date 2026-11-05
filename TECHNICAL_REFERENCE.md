# Technical Reference — Life Care Companion

> **Purpose**: Complete technical architecture reference for any developer continuing this project.  
> **Version**: v2.6.0 (Vite build, 5 Nov 2026) | **Source**: `src/` (component files)  
> **Live**: https://jcbeck1976.github.io/Life-Care  
> **Repo**: https://github.com/JCBECK1976/Life-Care

---

## 1. Architecture Overview

### Vite React App (since v2.0.0)
- `index.html` (page shell: meta tags, manifest, base CSS, `#root`, Google Identity Services script) loads `src/main.jsx`.
- `src/main.jsx` mounts `<Dashboard />` inside an app-level `ErrorBoundary`.
- `npm run build` = ESLint, then a Vite build into `dist/` (base `/Life-Care/`). No in-browser Babel.
- GitHub Actions deploys `dist/` to Pages on every push to `main` (see §12).
- Behaviour is identical to v1.374.2. The code was moved by script, not rewritten.

### Dependencies (npm, pinned)
| Library | Version | Notes |
|---------|---------|-------|
| react, react-dom | 18.2.0 | Same versions as the old CDN build |
| firebase | 10.12.0 | **compat** imports (`firebase/compat/app`, `firebase/compat/database`), so `firebase.database().ref(...)` code is unchanged |
| Google Identity Services | latest | Still a `<script>` tag in `index.html` (`google` global) |
| vite, @vitejs/plugin-react | 5.4.10, 4.3.3 | Build (dev) |
| eslint + react, react-hooks plugins | 9.13.0 | `no-undef`, `react/jsx-no-undef`, hooks rules (dev) |
| @playwright/test | 1.63.0 | Tests; matches the Chromium pre-installed in cloud sessions (dev) |
| firebase-tools | 13.23.1 | Local Realtime Database emulator only (dev). Never `firebase deploy`. |

SheetJS (xlsx) was dropped in v2.0.0: nothing used it after the file import was removed.

### Component Structure
*Person switching (v2.5.1):* `activeTabRef` in `App.jsx` holds the person selected right now; every person-specific load (start-up loader and `loadUserSettings`) drops its result if another person is selected when it arrives. `loadUserSettings(k)` is the one place that loads a person's settings (colour, mood, journal, daily mood, wellbeing flags, meal tracking, portion overrides, Google token).

`Dashboard` (in `src/App.jsx`) still owns all ~218 hooks (state, refs, effects), the handlers, the header, person tabs, navigation and footer. Each section and overlay is a component in its own file. It receives the Dashboard values it uses as one prop, `ctx` (state, setters, handlers), and renders exactly what the old inline block rendered. No section reassigns a Dashboard variable. Each is wrapped in an `ErrorBoundary`.

---

## 2. File Layout

| Path | What's in it |
|------|--------------|
| `index.html` | Page shell (head, CSS incl. `.boot`, `#root` with the static loading screen, GIS script, `src/main.jsx`) |
| `src/main.jsx` | Mounts `<Dashboard />` in the app-level error boundary |
| `src/App.jsx` | `Dashboard`: all hooks, data loading, `saveData`, `loadUserSettings`, AI handlers (`generateFeedback`, `generateEatFeedback`, `threadReply`, `askHelp`, `askQuestion`, `handleFitdaysImage`, …), Google Health sync, RAG recalculation, header, person tabs, navigation, footer, and where each section/overlay is placed |
| `src/sections/` | `Home.jsx` (overview), `Body.jsx`, `Exercise.jsx` (weights), `Eating.jsx` (meals; includes `MealSelect`, add/update item flow, publishes `window._confirmReviewItem`), `Shop.jsx`, `Health.jsx` (bloods), `Settings.jsx` (admin), `Data.jsx` (Firebase Data Viewer + recovery tools; opened from Settings → 🗂 Data tools, admin only; renders only for the admin; ← Back to Settings) |
| `src/components/` | `ReviewItemOverlay`, `HelpPanel`, `ChatPanel`, `PrivacyPolicy`, `FeedbackForm`, `ErrorBoundary`, `EnvBadge` (BUILD/BETA badge, under Help/Settings), `PersonTabs` (scrollable person tabs for the header and the exercise log; `personName`, `peopleOf`, `tabLabel`), `LoadingScreen` (same markup as the static loading screen in `index.html`, class `boot`), `charts.jsx` (`MiniChart`, `FullChart`, `BodyCard`) |
| `src/lib/` | `firebase.js` (config; dev-only emulator switch), `storage.js` (`sGet`/`sSet`), `api.js` (`ensureApiKey`, `API_PRICES`, `trackApiUsage`, the `window.fetch` wrapper, `isEnergyEmpty`, `aiErrorMsg`, `handleApiError`), `aiContext.js` (mood/profile/journal context), `exercise.js` (type helpers, `nextPin`, reps parsing, `autoStatus`), `utils.js` (dates, `mealKey`, status colours, `parseStLb`, `fbIcon`, `calcWeek`), `colour.js` (HSL helpers, `accentVariant`) |
| `src/constants/` | `features.js` (`ALLOW_ADD_PERSON = false` until Steps 3/5), `version.js` (**`APP_VERSION_BASE`, the only place the version is set**; adds `-beta.N` / `-build.<sha>` per environment), `tone.js`, `mood.js`, `themes.js`, `defaultData.js`, `food.js`, `exercise.js`, `health.js`, `styles.js` (static button/input styles) |
| `public/legacy.html` | The v1.374.2 single file, served at `/Life-Care/legacy.html` (rollback) |
| `public/brand/`, `brand/source/` | JC's logos and prepared icons (from Chat). In use since v2.3.0: `app-logo-640.png` (loading screen), `header-mark-288.png` (header, 44px white disc). App icons wired in by v2.4.0 (installable app) |
| `APP_GUIDE.md` (root) | The user guide. One copy only: `vite.config.js` serves it in dev and copies it next to `index.html` in builds (Help fetches it with a relative URL) |
| `tests/` | Playwright: `smoke-load`, `eating`, `exercise`, `companion`, `error-boundary`, `data-tools`, `pwa` (manifest, installability, service-worker routing), `people` (1/2/5/8 people at 360/412px), `person-race` (slowed emulator), `env-build`, opt-in `visual`; `mock-ai.js` answers by prompt shape |
| `scripts/` | `seed-emulator.mjs` (loads the backup into the emulator; swaps the real Claude key for a placeholder), `lift-legacy.py` (the one-off verbatim lift, kept for the record) |
| `firebase.json`, `emulator.rules.json` | Emulator config only (open rules, local). Not production rules. |
| `.github/workflows/deploy.yml` | Lint, build and deploy to Pages |
| `vite.config.js` | Plugins: APP_GUIDE copy, build/beta `noindex` + title prefix, and the **installable app** (per-environment `manifest.webmanifest`, network-only `sw.js`, icon links); `sw.js` is registered in builds only (`main.jsx`) |

Unused code listed at checkpoint (c) was removed in v2.1.1 (`ExTable`, `StrengthBanner`, `LoadingBtn`, `PBar`, `RC`, `SNACK_TEMPLATES`, `DAY_TYPE`, `DEFAULT_OTHER_GB`, `JC_BASE`, `BECK_BASE`, hidden meds block).

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
window.trackApiUsage(usage, model)
// Prices the response's usage object with window.API_PRICES[model] = [input, 5-min cache write, cache read, output] USD/MTok
// Sonnet 4.6: [3, 3.75, 0.30, 15]. Add a row when a new model is used.
// Deducts from energy balance stored in Firebase
// Updates window._companionEnergyPct and window._companionEnergyStatus
// Triggers UI update via window._setCompanionEnergy if available
// DISPLAY ONLY — never blocks a call (v1.366.1).
// companion_energy fields: initial, balance, spent, pct, keyStatus, depleted, needsCalibration, calibratedAt
// Admin card "⚡ Companion Energy Level" (Settings, isAdmin) sets initial = balance after recharge → 100% (v1.374.1).
// Home card shows percentage only — never dollar values. trackApiUsage defaults a missing initial to 5.
// depleted=true only when Anthropic returns a credit-balance error (handleApiError or the ping).
// A working ping with an estimate at 0 sets needsCalibration (label asks the user to Set balance) — no silent resets.
```

### Fetch Interceptor
```javascript
// window.fetch is overridden to:
// 1. Clone Anthropic responses and extract usage tokens for tracking
// 2. Pass through all non-Anthropic calls unchanged
// It NEVER blocks a call. The old ENERGY_EMPTY pre-check was removed in v1.366.1:
// it rejected every request locally once the estimate passed 95%, while real credit was fine.
// "Energy Empty" now comes only from Anthropic's own credit error via handleApiError().
// window._origFetch — original fetch, used by checkCompanionEnergy's ping
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
- **threadReply()** — conversational follow-up on any feedback (`src/App.jsx`)
- **handleFitdaysImage()** — body comp screenshot → structured data via vision API (`src/App.jsx`)
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

### Tone Rules (`TONE_RULES`, `src/constants/tone.js`)
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

### Add Person Flow (header in `src/App.jsx`)
Creates a new person with empty profile, exercises (sunday/monday/friday), body metrics, measurements, bloods, and meds arrays. Immediately saves and switches to new person.

### NOT Authentication
The person toggle is a UI switch, not authentication. Both JC and Beck see all data. For multi-user, this needs replacing with Firebase Auth per-user namespacing (see FIREBASE_SECURITY.md).

---

## 10. Exercise System

### Exercise Types (`EXERCISE_TYPES`, `src/constants/exercise.js`)
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

### Stopped Exercises (v1.370.0)
- Fields: `ex.stopped` (true) and `ex.stoppedAt` (ISO date) on the exercise entry for that day only.
- The day list renders active exercises, then a "Stopped Exercises (n)" toggle (`stoppedExOpen` state), then stopped ones. Rows are drawn by `_renderEx(ex, i)` using the original index, so logging indexes are unchanged.
- `saveLog` refuses a stopped exercise; dual logging skips a stopped `otEx`. Session feedback filters stopped exercises out.
- Stop / Restart button sits under Edit / Delete in Exercise Settings.

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

### Adding & Updating Items (v1.366–v1.368)
- `confirmReviewItem(isOverlay)` — one handler for the inline and overlay Review Item panels; published as `window._confirmReviewItem` because the overlay renders outside the meals IIFE. Two-step: recalculate if ingredients changed (`cameraPreview.recalculated` flips buttons to Continue — Add / Edit Again), then add.
- `bulkPasteAdd(category)` — reads `#bulk-paste-textarea`, one AI call for all items, auto-adds, skips duplicates. Toggled by `bulkReviewItems === "paste"`.
- `saveEditItem(cat)` with `editDraft` state — Update Item panel, same two-step flow; uncontrolled inputs `edit-item-name-{id}` / `edit-item-ingredients-{id}`.
- New items store `suitability` (description).
- Add box closes after add when `addingSource !== "manage"`.

## 11b. Help & Chat
- **💬 Chat** (`qaOpen`, `askQuestion`, Firebase `qa_history`) — questions about the person's own data; full data context in the prompt.
- **❓ Help** (`helpOpen`, `askHelp`, Firebase `help_history`) — how to use the app. System prompt = rules + `APP_GUIDE.md` (fetched relative to index.html, cached in `window._appGuide`, sent with `cache_control: ephemeral`). Messages = last 6 Q/A pairs + "[I'm {name}, currently on the {tab} tab]" + question. `max_tokens` 800. Markdown stripped before saving.
- Both panels share the conversation-thread look: user bubble `accentChatUser` + `accentBorder`, companion bubble `#334155`, reply box + Send pinned at the bottom. Help ? is a header button left of the Settings gear (v1.374.0). 💬 Chat is the only floating button (bottom 24px); it hides while either panel is open.

## 12. Deployment

### Three environments (since v2.1.0)
| Env | URL | Branch | Data root | Version shown |
|---|---|---|---|---|
| prod | `/Life-Care/` | `main` | `data` | `v2.X.Y` |
| beta | `/Life-Care/beta/` | `beta` | `data` (real) | `v2.X.Y-beta.N` (N = promotions since the last release) |
| build | `/Life-Care/build/` | `build` | `data_build` (copy, re-seeded by Chat) | `v2.X.Y-build.<sha>` |
- **Flow:** commit to `build` → Chat verifies → PR `build → beta` (merge commit) → JC tests → PR `beta → main` = release → Chat verifies and tags. No source pushes straight to `beta` or `main`; doc-only commits go straight to `main`.
- **Pipeline:** Settings → Pages → Source = **GitHub Actions**. `.github/workflows/deploy.yml`: only **main's** run builds and deploys; pushes to `build`/`beta` ask it to run (`workflow_dispatch`). `scripts/build-pages.sh` builds all three branches (each `npm ci`, lint, `vite build --base …` with `VITE_APP_ENV`, `VITE_DATA_ROOT`, `VITE_BUILD_SHA`, `VITE_BETA_N`) into one artifact; `scripts/check-pages.mjs` checks it. **Prod is strict** (any failure stops the deploy); a beta/build failure leaves that folder out, is reported loudly (log, annotation, job summary), and prod still deploys.
- Build/beta: BUILD/BETA badge, tab-title prefix, `noindex`; `legacy.html` only at the root. Each environment has its own `APP_GUIDE.md`.
- Rollback: revert the bad merge on `main` (the previous v2 release redeploys). Since v2.6.0 the database needs Google sign-in, so `/Life-Care/legacy.html` (v1.374.2, no sign-in) no longer works once the rules are applied; in an emergency the rules can be reopened in the Firebase console.
- **Sign-in (v2.6.0):** `AuthGate` (Google popup, redirect fallback; access probe on `DATA_ROOT`) wraps the app; `database.rules.json` is the source of truth for the console rules (allowed account UID on `data/` and `data_build/`); the emulator runs a generated copy with a test UID. If `main` has no `package.json`, prod is published as plain files (legacy).

### Pre-Deploy Checklist
1. ✅ `npm run lint` (0 errors) and `npm run build`
2. ✅ `npm test` with the emulator running (`npm run emulator`, `npm run seed`)
3. ✅ Update `APP_GUIDE.md` for any user-visible change
4. ✅ Bump `APP_VERSION_BASE` in `src/constants/version.js`: feature/layout `v2.X.0`, bug fix `v2.X.Y`
5. ✅ One change per version, through build → Chat → beta → JC → main
6. After deploy: JC closes and reopens the tab and checks the footer version

### GitHub PAT
- Expires: **never** (regenerated 3 Nov 2026). If exposed, delete and replace it, then update the vault.
- Scope: Contents read/write on Life-Care and vault. Not used by Claude Code sessions (they use the GitHub connection).
- **Never commit a real PAT to the repo** (GitHub secret scanning blocks it)

---

## 13. Known Technical Debt

1. ~~No error boundary~~ — added in v2.0.0 (each section, overlay, and the whole app)
2. **Silent Firebase errors** — sGet/sSet swallow PERMISSION_DENIED, app loads defaults
3. ~~Single file / Babel mobile limit~~ — removed in v2.0.0 (Vite build)
4. **~218 hooks in one component** — still in `Dashboard`; sections get them via `ctx`. Context/reducers is future work
5. ~~No automated tests~~ — v2.0.0 has ESLint + 13 Playwright tests (emulator, AI mocked)
6. **DEFAULT_DATA coupling** — serves as both safety net and demo data
7. **Hardcoded exercise days** — Sunday/Monday/Friday specific to JC/Beck
8. **No offline/PWA support** — requires internet for all operations
9. **Wide-open Firebase rules** — see FIREBASE_SECURITY.md
10. **Client-side API keys** — Anthropic key visible in browser DevTools
11. **Cross-file `window.*` links** — sections are components now, but `window._confirmReviewItem` (Eating → Review Item overlay) and the energy globals on `window` are kept as before; replace only once a tested alternative exists
12. **Energy meter** — calibrated estimate; a live balance needs the Admin API from a server (see HANDOVER.md known issue #8)

---

## 14. Key Patterns to Preserve

### Section State Resets
When switching sections (navigation in `src/App.jsx`), these states reset:
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
| `src/`, `index.html` | GitHub repo | The application (Vite) — see §2 |
| `public/legacy.html` | GitHub repo | v1.374.2 single file (rollback) |
| `CLAUDE.md` | GitHub repo | Rules for Claude Code sessions |
| `HANDOVER_ARCHIVE.md` | GitHub repo | Older Session Log entries |
