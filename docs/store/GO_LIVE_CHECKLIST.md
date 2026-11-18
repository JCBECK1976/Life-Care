# Lifecare Companion™ — Go-live checklist (from now to the pilot)

> Written 18 Nov 2026 (Coder, overnight batch "Finish build"). **One ordered list.** Each numbered step is ONE action. Steps marked **JC** are yours; **Architect** steps are done with Claude in Chat; **Coder** steps you ask Claude Code for.
> Everything below already exists in the code on `build` (v2.22 – v2.27.1), behind switches that are **off** on beta and prod. Nothing here has been deployed or run yet.
> Public document: it names steps and settings, never keys, account IDs or security details.

**How to use it:** do the sections in order (A → G). Don't skip a "Check" step. Every switch can be turned off again (that is the rollback).

---

## A. Get the code onto main (the normal release route)
1. **JC** — Test v2.22 – v2.27 on **/build/** (close the tab, reopen, footer `v2.27.1-build`). Use Settings → My Plan → preview to see each plan; Settings → Connect my steps (Android app); the go-live switches card is visible but its switches won't work yet (they need section C).
2. **JC** — Tell the Coder "promote build → beta".
3. **Coder** — PR `build → beta` (merge commit); report when /beta/ is live.
4. **JC** — Test on **/beta/** (real data). Nothing new should be visible: every new feature is still switched off there.
5. **JC** — Approve the release; the **Architect** opens and merges `beta → main` and tags it.
6. **Check:** the live footer shows the new version; the app looks and works exactly as before.

## B. Google Play (Android) — already written as J steps in [PLAY_SETUP_J_STEPS.md](PLAY_SETUP_J_STEPS.md)
7. **JC** — **J16**: create the Google Play Console account (if not done).
8. **JC** — **J18** (steps 1–7): create the upload key on your PC, back it up in your password manager, add the 4 GitHub secrets.
9. **JC** — **J19** (steps 8–17): create the app in Play Console, the internal testers list, the first manual AAB upload, copy the fingerprints.
10. **JC** — **J20** (steps 18–29): Firebase Android app + fingerprints, `GOOGLE_WEB_CLIENT_ID` variable, the API-key origin.
11. **JC** — **J21** (steps 30–39): the Play upload service account; run "Android → Play internal testing"; install from Play on your phone and Becks's.
12. **JC** — Play Console → App content → **Health apps**: the Health Connect declaration, using the FINAL text in [PLAY_LISTING.md §2](PLAY_LISTING.md) (Steps + Active calories burned, read only), with the short screen recording.
13. **JC** — **J22** (steps 40–58): payments profile; subscriptions `silver` / `gold` / `platinum` with `monthly` + `yearly` base plans; one-time product `energy_5`; licence testers (you and Becks); give the server's service account purchase access; the `play-rtdn` Pub/Sub topic.
14. **Check:** the internal-testing app opens, signs in with Google, and the footer matches the web version.

## C. Google Cloud and Firebase (the server)
**Google Cloud console, project life-care-app-64d04 (Europe):**
15. **JC** — APIs & Services → Library → enable: **Cloud Functions**, **Cloud Build**, **Artifact Registry**, **Cloud Run**, **Eventarc**, **Pub/Sub**, **Cloud Scheduler**, **Secret Manager**, **Vertex AI**.
16. **JC** — Vertex AI → **Model Garden** → find **Claude Sonnet 4.6** (Anthropic) → **Enable** → accept the terms → choose the **EU region europe-west1** (if Model Garden offers a different EU region, note it; the Coder sets `VERTEX_REGION` to match).
17. **JC** — IAM & Admin → **Quotas**: search "Anthropic Claude Sonnet" for the EU region → if the requests-per-minute limit is below 10, request 30 (a small pilot needs little).
18. **JC** — IAM & Admin → IAM → the **Cloud Functions default (compute) service account** → add role **Vertex AI User** (Firebase access it already has).
19. **JC** — Billing → **Budgets & alerts** → create a budget for this project of **£20 a month** with email alerts at 50 %, 90 % and 100 %.
20. **JC** — Secret Manager → **Create secret** `ANTHROPIC_API_KEY` → paste the Anthropic key (used only if Vertex is down). Don't keep a copy anywhere else.
21. **JC** — IAM & Admin → Service accounts → **Create** `functions-deployer` → roles **Firebase Admin**, **Cloud Functions Admin**, **Service Account User**, **Cloud Scheduler Admin**, **Secret Manager Secret Accessor** → Done.
22. **JC** — Open `functions-deployer` → Keys → **Add key → JSON** (it downloads).

**GitHub (Life-Care repository → Settings):**
23. **JC** — Environments → **New environment** `production` → **Required reviewers: you** → Save. (The deploy waits for your approval every time.)
24. **JC** — In `production` → **Add secret** `FIREBASE_DEPLOY_SERVICE_ACCOUNT` → paste the whole JSON file from step 22.
25. **JC** — **Delete** the downloaded JSON file.
26. **JC** — In `production` → **Add variables**: `AI_BACKEND` = `vertex`, `AI_FALLBACK` = `direct`, `VERTEX_REGION` = `europe-west1`, `VERTEX_MODEL` = `claude-sonnet-4-6` (or the exact name Model Garden shows), `ENFORCE_APP_CHECK` = `false`.

**Firebase console:**
27. **JC** — Authentication → Sign-in method → **Email/Password** → enable it and **Email link (passwordless sign-in)** → Save. (Google is already on.)
28. **JC** — Authentication → Settings → **Authorised domains**: check `jcbeck1976.github.io` is listed.
29. **JC** — App Check → Apps → the **web app** → **reCAPTCHA Enterprise** → create the key → copy the **site key** (public).
30. **JC** — GitHub → Settings → Secrets and variables → Actions → **Variables** → New repository variable `APPCHECK_SITE_KEY` → paste the site key. (Leave App Check **unenforced**: the Android app's Play Integrity needs one more Coder step, listed in section H.)
31. **JC** — Realtime Database → Data → add `platform/admins/<your account's user ID>` = `true`, for the account that will flip the switches (find the ID under Authentication → Users). Ask the Architect if unsure.

**Deploy (dry run first):**
32. **JC** — Tell the Coder "prepare the rules release". **Coder** opens a PR that copies `database.rules.next.json` into `database.rules.json` (reviewed like any release; the daily rules check then compares against it).
33. **Architect** — Review that PR against the SAD; JC approves; merged to main through the normal route (section A).
34. **JC** — Download a **fresh backup** (Settings → Data → Download backup) and check it opens.
35. **JC** — GitHub → Actions → **Deploy functions + rules** → Run workflow (branch **main**) → **Dry run ticked** → Run → approve when asked.
36. **Check:** both jobs are green ("Emulator tests" and "Deploy … DRY RUN"). Nothing has changed yet.
37. **JC** — Run it again with **Dry run unticked** → approve.
38. **Check:** green; Firebase console → Functions lists `aiProxy`, `playVerify`, `playNotify` and the others; the live app still opens and shows your data (the joint account keeps full access under the new rules).
39. **JC** — Play Console → Monetization setup → Real-time developer notifications → **Send test notification** → Google Cloud → Logging shows "playNotify: test".
**Rollback for C:** rerun the workflow from the previous release tag, or in Firebase → Realtime Database → Rules → History → restore the previous rules.

## D. JC and Becks → your own accounts + Platinum Family (ONE approved step)
Plan: [ACCOUNTS_TIERS_ENERGY.md §5a + §5b](../design/ACCOUNTS_TIERS_ENERGY.md). **Not before section C is done.**
40. **JC** — Agree a quiet time with the Architect (about 30 minutes).
41. **Becks** — Sign in once with **her own** Google account (or Apple / email link) on the new version, so she has her own account. JC does the same with his own account, if it isn't already the joint one.
42. **JC** — Download a **fresh backup** and check it opens; also confirm last night's vault backup ran.
43. **Architect** — Run the migration **dry run** (Google Cloud Shell): `node scripts/migrate-accounts.mjs --jc-uid … --becks-uid … --dry-run`. It prints **counts only**.
44. **JC + Architect** — Compare the counts with the backup (items per person). Go / no-go.
45. **Architect** — Run it for real with `--i-have-a-fresh-backup`. It copies each person's records into their own account, grants **JC = Platinum Family owner** and **Becks = member** (admin grant: no payment, no expiry, never billed), creates the household and sets both Visible + "log for me" (as today). It refuses to run twice. The shared data is **not deleted**.
46. **Check (each of you, on your own account, with `useAccounts` switched on for your phone only — the Coder tells you how):** your own data is there; your tab first, then the other person's; My Plan shows Platinum Family; Becks's Settings says "You're on JC's Platinum Family plan".
**Rollback for D:** switch `useAccounts` off again; you're back on the shared data, which was never changed. Deleting the copied accounts later is a separate, approved step.

## E. The go-live switches — in this order
Settings → **🚦 Go-live switches** (only the admin account sees it). Each switch applies to **everyone** the next time they open the app. **Rollback = untick it.** Check each one before the next.

| # | Switch | Who / when | Check | Rollback |
|---|---|---|---|---|
| 47 | **AI through our server** (`useAiProxy`) | JC, after section C | Ask the Companion a question; Google Cloud → Logging → `aiProxy` shows the call; Vertex AI in the EU region | Untick: the app calls the AI directly again |
| 48 | **Individual accounts** (`useAccounts`) | JC, after section D | Sign out and in: Google, Apple (after J15) and email-link buttons show; you and Becks see your own accounts; a new sign-in starts empty | Untick: everyone is back on the shared data |
| 49 | **Plans** (`useTiers`) | JC, after 48 | My Plan shows; the shared/admin accounts stay all-on; a test account on Bronze sees "… is part of Silver." | Untick: everything on for everyone |
| 50 | **Onboarding + consent** (`useOnboarding`) | JC, after 49 | A brand-new test account gets 18+ → Terms → choices → goal setup; you and Becks are never asked | Untick: no onboarding (consent already given is kept) |
| 51 | **Steps from Health Connect** (`useSteps`) | JC, after 50 and the Health Connect declaration is approved (step 12) | Android app → Settings → Connect my steps → steps appear on Home | Untick: steps stop syncing (stored totals kept) |
| 52 | **Buying** (`showBuyEnergy`) | JC, after J22 and a licence-tester purchase works | Licence tester: Upgrade → Google Play test purchase → My Plan shows the plan; top-up adds Energy | Untick: buttons hidden; subscriptions keep running in Play |

## F. The first pilot test user
53. **JC** — Settings → **🧪 Pilot test users** → type the tester's email → plan **Gold** (default) → **Create invite** → copy the link.
54. **JC** — Send the link to the tester with the internal-testing invite (step 11's list: add their email to the testers list first).
55. **Tester** — Opens the link → signs in **with that email** → **Accept the invite** → onboarding (18+, Terms, choices) → goal setup.
56. **Check:** the tester sees an **empty** app with their own name (never your data); My Plan shows Gold; a Companion answer works.
57. **JC** — Add each further tester the same way (a family: the tester picks Platinum and invites their people from My Plan → My family).

## G. Apple / iOS — later
58. **JC** — **J15**: enrol in the Apple Developer Program.
59. **JC** — **J17**: confirm the spare iPhone can be used for testing.
60. **Coder** — iOS project (Capacitor), Apple Health steps (same steps interface), StoreKit with the same product IDs, TestFlight build (overnight batch Part 6 — not started).
61. **JC** — Firebase → Authentication → **Apple** provider (Services ID, key) — the app's Apple sign-in code is already in place.

---

## H. Open items (the Coder can do these; none blocks A–F unless noted)
- **Android App Check (Play Integrity)** needs a native plugin; until then keep `ENFORCE_APP_CHECK=false`. Web App Check works from step 30.
- **Two NEW accounts in one family** (both start in the same slot) can't be shown side by side yet; JC + Becks are fine (they keep "jc" / "becks"). Needs a per-person key scheme before families of new pilot users share data.
- **Hidden family members** aren't listed as greyed tabs yet (their data is correctly never shown).
- **Per-area sharing** (e.g. exercise visible, weight hidden) — designed for later.
- **iOS** — section G.

## I. For the Architect: private documents to update (vault)
- **DPIA:** Health Connect replaces the Google Health API on Android (daily step / active-calorie totals only, per person, from the device); the consent model (separate opt-ins: AI processing, photo analysis, health sync, body balance; 18+; append-only consent history; withdrawal switches the feature off in app and server); individual accounts + family visibility (Hidden by default, "log for me").
- **Supplier register / ROPA:** Google Play Billing (purchases, verified server-side; Google as independent controller for payments); **Vertex AI, EU region** for Claude (replacing the direct Anthropic API, which remains a fallback); Google Cloud Functions / Pub/Sub / Scheduler / Secret Manager.
- **SAD:** server-side purchase verification + RTDN; Energy ledger (no content); App Check (web on, Android pending); the manual deploy workflow with environment approval; `platform/publicFlags` (admin-only writes); the next rules (individual stores, consent history append-only, server-only plan/energy/purchase paths); the migration script (dry-run counts only).
