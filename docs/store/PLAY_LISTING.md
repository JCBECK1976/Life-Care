# Google Play — listing pack (Lifecare Companion, Android)

> Prepared 17 Nov 2026 (Coder, v2.21.0 on `build`). Copy these answers into Play Console. Testing is **through Google Play only** (internal testing for JC and Becks, closed testing for the pilot) — no sideloading. Decision: [ADR 0016](../adr/0016-android-through-google-play.md).

## 1. App details
| Field | Value |
|---|---|
| App name | Lifecare Companion |
| Package name (permanent) | `com.companionappsstudio.lifecare` |
| Default language | English (United Kingdom) – en-GB |
| App or game / Free or paid | App · Free |
| Category | Health & Fitness |
| Developer | Jan-Christian Zaluski, trading as Companion Apps Studio™ |
| Contact email | the developer contact address (set in Play Console; not stored in the repo) |
| Privacy policy URL | `https://jcbeck1976.github.io/Life-Care/privacy-policy.html` (live after v2.21.0 reaches main; until then the build copy is at `/Life-Care/build/privacy-policy.html`) |
| Account deletion URL | `https://jcbeck1976.github.io/Life-Care/delete-account.html` (same timing) |

**Short description (≤ 80):** Your private health companion: eating, exercise, body and wellbeing in one place.

**Full description:**
Lifecare Companion brings your eating, exercise, body measurements and wellbeing together, with a friendly AI Companion that explains what your numbers mean and suggests next steps.
- Plan and log meals with per-portion nutrition and simple traffic-light ratings.
- Log your exercise sessions and get clear progression advice.
- Track weight, body composition and measurements against a goal and a safe timescale.
- Chat with your Companion: it remembers the conversation and only ever uses your own data.
Your data is yours: download it at any time, or delete your account from Settings. Lifecare Companion is a wellness app and does not replace medical advice.

## 2. Health Connect permissions declaration (FINAL — v2.23.0, N6)
From **v2.23.0** the Android app reads steps from Health Connect (Settings → **Connect my steps**). It requests **exactly two** permissions (four from v2.32.0: + weight and body fat, behind their own switch); every other permission the health library declares is removed from the app's manifest (a test keeps it that way). Nothing is ever written to Health Connect.

| Permission | Used? | Justification (paste into the declaration form) |
|---|---|---|
| `android.permission.health.READ_STEPS` | **Yes** | Lifecare Companion reads your **daily step total** for today and the last 7 days, when you open the app, to work out how much your activity adds to your daily calorie goal. We keep one total per day, never individual readings, times or locations. You can disconnect, and delete the stored totals, at any time in Settings. |
| `android.permission.health.READ_ACTIVE_CALORIES_BURNED` | **Yes, only if you turn it on** (separate switch, off by default) | Lifecare Companion reads your **daily total of active calories burned**, when your watch or phone records it, so your calorie goal reflects the exercise you actually did. One total per day only; off unless you choose it. |
| `android.permission.health.READ_WEIGHT` | **Yes, only if you turn on "Import my weigh-ins"** (v2.32.0; separate switch, off by default; Silver and up) | Lifecare Companion reads your **weight** from your smart scales or weight app (for example Fitdays, Renpho, Withings) through Health Connect, so your weigh-ins arrive without typing. **One reading per day** (the earliest), for the last 30 days when you first connect and then the last 8 days, each time you open the app. Weigh-ins you type always take priority. It feeds your body charts and your calorie goal. You can switch it off and delete the imported readings at any time. |
| `android.permission.health.READ_BODY_FAT` | **Yes, only with "Import my weigh-ins"** (same switch) | Lifecare Companion reads the **body fat percentage** your smart scales record with the same weigh-in, so it can estimate your resting energy (BMR) from your lean mass. One reading per day, kept with that day's weight. |
| Any write permission | **No** | — |

**Rationale screen:** tapping "Privacy policy" in the Health Connect permission screen (and Android 14's "permission usage" view) opens https://jcbeck1976.github.io/Life-Care/privacy-policy.html.

**Declaration steps** (Play Console → App content → **Health apps**): 1) "Yes, my app accesses Health Connect"; 2) tick only **Steps** and **Active calories burned** (read) — from v2.32.0 also **Weight** and **Body fat** (read); 3) paste the matching justification above for each; 4) privacy policy URL as above; 5) the core-functionality answer: "Fitness: calorie goal that follows the user's daily activity"; 6) upload a short screen recording: Settings → Connect my steps → the Health Connect permission screen → Home → Today, where the Exercise row and "How this is calculated" show the steps from Health Connect.

