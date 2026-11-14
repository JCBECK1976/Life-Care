# Accounts, tiers and Companion Energy — design

> **Status:** design + local build only (14 Nov 2026, Coder overnight Step 4). **Nothing here is deployed or live.** Go-live needs JC's approval, a fresh backup and the setup in HANDOVER ("Step 4 — JC setup before go-live").
> Public-safe: it states the principles. Access-control specifics, threat model and keys stay in the Architect's private SAD.

Related: [ADR 0011 Companion platform](../adr/0011-companion-platform.md) · [HLD](../HLD.md) · [Payments statement](../legal/PAYMENTS_STATEMENT.md) · plan G4, G5, G7, P2, SAD-A1.

## 1. Goals
- Every person has **their own login** (Google, Apple, or email / email link) and their own data. The shared joint Google account is retired at migration.
- People can form a **household** to see each other's data and log for each other, **only if each person chooses to** (default: private).
- **Bronze / Silver / Gold** tiers whose features are switched in admin, with no code change.
- **Subscriptions** and **Companion Energy packs**, paid through a payment provider (Stripe for the web app; store billing for store apps).
- The AI is called **only from the server** (EU region), which checks the account, tier and energy, and records usage. The API key leaves the app.
- **Reusable:** this is the first app on the **Companion platform** (CompanionApps.studio). Each app's data is kept apart under its `appId` ([ADR 0011](../adr/0011-companion-platform.md)).
- Household and privacy model: [ADR 0012](../adr/0012-household-privacy-model.md) (JC decision, 14 Nov 2026).

## 2. Hard rules
- **The admin cannot read users' health data** (Architect, 13 Nov 22:40, JC approved; pilot users include JC's colleagues). Admin sees only account status, tier, energy balance, Tracker/feedback entries (masked) and anonymised aggregates.
- **The household owner gets no access to members' data** from being owner. Owner = household administration only.
- **Each person's data is hidden by default**, also from their household.
- All of this is enforced in the **database rules and server functions**, not only in the user interface.

## 3. Data layout (target)
```
apps/{appId}/users/{uid}/profile          { name }                          — self writes; household members can read (tab label)
apps/{appId}/users/{uid}/privacy          { visible: false, logForMe: false, areas?: { exercise: true, body: false … } }
                                                                            — self writes; household members can read (to grey a tab)
apps/{appId}/users/{uid}/data/{area}/…    the person's own data, split by area (exercise, body, eating, health, mood, journal …)
apps/{appId}/users/{uid}/consent          P9 consent + accepted legal versions (P8)
apps/{appId}/households/{hid}             { owner, members: {uid: true}, invites: {code: {email, created}} } — server writes only
apps/{appId}/memberOf/{uid}               hid                                — server writes only
apps/{appId}/entitlements/{uid}           { tier, since, source }            — server only
apps/{appId}/energy/{uid}                 { balancePence, updated }          — server only
apps/{appId}/ledger/{uid}/{entryId}       { at, kind: debit|credit, pence, ref } — server only, no content
apps/{appId}/usage/{uid}/{day}            { n, in, out, costPence }          — server only, counts only
apps/{appId}/config/tiers                 tier switches and prices           — admin edits
apps/{appId}/admin/accounts/{uid}         { status, tier, balancePence }     — the admin's view (no health data)
platform/admins/{uid}                     true
```
- `appId` for this app: `lifecare`.
- Data is split **by area** so per-area sharing can be added later (e.g. exercise visible, weight hidden): `privacy.areas.{area}`. Until that option exists, `areas` is absent and `visible` covers every area.
- Today's shared paths (`data/…`) stay readable until the migration is done (expand, then contract — [ADR 0002](../adr/0002-shared-database-backward-compatible-changes.md)).

## 4. Household and privacy
- **One owner** per household. The owner creates it, invites members by email (invite link), removes members, and later manages household billing. **Being owner grants no access to anyone's data.**
- **Joining:** the invited person opens the link and signs in with their own login; the invite's email must match their sign-in email.
- **Visibility (per person, default Hidden):**
  - **Hidden:** other members see that person's tab **greyed out** with "[Name] keeps this private", and no data.
  - **Visible:** members can see that person's data, as JC and Becks see each other's today.
  - Later option: per-area sharing (e.g. exercise yes, weight no), using `privacy.areas`.
- **"Household members can log for me"** (separate toggle, only available when Visible): lets members add entries for you (joint workouts). Turning Visible off turns this off too.
- **Tabs:** after sign-in the person's own tab comes first, then the other members.
- **Health connections** (Google Health, Apple Health) are per person, set up from each person's own login and device.
- Rules: a member may read another's `data/{area}` only if both are in the same household **and** that person is Visible (and the area isn't switched off). They may write there only if, in addition, "log for me" is on. Leaving or being removed ends access at once.

## 5. Sign-in (folds in plan S1 / P1)
- Providers: **Google**, **Apple** (needed for the iOS app), and **email** (email link, so no password to remember).
- The sign-in screen shows the three options. A hint for desktop users: "On a computer? Choose **Try another way** if Google asks for your phone."
- JC enables the **Email link** and **Apple** providers in Firebase Authentication (and an Apple Services ID) before this goes live.
- One login per person; the joint Google account is retired at migration.

