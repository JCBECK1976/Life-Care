# Lifecare Companion™ — Test strategy

Draft 1.1, 13 Nov 2026 (prod v2.15.1; Architect review applied). How changes are checked before they reach JC and Becks.

## 1. Principles
- **Nothing reaches prod untested by a person:** every change goes build → beta → prod. The Architect checks `/build/`, JC tests `/beta/` on his phone, and only then is it released.
- **Never test against live data from a development session:** all automated tests run against the **local Firebase emulator**, seeded from a backup. The backup is kept outside the repository and never committed.
- **Never spend AI credit in tests:** the Anthropic API is mocked by request shape (`tests/mock-ai.js`, plus per-test mocks).
- **Every defect gets a regression test** that fails on the old code and passes on the fix, wherever that is feasible.
- **Phone first:** layouts are checked at **360px** (smallest common phone) and 412px; buttons must never be truncated or cover text.

## 2. Levels
| Level | Tool | What it covers | When |
|---|---|---|---|
| Static | ESLint (`npm run lint`): undefined names, React hooks rules | Must show 0 errors | Before every commit/deploy |
| Pure logic | Playwright test runner on plain functions | Rating rules, eating children model, body balance parsing, AI usage ledger, measurement reading, image/version helpers | Full suite |
| End-to-end | Playwright + Chromium against the dev server and the emulator (`npm test`) | User journeys per feature: sign-in gate, logging, Open forms, Snap, bulk upload, backups, tracker, person switching | Before every deploy |
| Security rules | The emulator runs the **real** `database.rules.json` (with a test account) | Signed-in allowed account can read/write; others can't | Every run |
| Environment build | Second Playwright project with the build environment settings | Build-only behaviour (its own data copy, badge) | Full suite |
| Visual | Screenshot comparison per section, both people (`VISUAL=1`), baselines kept outside the repo | Unintended layout changes; each diff is looked at by eye before rebaselining | Before every deploy |
| Prod compatibility | The released prod version run against new data shapes (`PROD_COMPAT_URL`, on demand) | Beta and prod share real data, so new shapes must not break prod | Before every beta PR |
| Bundle guard | `scripts/check-pages.mjs` in the deploy | Prod/beta bundles never refer to the build data copy; installable-app files complete | Every deploy |
| Smoke (live since 13 Nov) | `smoke.yml` after each deploy | Each environment loads with no console errors and runs the expected version; data present (counts only) | After deploy, once secrets are added |
| Security (planned) | Playwright, once SAD action A2 lands | Injected `<img onerror>` / `<script>` in AI text, food names and descriptions must not execute (sanitisation + Content Security Policy) | Full suite |
| Rules drift (planned) | Scheduled job, once SAD action A6 is built | The live database rules match the repository's rules file | Nightly |
| Manual | JC on his phone (`/build/` when asked, `/beta/` always) | Real device, real data, real AI | Each release |

## 2a. Regression sets
**Calorie model (v2.17.1, `tests/v2171.spec.js`; design [design/CALORIES.md](design/CALORIES.md)).** Known inputs with fixed expected outputs; any change to `src/lib/calories.js` must keep these passing (or change them with a recorded decision):
| Case | Input | Expected |
|---|---|---|
| BMR, baseline, goal | 91.9 kg, 25.5% body fat | BMR ≈ 1,849; baseline ≈ 2,126; safe minimum 1,664; goal at 20% = 1,701 (not floored); 30% → 1,664 (limited); at 10% 1,913 |
| Safe minimum | max(90% of BMR, 1,200 women / 1,500 men) | 1,849 m → 1,664; 1,600 m → 1,500; 1,200 f → 1,200; small woman at 30% → 1,200 |
| Step allowance | JC test profile (178 cm, 91.9 kg) / Becks test profile (165 cm, 10.4 st, 30%) | 3,160 / 3,500 steps (clamp 2,000–3,500) |
| Steps credit | 10,000 steps (JC profile) | +232 kcal |
| Exercise credit | 30 min weights (MET 5.0) at 91.9 kg | +184 kcal |
| Total-burned mode | 2,900 kcal burned (Health) | +774 kcal; steps and exercise not added on top |
| Adjustment % | credit × adjustment % | applied after either mode |
| Fallbacks | No body fat → Mifflin-St Jeor; no weight → age/sex average | labelled "estimate" |
| Food per day | Week's eating record | skipped items not counted |
| Week so far | Fixed clock (a Wednesday) | counts Sun–Tue only; today separate; future never counted; a day with nothing logged is skipped and counted as not logged |
| Old settings clean-up | `r6Active`, kcal `deficit` | removed once on load, everything else kept; second run changes nothing |
| My Notes | A weigh-in note | collected newest first; reaches the AI request context |
| UI | My Eating day and Home | Goal · Food · Activity · Left, step note, "How this is calculated", deficit % change |