## 3. Data safety form (matches the DPIA and Privacy Notice: daily totals only, no ads, no sale, encrypted in transit, deletion available)
**Overview:** Does your app collect or share any of the required user data types? **Yes.** Is all collected data encrypted in transit? **Yes.** Do you provide a way for users to request that their data be deleted? **Yes** (in-app: Settings → Privacy & your data → Delete my account; web: the deletion URL above).

| Data type | Collected | Shared | Ephemeral | Required / optional | Purposes |
|---|---|---|---|---|---|
| Personal info → **Email address** | Yes | No | No | Required | App functionality, Account management |
| Personal info → **Name** (the name you enter) | Yes | No | No | Optional | App functionality |
| Health and fitness → **Health info** (weight, body composition, measurements, health notes, conditions you enter) | Yes | No | No | Optional | App functionality |
| Health and fitness → **Fitness info** (exercise logs, daily step / calorie totals) | Yes | No | No | Optional | App functionality |
| Photos and videos → **Photos** (food and body photo checks) | Yes | No | **Yes** — analysed and discarded, never stored | Optional | App functionality |
| App activity → **Other user-generated content** (journal, mood, Companion chats, feedback) | Yes | No | No | Optional | App functionality |
| App activity → **Other actions** (AI usage counts per day and feature, no content) | Yes | No | No | Required | App functionality |
| Location, contacts, messages, financial info, device IDs, web browsing, audio, calendar, files | No | — | — | — | — |

Notes for the form:
- **"Shared" is No** for every type: Google (Firebase hosting/database/sign-in) and Anthropic (AI processing) act as **service providers / processors**, which Play does not count as sharing.
- **No advertising, no sale, no tracking or analytics SDKs.**
- Data is **not** used for advertising, marketing or personalisation beyond the user's own feedback.
- Security section: encrypted in transit (HTTPS/TLS); deletion request available; the app follows Play's Families policy — **not** directed at children (target audience 18+).

## 4. App access (for Google's reviewers)
- **Internal testing does not need app access instructions** (internal releases aren't fully reviewed).
- **Closed testing (pilot) and production do.** Reviewers use the **store-review demo account** (v2.31.2, Architect decision 18 Nov): its own account with **made-up data only** (one synthetic person, "Alex (demo)"), **Gold** plan, **no family**. Never the joint account, never real data — the server refuses the joint account, admins, family members and any account that already holds its own data.
- **Make it (JC, once):** create a Google account used only for store review → in the app, Settings → **🧾 Store review demo account** → its email → **Create review demo account** (before that account first signs in). Then sign in once with it in a private window to check Alex's data appears. Its password goes **only** into the Play Console "App access" fields — never in the repo or chat.
- **Text to paste into App access:** *"Sign in with Google using the review account below. It opens a demo profile with made-up data (Alex), on the Gold plan. First you'll see a short setup (18+, terms, optional choices). Home shows today; My Eating → Update Eating Lists adds food; My Exercise → + Add Exercise logs a session; My Body shows weigh-ins and charts; Settings → My Plan shows the plans; Settings → Privacy & your data → Delete my account deletes the account. Account: (review Google account) · Password: (in the field below)."*

## 5. Other App content answers
| Section | Answer |
|---|---|
| Ads | No ads |
| Content rating (IARC questionnaire) | Health & fitness reference; no violence, sexual content, gambling or user-to-user chat → expect PEGI 3 / Everyone |
| Target audience | 18 and over |
| News app | No |
| COVID-19 contact tracing | No |
| Government app | No |
| Financial features | None |
| Health apps declaration | Wellness / fitness tracking; not a medical device; no diagnosis or treatment; tick "Nutrition and weight management", "Activity and fitness" |
| In-app purchases | **None.** Stripe is not built into the native app; digital purchases on Android must use Google Play Billing (Architect to revise tiers/Energy, see plan PAY1). |

## 6. Store graphics (in the repo)
- App icon 512 × 512: `public/brand/icon-512.png`.
- Feature graphic 1024 × 500: to make (Architect/JC).
- Phone screenshots (2–8, 1080 × 1920 or similar): take from the internal-testing build (Home, My Eating, My Exercise, Companion chat).
