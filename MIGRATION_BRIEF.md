# Claude Code Migration Brief — Lifecare Companion™

> **How to use this file:** start Claude Code with **Opus 5.5** (`claude --model claude-opus-5-5`, or `/model claude-opus-5-5` in a running session), then paste this whole file as your first message, or say "Read MIGRATION_BRIEF.md in the Life-Care repo and follow it."
>
> Written 3 November 2026 at app version **v1.374.2**. Supersedes any earlier instruction to use Opus 4.6 for this work.

---

## 0. Who you are working for and how

You are working for **JC** (Jan-Christian Zaluski), owner of Lifecare Companion™. He is not a developer. He is technically sharp, busy, and has lost a lot of time and tokens to patches that didn't work. Treat these rules as hard requirements:

1. **Stay in scope.** Do only what this brief or JC asks. No drive-by refactors, no "while I'm here" changes. Scope creep wastes his time and tokens.
2. **Warn before anything token-heavy.** Give a one-line warning before large reads, big rewrites or long test runs.
3. **Trace before you patch.** Find where a failure actually happens (read the call path, reproduce it) before changing code. Five blind patches to the wrong function once cost a full day.
4. **One change per version, one deploy per version.** Feature/layout change = `v1.X.0`, bug fix = `v1.X.Y`.
5. **Never break production.** JC and Becks use the live app daily for exercise, eating and health tracking. Production changes only after JC has tested a preview and said yes.
6. **Talk plainly.** Short, specific updates: what changed, what he should test, what's next. No jargon walls. Ask at most one question at a time, and only when you're genuinely blocked.
7. **Ask before anything irreversible**: production cutover, deleting files or branches, changing repo/Pages settings, touching Firebase rules or data.
8. **Model:** you (Claude Code) run on **Opus 5.5** (`claude-opus-5-5`). The **app's own AI features stay on `claude-sonnet-4-6`**. Do not change the model strings inside the app.
9. **`HANDOVER.md` is the project memory. Check it before acting; record in it after acting.** This is how the architect (JC working with Claude in Chat) and you (the builder) stay in sync, because neither remembers the other's conversations.
   - **Read it in full once, at the start of each session.** Note the commit you read it at.
   - **Before every later action or decision, read only what changed since your last read; don't re-read the whole file.** Run `git pull`, then `git diff <last-read-commit> HEAD -- HANDOVER.md`. If the diff is empty, carry on. If not, read just the changed lines, then note the new commit as your last read. Another session (Chat or Code) may have added rules, decisions or open items. If anything conflicts with what you're about to do, stop and ask JC.
   - Your own entries don't need re-reading: you wrote them.
   - **Label every entry you write `(Code)`**, e.g. `### (Code) 4 Nov 2026 — v1.375.0 preview`. Entries written from Chat are labelled `(Chat)`. The labels let each side read only what the other has added since its own last entry.
   - **After every action** (each version shipped, each checkpoint, each preview or deploy, each fix): add a dated entry to the **Session Log** in `HANDOVER.md` with what was done, the version and commit, what JC needs to test, and anything left open. Update the version table and the "Live Product" version line. Commit and push it in the same step, so it's never left unrecorded.
   - **After every design decision** (yours, JC's, or one JC passes on from Chat): record the decision, the reason and any alternatives rejected under a **Decisions** heading in the Session Log. A decision that isn't written down didn't happen.
   - Keep entries short and factual. Add new Session Log entries at the **end** of the file so diffs stay small. When the Session Log passes about 150 lines, move older entries into `HANDOVER_ARCHIVE.md` (not read routinely) and leave a one-line pointer. Update `TECHNICAL_REFERENCE.md` when the code structure changes and `APP_GUIDE.md` when anything user-visible changes.
10. **Never read `index.html` in full.** It is ~870KB (~250,000 tokens per full read), the single biggest risk to JC's token budget. Use `grep` / search and read only the line ranges you need. Do mechanical moves (like the verbatim lift in 3.3) **with a script** that copies text between markers, not by reading it into context and writing it back out. The same applies to any large file, and to `src/App.jsx` while it is still large.
11. **Keep `CLAUDE.md` short** (aim for under 60 lines). It is loaded every session, so every line costs tokens every time. Put only the rules from this section, the check and deploy commands, and pointers to `HANDOVER.md`, `TECHNICAL_REFERENCE.md`, `APP_GUIDE.md` and this brief. Never copy whole documents into it.

---

## 1. Read these first (in order)

All in `https://github.com/JCBECK1976/Life-Care` (public):
1. `HANDOVER.md` — history, current state, roadmap, user rules, gotchas, session log. **Section 3 (migration path) and Section 6 (risks) are essential.**
2. `TECHNICAL_REFERENCE.md` — architecture, state, data model, core functions, patterns to preserve.
3. `FIREBASE_SECURITY.md` — needed later (Step 2); skim now.
4. `TRANSFER_GAPS.md` — known gaps from the Chat → Code handover.
5. `APP_GUIDE.md` — the user-facing guide. **The in-app Help companion fetches this file live**, so it must keep being served next to the app.

**Credentials** are in the **private** repo `JCBECK1976/vault` → `life-care/CREDENTIALS.md` (GitHub PAT, Firebase, Google OAuth). If you can't access it, ask JC. **Never commit any credential to the public repo**; GitHub secret scanning will block the push anyway. The GitHub PAT expires **4 December 2026**, so flag it to JC if you're still working near then.

---

## 2. The app today (facts you need)

- **Live:** https://jcbeck1976.github.io/Life-Care. GitHub Pages serves the `main` branch root.
- **Everything is one file:** `index.html` (~870KB, ~7,900 lines). JSX is compiled **in the browser** by Babel standalone.
- **CDN dependencies (match these versions in npm):**
  - React 18.2.0 + ReactDOM 18.2.0 (UMD)
  - Babel standalone 7.23.9 (**removed by the migration**)
  - Firebase **10.12.0 compat** (`firebase-app-compat`, `firebase-database-compat`)
  - Google Identity Services (`https://accounts.google.com/gsi/client`) for Health Connect OAuth
  - SheetJS `xlsx` 0.18.5
- **Data:** Firebase Realtime Database, project `life-care-app-64d04`, region europe-west1. `sGet(key)` / `sSet(key, val)` read and write `data/<key>` (keys sanitised). Rules are currently wide open; securing them is Step 2, **not this job**.
- **AI:** browser calls to `https://api.anthropic.com/v1/messages` with `anthropic-dangerous-direct-browser-access`. The Claude API key is stored in Firebase (`anthropic_api_key`). `window.fetch` is wrapped so every Anthropic response's `usage` feeds `window.trackApiUsage(usage, model)` (Companion Energy). **The wrapper must never block calls.** A client-side block once disabled all AI features; see HANDOVER Session Log.
- **Structure:** one giant `Dashboard` component with ~150 `useState`s. Each main section renders inside an IIFE (`{section === "meals" && (() => { ... })()}`).
- **Patterns that only work because of the current structure (preserve the behaviour, not necessarily the trick):**
  - `window._confirmReviewItem` — the Review Item overlay renders outside the meals IIFE, so the function is published on `window` every render.
  - `loadUserSettings(k)` — shared by the top name tabs and the person switch inside the exercise log.
  - Uncontrolled inputs (`defaultValue` + `id` + `document.getElementById`) in add/edit food forms, to stop cursor jumping in the giant component.
  - Top-level style constants (`btnS`, `btnAction`, `btnMuted`, …) must be static values.
  - `APP_GUIDE.md` is fetched with a **relative** URL by `askHelp()`.
- **Version number** appears in 3 places: the button-styles comment near the top of the script, the feedback `emailBody` "App Version", and the footer. After migration, make it **one constant**.
- **Current deploy method:** GitHub Contents API PUT of `index.html`. Pre-deploy checks are a Babel syntax check plus a scope check (HANDOVER §4). The scope check exists because Babel passes code that calls a function that doesn't exist in that scope.

---

## 3. This job: Step 1 — Vite migration (behaviour-identical)

**Goal:** the same app, looking and behaving exactly the same for JC and Becks, but built with **Vite** from **component files**, with **no in-browser Babel**, a **local dev server**, **automated checks**, and a **preview URL** before production.

**Out of scope for this job (do NOT start without JC's explicit go-ahead):** Firebase Auth/security rules (Step 2), removing hardcoded data (Step 3), onboarding (Step 4), multi-user model (Step 5), backend AI proxy and Companion Energy purchases (Step 6). No feature changes, no visual changes, no "improvements". If you spot bugs, **list them for JC**; fix them only if he says so.

### Definition of done
- [ ] Every tab, panel, button, form, chart and AI feature works exactly as in v1.374.2 for **both** people (JC and Becks), on mobile Chrome and desktop.
- [ ] Same Firebase data paths and formats. **No migration of existing data needed.**
- [ ] `APP_GUIDE.md` served next to the app; the Help panel answers questions.
- [ ] `npm run build` passes with zero ESLint errors (`no-undef` on, which replaces the old scope check).
- [ ] Playwright smoke tests pass (see 3.5).
- [ ] An error boundary shows a friendly message instead of a blank screen.
- [ ] JC has tested the preview and approved the cutover.
- [ ] Production is live on the Vite build, with a one-step rollback to the legacy single file.
- [ ] HANDOVER.md, TECHNICAL_REFERENCE.md (new file layout, deploy, checks) and a new `CLAUDE.md` are updated.

### 3.0 Before touching anything
1. Clone the repo. Tag the current state: `git tag legacy-v1.374.2 && git push --tags`.
2. **Back up Firebase:** GET `https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app/data.json` and save it **locally only**. It contains personal health data and must **never** be committed to the public repo.
3. Run the existing checks against `index.html` and confirm a clean baseline.
4. **Check the GitHub PAT expiry** (in the vault). It expires **4 December 2026**. If the migration could run past it, ask JC to renew it now, so pushes and deploys don't stop mid-job.

### 3.1 Protect live data during development
The dev server would otherwise read and write the **live** database. Add a data-root setting:
- `sGet`/`sSet` use `import.meta.env.VITE_DATA_ROOT` (default `"data"`).
- `.env.development` sets `VITE_DATA_ROOT=data_dev`. Seed `data_dev/` once from the backup (ask JC before writing to Firebase).
- Production builds always use `data`. This is the only behaviour difference, and it's dev-only.

### 3.2 Scaffold
- Vite + React 18.2 (`@vitejs/plugin-react`), `firebase@10.12.0` using the **compat** imports, so the existing `firebase.database().ref(...)` code keeps working; `xlsx@0.18.5`. Keep Google Identity Services as a script tag.
- `.gitignore`: `node_modules/`, `dist/`, `.env*.local`, the Firebase backup, Playwright reports.
- `CLAUDE.md` with the rules in section 0 (**rule 9 word for word**: check `HANDOVER.md` before acting, record in it after every action and decision), the checks to run and the deploy steps. Claude Code loads `CLAUDE.md` automatically each session, so this keeps the memory rule in force in future sessions too.
- `vite.config` `base` must match where the build is served (`/Life-Care/` for production, `/Life-Care/next/` for preview).
- `APP_GUIDE.md` goes in `public/` so it's emitted next to `index.html`.

### 3.3 Port in two stages (don't refactor and port at once)
1. **Verbatim lift.** Move the entire `<script type="text/babel">` body into `src/App.jsx` almost untouched: imports instead of globals, `export default`, and mount in `main.jsx`. Get it building and behaving identically. **Checkpoint: show JC the preview.**
2. **Split into files**, one area per commit, re-testing after each:
   `src/constants/` (themes, exercise types, prices, mood, tone rules) · `src/lib/` (storage `sGet`/`sSet`, `apiFetch` + `handleApiError` + `trackApiUsage` + the fetch wrapper, utilities) · `src/components/` (MealSelect, LoadingBtn, thread renderer, charts, review/update panels, chat/help panels) · `src/sections/` (Home, Body, Exercise, Eating, Shop, Health, Settings, Data) · `src/App.jsx` (shell, header, navigation, person tabs).
   - Replace the section IIFEs with real components. Pass props, or use a small context for shared state. Don't redesign state management in this step.
   - Once the components can see each other properly, `window._confirmReviewItem` can become a normal import. **Remove a `window.*` workaround only once the replacement is proven.**
   - Install the fetch wrapper exactly once at startup, before any API call.
   - Keep uncontrolled inputs where they exist; a re-render must not wipe what the user is typing.

### 3.4 Error boundary
Wrap each section and the overlays. Show "Something went wrong in this section — your data is safe. Reload to try again." and log the error to the console. Never show a blank screen.

### 3.5 Checks (run before every preview or production deploy)
- `npm run lint`: ESLint with `no-undef` and the React hooks rules.
- `npm run build`.
- **Playwright smoke tests** (Chromium is pre-installed in cloud sessions; don't reinstall it). Point them at `data_dev` and **mock `api.anthropic.com`** with route interception, so tests never spend AI credit. Cover:
  - each main tab renders for both people; switching people changes the colour theme;
  - My Eating: add an item → Review Item → edit ingredients → Confirm shows "Nutritional values updated" → Continue — Add puts it in the list (mocked AI);
  - My Eating: bulk paste adds items; ✎ Update opens the Update Item panel;
  - My Exercise: Stop Exercise hides it under "Stopped Exercises"; Restart returns it; Log isn't offered while stopped;
  - Help ? opens and returns a (mocked) answer; 💬 Chat opens;
  - Home: the Companion Energy card shows a percentage only (no $ values).

### 3.6 Preview (no repo setting changes needed)
Build with `base: '/Life-Care/next/'` and commit the output to a `next/` folder on `main`. It is then served at **https://jcbeck1976.github.io/Life-Care/next/** by the existing Pages setup. Tell JC exactly what to test there.
**Heads-up for JC:** the preview uses the **live** data (production build), so anything he saves there is real. That's intended for acceptance testing, and the backup from 3.0 covers it.

### 3.7 Cutover (only after JC approves the preview)
1. Ask JC to switch **Settings → Pages → Source** to **GitHub Actions** (one click, or do it yourself if he gives you access).
2. Add a GitHub Actions workflow: install → lint → build (`base: '/Life-Care/'`) → deploy `dist/` to Pages.
3. Keep the legacy single file as `public/legacy.html`, so rollback means visiting `/Life-Care/legacy.html` while you revert.
4. Remove the `next/` folder after cutover.
5. Version: **v1.375.0** (layout/platform change), shown from the single version constant.
6. Tell JC to close the tab and reopen it, and to check the footer version.

### 3.8 Docs
Update `HANDOVER.md` (version table, new deploy and checks, retire the Contents-API deploy script and Babel check), `TECHNICAL_REFERENCE.md` (file layout replaces line numbers), `CLAUDE.md`. Update `APP_GUIDE.md` **only** if something user-visible changed (it shouldn't). Every future user-visible change must update `APP_GUIDE.md` in the same release; the Help companion reads it live.

### 3.9 After cutover: Step 1b — efficiency pass (measure → propose → JC approves → build)
**Goal:** cut running costs and load time **without losing any capability**. Do not build anything here until JC has approved a written proposal.

**Measured on 3 Nov 2026 (from Chat):** 100 Firebase keys, ~198KB in total, no images stored. Firebase is well inside the free tier at today's two users. **AI calls are the real running cost.** But:
- `saveData()` rewrites the whole `dashboard:data` blob (~59KB, **both people's data**) on every save. That's wasteful at scale and a **lost-update risk today**: two phones saving close together can overwrite each other's changes.
- Startup performs ~100 separate `sGet` reads.

**1. Measure first** (cheap: Firebase console usage, key sizes, counts). Add a debug-mode-only tally of AI calls and tokens per feature over a few days of JC's normal use. Report the baseline to JC.

**2. Propose** (each item with expected saving, risk, and how tests prove no capability loss). Candidates:
- **AI (biggest saving):**
  - Prompt caching wherever a large prefix repeats. 💬 Chat sends the full data context on every question, so caching it makes follow-ups within a few minutes ~90% cheaper on input (Help already does this).
  - Cache nutrition lookups (AI and Open Food Facts) by normalised food name on the device, so repeat lookups cost nothing.
  - Never regenerate guides, warm-ups or feedback whose inputs haven't changed.
  - Trim prompt context to what each feature actually uses.
  - Evaluate a smaller model only for simple extraction tasks (e.g. reading a scales screenshot), with side-by-side tests. **Switch only if JC sees no quality loss.**
- **Device storage (sensible uses only):**
  - Instant start from an IndexedDB copy of the last data, then sync from Firebase in the background.
  - UI preferences (open panels, last tab) and unsent drafts (journal, add-item forms) in localStorage.
  - Cache static reference data (APP_GUIDE.md, exercise database). Wrap every storage call in try/catch; the app must work with storage unavailable.
  - Firebase stays the source of truth. **Device storage is never the only copy of health data**, and the device cache must be cleared on sign-out once accounts exist (Step 2).
- **App shell:** a PWA service worker to cache the built assets: faster loads and offline opening. (Also on the technical-debt list.)
- **Startup:** batch the ~100 reads into one or a few.
- **Saves:** granular path writes instead of rewriting the whole blob. Fixes the lost-update risk. If it overlaps the Step 2/5 data-model work, propose doing it there instead, but flag the risk to JC now.
- **Images:** if photo storage is added later, compress on the device and use Firebase Storage, never base64 in the database.

**3. Build** each approved item as its own version, with before/after numbers in the Session Log.

---

## 4. Gotchas that have bitten this project

- Babel and build passing ≠ working. Functions defined in one section weren't visible in another and failed silently at runtime. ESLint `no-undef` plus the Playwright tests are the guard now.
- Page-level messages (`formMsg`) render at the top of the page and are **invisible behind modals**. Panels show their own messages.
- AI JSON replies get cut off at `max_tokens`. Check `stop_reason === "max_tokens"` and show a retry message; store errors under the key the UI reads.
- Companion Energy is **percentage only** for users. 100% = balance at the last recharge (set by the admin in Settings), 0% = $0. **Never show money values to users**, and never block calls client-side.
- Help answers have markdown stripped because the panel renders plain text.
- `isAdmin` is currently `activeTab === "jc"`: admin-only cards (API keys, reset, debug, energy level).
- GitHub Pages and phone browsers cache hard. After a deploy, "close the tab and reopen" is the instruction for JC.
- Dates and times are formatted en-GB throughout; keep it.

---

## 5. Reporting to JC

At each checkpoint send:
1. **Done:** one or two lines.
2. **Test this:** a short checklist with the exact URL.
3. **Next:** what you'll do after his OK.
4. **Issues spotted (not fixed):** a list, if any.

Every report must be preceded by the matching `HANDOVER.md` Session Log entry (rule 9), and the report should say it's been recorded.

Checkpoints: (a) baseline and backup done → (b) verbatim lift live on preview → (c) split complete on preview, all tests passing → (d) cutover done → (e) docs updated → (f) Step 1b measurement and proposal. Then stop and wait for JC's approval before building Step 1b items or starting Step 2.