**Person goals (v2.18.0, `tests/v2180.spec.js`; design [design/CALORIES.md §7](design/CALORIES.md)).** Known inputs (91.9 kg, 25.5% fat, 178 cm, male 50) and a fixed clock:
| Case | Expected |
|---|---|
| Each goal's approach | Healthy weight 7 months → 82 kg: aim −359, goal 1,767; Maintain 0; Build recomposition at 25.5% fat, surplus at 18%; Grow/Support −213 (BMI 29); Support needs a condition; nutrient priorities |
| Activity level vs step data | On my feet 2,404 / Very active 2,681 without steps; 2,126 + step credit with steps |
| Slider safety | 7 months green; amber band; 5 months red (below safe minimum); 80 kg in 3 months red with Steady 6 / Gentle 9; > 1%/week; aim capped at 25% |
| BMI 18.5 block | 57 kg at 178 cm blocked, 58.6 allowed; UI shows the block |
| Setup gate | No table until complete; "Later"; saving shows the table and stores goal + activity level |
| Table rows | Planned eating from snapshots (skipped included), actual from stored nutrition; planned vs logged exercise; on-track green/red |
| Week to date | Fixed Wednesday: Sun + Tue only (Mon unlogged, today and future excluded); Sunday morning → none |
| One goal everywhere | Home Today goal = My Eating day goal; no deficit control; week view 7 rows + footnote |
| Companions | Body feedback request contains the goal and timescale; no fixed 2000-2200 / 1700-1900 targets |
| Food ratings (v2.18.2, `tests/v2182.spec.js`) | Lists: reference 2,000 / 20 g / 25 g (850 kcal RED, 760 GREAT); personal limits 2,126 → 21.3 g / 26.6 g, 1,767 → 17.7 / 22.1, capped at 20 / 25 with cholesterol + prediabetes; a 760 kcal selection RED for 1,767 with "RED today — for your goal", none for 2,126 |
| Eating lists (v2.19.0, `tests/v2190.spec.js`) | Aldi pasta bake (sauce 500 g + penne 250 g + mozzarella 125 g + chicken 300 g, serves 4) → 445 kcal per portion, labelled per portion; OFF per 100 g → per portion (¼ jar = 63 kcal); meal maths (portions, grams, serves); validation (1,247 kcal vs macros refused); clarifying engine (3 tries → friendly question); drop-downs only own items + "+ Not in my list?"; round trip back to the slot with the item selected; Build a meal and Create my own item through the UI; migration on load (flags, nothing deleted, idempotent) |
| Photo, bulk, typed, Re-check (v2.19.1, `tests/v2191.spec.js`) | Bulk paste of 3 items + 1 unclear: per portion with descriptions, an invalid line retried, the unclear one asks; photo per portion (malformed reply retried); a photo it can't size → the conversation; Re-check flags whole-recipe and per-100 g values without changing them; no whole-recipe prompts; never "could not be read" |
| Finding food (v2.19.2, `tests/v2192.spec.js`) | Fuzzy cases (fruselli/fusili/spirals → fusilli, penny → penne, spagetti → spaghetti, brocoli, shells, "bag of dried pasta"); generic list offline with own lists first; OFF 503 retried; CSP connect-src covers every OFF host the code fetches (and the browser lets it out); wrong-match guard (Aldi pasta bake sauce: type, pack size, portion must be confirmed); Describe it instead → choices; 360 px layout (tabs one line, equal width; ingredient cards, ≥ 12 px gaps, no sideways scroll) with screenshots |
| Overnight batch (v2.20.0, `tests/v2200.spec.js`) | Home names from child records (no "C 20…"); memory helpers; follow-ups carry the previous answer in Chat, Help, Home and Exercise threads; the other person's text never sent; newest-first order and input on top; 360 px thread box; progression chain (helpers, card range, log pre-fill 49 kg × 12, user-set 5 → 8 kg, Accept stores 49kg); Today table (label one line, bold burn, both On track cells = eating − goal, aligned); borderless-field sweep; axe at 360 px on more states, dialog focus/Esc, 44 px touch targets; picker fuzzy/56 px/current/Added+Undo; numeric keypad + replace-on-type, floating Save; 360 px report screenshots |
| Android / Play (v2.21.0, `tests/v2210.spec.js`) | Delete my account (no flag; records emptied, the other person untouched, signed out, sign-in deleted); public deletion/privacy pages (no scripts, no email address); native guard (release = data + prod + client ID; debug = data_build; mismatches fail); Play uploader against a local stand-in (JWT signature, edit → upload → internal track → commit; refuses production; never prints the key). The signed AAB itself was built and verified with `jarsigner` in the Coder session (Android SDK 36) — CI repeats it. |
| Warnings and refresh (v2.18.3, `tests/v2183.spec.js`) | ⚠️ warning matches the displayed personal rating (stored GREAT, shown RED → RED monthly warning); refresh changes current + future weeks only, past unchanged; second run changes nothing |
| Recommended target (v2.18.1, `tests/v2181.spec.js`) | Body-fat method 85.6 (83.5–87.8), Becks-like 64.2, age 30 → 82.5; BMI fallback 74.3 estimate; floor at BMI 18.5; accept vs own (note, both stored, companion context); ≥ 2 kg move → suggestion; UI: no free entry first, BMI block |

