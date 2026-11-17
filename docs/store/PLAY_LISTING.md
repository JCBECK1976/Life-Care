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

## 2. Health Connect permissions declaration
**v2.21.0 requests no Health Connect permissions**, so no declaration is needed for internal testing. Steps (and calories) come today from the cloud Google Health API on the web, per person ([ADR 0012](../adr/0012-household-privacy-model.md)). When N6 adds Health Connect to the Android app, declare only these, with this text:

| Permission | Used? | Justification (paste into the declaration form) |
|---|---|---|
| `android.permission.health.READ_STEPS` | Yes (N6) | Lifecare Companion reads your **daily step total** to work out how many calories your activity added to your daily calorie goal. We store one total per day, never individual readings or locations. |
| `android.permission.health.READ_ACTIVE_CALORIES_BURNED` | Only if N6 uses it | Lifecare Companion reads your **daily total of active calories burned**, when your watch or phone records it, so your calorie goal reflects the exercise you actually did. One total per day only. |
| Any write permission | No | — |

Declaration steps (Play Console → App content → Health apps → Health Connect): 1) choose "Yes, my app accesses Health Connect"; 2) tick only the permissions above; 3) paste the matching justification for each; 4) link the privacy policy URL; 5) upload a short screen recording of the in-app flow showing where the daily total is used (Home → Today → Exercise row).

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
- **Closed testing (pilot) and production do.** All features sit behind Google sign-in with an allow-list, and today every allowed account can read the household's data (one shared `data` root). **A reviewer account must not be given access to real health data**, so reviewer access needs per-account data first (Step 5, per-uid accounts). Until then: don't start closed testing.
- Text to paste once Step 5 is in place: *"Sign in with Google using the review account below. It opens an empty demo profile. Tap Home → My Profile to see the setup, My Eating → Update Eating Lists to add food, My Exercise → + Add Exercise to log a session. Account: (review Google account) · Password: (in the Play Console field)."*

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
