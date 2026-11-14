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
| BMR, baseline, goal | 91.9 kg, 25.5% body fat | BMR ≈ 1,849; baseline ≈ 2,126; goal at 20% ≈ 1,701 → limited to BMR 1,849; at 10% 1,913 |
| Step allowance | JC test profile (178 cm, 91.9 kg) / Becks test profile (165 cm, 10.4 st, 30%) | 2,724 / 3,027 steps (clamp 2,000–3,500) |
| Steps credit | 10,000 steps (JC profile) | +247 kcal |
| Exercise credit | 30 min weights (MET 5.0) at 91.9 kg | +184 kcal |
| Total-burned mode | 2,900 kcal burned (Health) | +774 kcal; steps and exercise not added on top |
| Adjustment % | credit × adjustment % | applied after either mode |
| Fallbacks | No body fat → Mifflin-St Jeor; no weight → age/sex average | labelled "estimate" |
| Food per day | Week's eating record | skipped items not counted |
| Week so far | Fixed clock (a Wednesday) | counts Sun–Tue only; today separate; future never counted |
| My Notes | A weigh-in note | collected newest first; reaches the AI request context |
| UI | My Eating day and Home | Goal · Food · Activity · Left, step note, "How this is calculated", deficit % change |

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
- No automated accessibility checks yet: add `@axe-core/playwright` on the main screens (plan P6).
