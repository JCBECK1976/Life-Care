# Google Play setup — JC's steps (J18–J21)

> Coder, 17 Nov 2026, for v2.21.0. One action per step. Needs **J16** (Google Play Console account) first. Nothing here is done by the Coder (no keys, no consoles).
> Keys rule: the **upload key** lives only in GitHub Actions secrets + **one offline backup copy in your password manager**. Never in the vault, the repo, email or chat.
> The workflow **Android → Play internal testing** appears in GitHub Actions once v2.21.0 is released to `main` (GitHub only offers manual workflows that exist on the default branch).

## J18 — Create the upload key and give it to GitHub (on your PC)
1. Install **Temurin JDK 21** from adoptium.net (it includes `keytool`).
2. Make a folder outside the vault and outside any repo, e.g. `Documents\LifecareKey`, and open a terminal there (Windows: right-click → Open in Terminal).
3. Run: `keytool -genkeypair -v -keystore lifecare-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000` — choose a strong password and use the same one when asked for the key password; name: `Companion Apps Studio`.
4. In your **password manager**, create an item "Lifecare Companion — Android upload key": store the password, the alias `upload`, and **attach the file `lifecare-upload.jks`** (this is the offline backup copy).
5. Copy the key as text: Windows PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("lifecare-upload.jks")) | Set-Clipboard` (Mac: `base64 -i lifecare-upload.jks | pbcopy`).
6. GitHub → Life-Care → Settings → Secrets and variables → Actions → **New repository secret** `ANDROID_UPLOAD_KEYSTORE_BASE64` → paste.
7. New repository secret `ANDROID_UPLOAD_STORE_PASSWORD` → the password.
8. New repository secret `ANDROID_UPLOAD_KEY_PASSWORD` → the same password.
9. New repository secret `ANDROID_UPLOAD_KEY_ALIAS` → `upload`.
10. Clear the clipboard (copy any other text) and **delete** `lifecare-upload.jks` from the folder (the password manager copy is the backup; if the key is ever lost, Play can reset the upload key).

## J19 — Create the app in Play Console and the internal test
11. Play Console → **Create app**: name `Lifecare Companion`, language English (UK), App, Free; tick the declarations → Create.
12. Testing → **Internal testing** → Testers → **Create email list** "Lifecare household" with your and Becks's Google accounts → Save.
13. After v2.21.0 is on `main`: GitHub → Actions → **Android → Play internal testing** → Run workflow with `ref` = `main` and **upload unticked** (the first upload must be by hand).
14. When it finishes, open the run → Artifacts → download **lifecare-aab-N** and unzip it (`app-release.aab`).
15. Play Console → Internal testing → **Create new release** → when asked about app signing, keep **"Use Google-generated key" (Play App Signing)** → Continue.
16. Upload `app-release.aab` → Next → Save → **Start rollout to Internal testing**.
17. Setup → **App integrity** → App signing: copy the **App signing key certificate SHA-1** (Play App Signing key) to a note.
18. Same page: copy its **SHA-256**.
19. Same page: copy the **Upload key certificate SHA-1** (it also appears in each workflow run's summary).
20. Same page: copy the upload key **SHA-256**.

## J20 — Firebase: register the Android app and its fingerprints (so Google sign-in works)
21. Firebase console → Project settings → General → **Add app → Android**: package `com.companionappsstudio.lifecare`, nickname `Lifecare Android` → Register (skip the file download; the app doesn't need it).
22. In that app → **Add fingerprint** → the Play App Signing **SHA-1** (step 17).
23. Add fingerprint → the Play App Signing **SHA-256** (step 18).
24. Add fingerprint → the upload key **SHA-1** (step 19).
25. Add fingerprint → the upload key **SHA-256** (step 20).
26. Firebase → Authentication → Sign-in method → Google → **Web SDK configuration** → copy the **Web client ID** (ends `.apps.googleusercontent.com`).
27. GitHub → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable `GOOGLE_WEB_CLIENT_ID` → paste (a client ID is not secret).
28. Google Cloud console (project life-care-app-64d04) → APIs & Services → Credentials → open the **Browser key**: if "Application restrictions" is set to Websites, add `https://localhost/*` (the app's own origin inside Android) → Save.
29. *(Developers only, optional)* to sign in on a **debug** build in an emulator: add a second Android app `com.companionappsstudio.lifecare.debug` with the SHA-1 from `cd android && ./gradlew signingReport` (debug variant). Debug builds use `data_build`, never real data.