## 5a. Migration of JC and Becks (plan only — **NOT executed**)
Needs JC's approval, a fresh backup (Data → Download backup **and** the nightly vault backup) and a quiet time.
1. Freeze: put the app in read-only mode (admin flag) for the migration window.
2. Back up: download a full backup and check it opens.
3. Becks gets **her own login** (Google, Apple or email). JC keeps his. Each signs in once on the new version, so each has a `uid`.
4. A one-off script (run by the Architect/JC with the service account, not from the app) copies `dashboard:data.jc` → `apps/lifecare/users/{jcUid}/data/{area}`, `…becks` → Becks's `uid`, plus each person's keyed items (`journal_jc`, `eat_children:jc:*`, …). Shared items (food lists, defaults) are copied to both.
5. JC creates the household and invites Becks; Becks accepts. Both set **Visible** and **Household members can log for me** (as today).
6. Verify counts per person (no content printed), then switch the app to the new paths (flag).
7. Retire the joint Google account from the app (remove its access).
8. Keep the old paths read-only for 30 days, then delete them (separate approval).
Rollback: switch the flag back; the old paths are unchanged until step 8.

## 6. Tiers (JC, 14 Nov 2026 — defaults; the admin can change them without a code change)
| | Bronze | Silver | Gold |
|---|---|---|---|
| Price | free | £5.99/month or £49/year | £9.99/month or £79/year |
| AI allowance (AI cost included per month) | ≈ £0.20 | £1.50 | £2.50 |
| Manual tracking, ratings, Help | ✓ | ✓ | ✓ |
| AI feedback, Snap (photo checks), meal generator | — | ✓ | ✓ |
| Body balance, AI-built plans, health sync, household | — | — | ✓ |

**Energy packs, any tier:** £5 (= £2.50 of AI cost) and £10 (= £5 of AI cost).
Stored as switches per tier in `apps/{appId}/config/tiers` (`help`, `aiFeedback`, `snap`, `mealGenerator`, `bodyBalance`, `aiPlans`, `healthSync`, `household`, plus `pricePence`, `yearlyPence`, `allowancePence`). The client hides switched-off features; the server refuses AI calls for them.

## 7. Subscriptions and Companion Energy
- **Energy** = money for AI, held as **pence of AI cost** on the server. Each AI call debits its **actual cost** (from the model's token prices). The client shows a percentage only.
- **Packs at 100 % mark-up:** a pack's price is twice the AI cost it credits. **£5 pack → £2.50 of AI cost.**
  - Card fees (Stripe UK, about 1.5 % + 20p) come out of the margin: on a £5 pack, roughly £0.28, so the margin is about £2.22.
  - VAT applies only if the business becomes VAT-registered.
- **Subscriptions** (tier price TBC) include a monthly energy allowance, credited on each successful renewal.
- **Payments:** Stripe Checkout (hosted) for the web, so card data never touches our systems (SAQ A). A webhook confirms the payment and credits energy; nothing is credited from the browser.
- **Ledger:** append-only debit/credit entries (amount, time, reference; **no content**). The balance changes only inside a server transaction.

## 8. Server functions (local build: `functions/`, emulator only)
| Function | What it does |
|---|---|
| `aiProxy` | Signed-in only. Checks the tier allows the feature and the balance is above zero, calls Claude (**Vertex AI EU** when `AI_BACKEND=vertex`; the current direct API path as the fallback until JC switches), records usage, debits the cost. Adds the medication safety rule (P7). |
| `createHousehold`, `inviteMember`, `acceptInvite`, `removeMember`, `leaveHousehold` | Household administration (owner invites/removes; the invitee accepts with the code and a matching sign-in email). No data access comes with it. |
| `setTier` | Admin only: set a person's tier. |
| `adminAccounts` | Admin only: the account list (status, tier, balance) with **no health data**. |
| `createCheckout` | Signed-in only: a Stripe Checkout session (test mode) for an energy pack. |
| `stripeWebhook` | Verifies Stripe's signature, then credits the pack's energy once per payment (idempotent). |
| `grantMonthly` | (later) monthly allowance per tier. |

The region is `europe-west1`. Configuration comes from environment/secrets: no keys in the repository.

## 9. Client
Behind flags, **all off by default**: `useAiProxy`, `useAccounts`, `showBuyEnergy`. With every flag off the app behaves exactly as today.

## 10. Database rules (next)
`database.rules.next.json` (**not deployed**) implements §2–§4: own data only by default; household members read another member's data only when that person is Visible (per area if `areas` is set) and write only when "log for me" is also on; `logForMe` can't be on while Hidden; households and membership are written by server functions only; the owner has no extra data access; entitlements, energy, ledger and usage are server-only; admins read `admin/accounts` and the Tracker, never `users/*`. Emulator tests: `functions/test/rules.test.mjs`.
