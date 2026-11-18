# App Store — listing pack (Lifecare Companion, iPhone)

> Prepared 18 Nov 2026 (Coder, v2.29.0 on `build`). Copy these answers into App Store Connect. Testing is **through TestFlight only** (internal testers JC and Becks, then external pilot testers). Setup steps: GO_LIVE_CHECKLIST section G (J15). Keep these answers in step with the Play listing ([PLAY_LISTING.md](PLAY_LISTING.md)) and the DPIA.

## 1. App information
| Field | Value |
|---|---|
| Name | Lifecare Companion |
| Subtitle (≤ 30) | Eating, exercise and wellbeing |
| Bundle ID (permanent) | `com.companionappsstudio.lifecare` |
| SKU | `lifecare-ios` |
| Primary language | English (U.K.) |
| Category | Health & Fitness (secondary: Lifestyle) |
| Age rating | Answer the questionnaire as it is (no violence, gambling, user-to-user chat; health/wellness information only). The app itself requires 18+ at sign-up (onboarding). |
| Privacy policy URL | `https://jcbeck1976.github.io/Life-Care/privacy-policy.html` |
| Account deletion | In the app: Settings → Privacy & your data → Delete my account. Web: `https://jcbeck1976.github.io/Life-Care/delete-account.html` |
| Support URL | `https://jcbeck1976.github.io/Life-Care/` |
| Copyright | © 2026 Companion Apps Studio™ |
| Contact details | set in App Store Connect (not stored in the repo) |

**Promotional text (≤ 170):** Your private health companion — plan meals, log exercise, track your body and wellbeing, and ask a friendly AI Companion what your numbers mean.

**Description:** use the Play full description (PLAY_LISTING §1), then add:
- *Apple Health:* "With your permission, Lifecare Companion reads your daily step total (and, if you turn it on, active energy) from Apple Health to show today and the last 7 days. It never writes to Apple Health, and Health data is never used for advertising."
- *Subscriptions:* "Silver, Gold and Platinum are auto-renewing subscriptions (monthly or yearly), billed to your Apple ID and renewing unless cancelled at least 24 hours before the period ends. Manage or cancel in your Apple ID settings. Terms of use: Apple's standard EULA. Privacy: the privacy policy link above."

**Keywords (≤ 100):** health,meal planner,nutrition,exercise log,weight,body,wellbeing,steps,journal,companion

## 2. App Privacy ("nutrition label") — matches the DPIA, the privacy manifest (`ios/App/App/PrivacyInfo.xcprivacy`) and the Play Data safety form
**Do you or your third-party partners collect data from this app? Yes.** Tracking: **No** (no ads, no tracking or analytics SDKs, nothing sold).

| Data type | Collected | Linked to the user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact info → **Email address** | Yes | Yes | No | App functionality |
| Contact info → **Name** (the name you enter) | Yes | Yes | No | App functionality |
| Health & fitness → **Health** (weight, body composition, measurements, health notes, symptoms you log) | Yes | Yes | No | App functionality |
| Health & fitness → **Fitness** (exercise logs, daily step / active-energy totals from Apple Health) | Yes | Yes | No | App functionality |
| User content → **Photos** (food and body photo checks) | Yes | **No** — analysed and discarded, never stored | No | App functionality |
| User content → **Other user content** (journal, mood, Companion chats, feedback) | Yes | Yes | No | App functionality |
| Identifiers → **User ID** (the sign-in account ID) | Yes | Yes | No | App functionality |
| Purchases → **Purchase history** (plan and top-ups, verified with Apple) | Yes | Yes | No | App functionality |
| Usage data → **Product interaction** (AI usage counts per day and feature, no content) | Yes | Yes | No | App functionality |
| Location, contacts, browsing/search history, sensitive info, financial info, diagnostics, device ID, audio | No | — | — | — |

Notes: Google (Firebase hosting, database, sign-in) and the AI provider act as **processors**; Apple processes payments as an independent controller. HealthKit data is read only, per person, daily totals only; it is not stored in iCloud and never used for advertising (App Review Guideline 5.1.3).

## 3. Sign-in (Guideline 4.8)
The app offers **Sign in with Apple** next to Google sign-in. The email-link sign-in is web-only (the link opens in the browser), so the iPhone app shows Apple and Google only.

## 4. App Review information
- **Demo account:** one review account, created like any pilot user (an individual account — it sees an **empty** profile, never real data). Enter its Google or Apple test account in the Sign-in information fields; never put it in the repo.
- **Notes to paste:** *"Sign in with Apple (or Google using the review account). The app opens an empty profile and walks through a short setup (18+, terms, optional choices). Home → My Profile shows the setup; My Eating → Update Eating Lists adds food; My Exercise → + Add Exercise logs a session; Settings → Connect my steps asks for Apple Health read access (steps; active energy only if switched on). Settings → My Plan shows the subscriptions (sandbox). Settings → Privacy & your data → Delete my account deletes the account and its data. Lifecare Companion is a wellness app; it doesn't diagnose or treat, and its AI never gives medication advice."*
- **Account deletion check (before submitting):** on a TestFlight build, sign in with a throwaway Apple ID → Settings → Privacy & your data → Delete my account → sign in again: the app starts empty. The deletion path is the same server function as Android and the web (`deleteAccount`), covered by the emulator tests; the on-device run is GO_LIVE_CHECKLIST step 58n.

## 5. In-app purchases (one subscription group "Lifecare plans")
| Product ID | Type | Level in group | Price |
|---|---|---|---|
| `platinum.yearly`, `platinum.monthly` | Auto-renewable | 1 (highest) | as Play |
| `gold.yearly`, `gold.monthly` | Auto-renewable | 2 | as Play |
| `silver.yearly`, `silver.monthly` | Auto-renewable | 3 | as Play |
| `energy_5` | Consumable | — | £4.99 tier (= Play's £5 top-up) |

Bronze is free (no product). Purchases are verified on the server (`appleVerify`, App Store Server API) and kept current by App Store Server Notifications v2 (`appleNotify`); nothing is credited by the app itself. Each needs a review screenshot of Settings → My Plan.

## 6. Screenshots
6.9" and 6.5" iPhone sets are required (1320×2868 / 1284×2778). Take them from a TestFlight build with the review account (no real data): Home, My Eating, My Exercise, My Body, Companion chat, My Plan.