### 2b. Overnight batch sets (v2.22.3 – v2.27.1)
- `tests/v2222.spec.js` preview bar, See plans, Snap gate, info prompts, Energy bar · `v2230` Health Connect (stand-in health store `window.__lcHealth`, dev only): calorie model with/without steps, per-person isolation, Disconnect, whose phone, guide, manifest · `v2240` onboarding + each consent switching its feature off · `v2250` sign-in options, individual store, household view, invites, pilot users, migration script (pure + emulator, dry run prints counts only) · `v2260` deploy workflow, deployable functions, App Check plumbing · `v2270` go-live switches.
- Functions (`npm --prefix functions test`, 34): consent, Energy units, monthly grant, export, Vertex fallback, pilot invites, final rules (store, consent history, server-only paths, family pool, public flags).

## 3. Test data
- Seeded per test with **synthetic** data (`scripts/make-fixture.mjs`, two made-up people with the same data shapes; `npm run seed`); each test that changes data reseeds first. Seeding from the real backup is opt-in only (`SEED_REAL=1`), never by default (SAD-A9, v2.16.1).
- Tests that need special shapes write them through the emulator's REST API (owner token), then reload.
- No real photos: tests generate images in the browser (e.g. a phone-size image for the "under 1 MB" check).

## 4. What every change must show before deploy
1. `npm run lint`: 0 errors.
2. `npm test`: all pass. On-demand prod-compatibility tests are skipped unless asked for.
3. New or changed behaviour has its own test (named by version/item), including 360px checks for anything with buttons.
4. The visual run: only expected differences, checked by eye, then rebaselined.
5. A deploy run that succeeded with no failure annotations.

## 5. Flaky tests
A test that fails once and passes on a rerun is **investigated, not ignored**: find the race (usually the app still saving while the test seeds data) and make the test wait for the right signal. Repeat it (`--repeat-each`) to confirm before carrying on.

## 6. Known gaps
- No automated test on a real phone or on iOS; covered by JC's manual tests.
- Real AI quality isn't tested automatically (mocked); prompts are reviewed and checked by hand on `/build/`.
- Load time is measured, not tested continuously; see the Step 1b entries in HANDOVER.
- Sign-in on a brand-new device (backlog S1) needs a manual release test on Windows, Mac, Android and iPhone before pilot users.
- Health Connect and Play Billing are tested with stand-ins; the real Android flows need a device test from Play internal testing (GO_LIVE_CHECKLIST B/E).