## J21 — Let GitHub upload to the internal track (service account)
30. Google Cloud console → **APIs & Services → Library** → enable **Google Play Android Developer API**.
31. IAM & Admin → **Service accounts** → Create service account `play-uploader` (no project roles) → Done.
32. Open `play-uploader` → Keys → **Add key → Create new key → JSON** (it downloads).
33. Play Console → **Users and permissions** → Invite new users → the service account email → App permissions: Lifecare Companion → tick **Release to testing tracks** only → Invite.
34. GitHub → New repository secret `PLAY_SERVICE_ACCOUNT_JSON` → paste the whole JSON file content.
35. **Delete** the downloaded JSON file (a new key can be made at any time; don't keep a copy).
36. GitHub → Actions → **Android → Play internal testing** → Run workflow: `ref` = `main`, upload **ticked**, status **completed** → the new build appears in Internal testing.
37. Play Console → Internal testing → Testers → **Copy link**, open it on your phone → **Accept invite** → Install from Google Play.
38. Send Becks the same link; she accepts and installs from Google Play.
39. On the phone: open Lifecare Companion → **Sign in with Google** (Android's account picker) → check the footer shows **v2.21.0** and your real data (release builds use `data`).

## J22 — Plans and the Energy top-up in Play Console (v2.22.0, PAY1)
Nothing is charged until the server functions are deployed (a separate, approved step). Licence testers are never charged.
40. Play Console → **Setup → Payments profile** → create or link the merchant (payments) profile for Companion Apps Studio™ (needed before anything can be sold).
41. Play Console → Lifecare Companion → **Monetize with Play → Products → Subscriptions** → **Create subscription**: Product ID `silver`, name **Silver** → Create.
42. In `silver` → **Add base plan**: ID `monthly`, Auto-renewing, billing period **1 month**, price **£5.99** (United Kingdom) → Save → **Activate**.
43. In `silver` → **Add base plan**: ID `yearly`, Auto-renewing, billing period **1 year**, price **£49** → Save → **Activate**.
44. **Create subscription**: Product ID `gold`, name **Gold** → Create.
45. In `gold` → base plan `monthly`, 1 month, **£9.99** → Save → Activate.
46. In `gold` → base plan `yearly`, 1 year, **£79** → Save → Activate.
47. **Create subscription**: Product ID `platinum`, name **Platinum Family** → Create.
48. In `platinum` → base plan `monthly`, 1 month, **£15.99** → Save → Activate.
49. In `platinum` → base plan `yearly`, 1 year, **£159** → Save → Activate.
50. **Monetize with Play → Products → One-time products** → **Create product**: Product ID `energy_5`, name **Companion Energy top-up**, description "£2.50 of Companion Energy", price **£5** → Save → **Activate**.
51. Play Console (All apps) → **Settings → License testing** → add your Google account and Becks's → License response **RESPOND_NORMALLY** → Save. (Purchases by these accounts use test cards and are never charged.)
52. Google Cloud console (project life-care-app-64d04) → **IAM & Admin → IAM** → copy the email of the **Cloud Functions default service account** (the server uses it to ask Google about purchases).
53. Play Console → **Users and permissions** → Invite new users → paste that email → App permissions: Lifecare Companion → tick **View financial data** and **Manage orders and subscriptions** only → Invite.
54. Google Cloud console → **Pub/Sub → Topics** → **Create topic** with ID `play-rtdn` (no default subscription needed) → Create.
55. Open `play-rtdn` → **Permissions** → Add principal `google-play-developer-notifications@system.gserviceaccount.com` with role **Pub/Sub Publisher** → Save.
56. Play Console → Lifecare Companion → **Monetize with Play → Monetization setup** → Real-time developer notifications → Topic name `projects/life-care-app-64d04/topics/play-rtdn` → Save.
57. Same page → **Send test notification** (after the functions are deployed it shows in the function log as "playNotify: test").
58. Tell the Coder/Architect J22 is done. The functions (`playVerify`, `playNotify`) are deployed only after JC approves, with a fresh backup.

## Fingerprints — which go where
| Key | Where it comes from | Register in Firebase (Android app) |
|---|---|---|
| **Debug** (developers' emulators, `…lifecare.debug`) | `./gradlew signingReport` on the developer's machine | Only on the optional debug app (step 29) |
| **Upload key** (CI signs every AAB with it) | Play Console → App integrity (or the workflow run summary) | Yes — SHA-1 + SHA-256 (steps 24–25) |
| **Play App Signing key** (Google re-signs what users install) | Play Console → App integrity → App signing key certificate | Yes — SHA-1 + SHA-256 (steps 22–23) — **this is the one installed apps actually carry** |
