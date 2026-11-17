# Accounts, tiers and Companion Energy — design

> **Status:** design + local build only (14 Nov 2026, Coder overnight Step 4; §6–7 revised 17 Nov 2026 — four plans, Play Billing). **Nothing here is deployed or live.** Go-live needs JC's approval, a fresh backup and the setup in HANDOVER ("Step 4 — JC setup before go-live").
> Public-safe: it states the principles. Access-control specifics, threat model and keys stay in the Architect's private SAD.

Related: [ADR 0011 Companion platform](../adr/0011-companion-platform.md) · [HLD](../HLD.md) · [Payments statement](../legal/PAYMENTS_STATEMENT.md) · plan G4, G5, G7, P2, SAD-A1.

## 1. Goals
- Every person has **their own login** (Google, Apple, or email / email link) and their own data. The shared joint Google account is retired at migration.
- People can form a **household** to see each other's data and log for each other, **only if each person chooses to** (default: private).
- **Bronze / Silver / Gold / Platinum Family** plans whose features are switched in admin, with no code change (§6, JC 17 Nov 2026).
- **Subscriptions** and a **Companion Energy top-up**, paid through **store billing** (Google Play Billing; Apple later). Stripe is kept out of the native apps.
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

## 5b. JC and Becks → Platinum Family: ONE approved step (plan only — **NOT executed**)
JC (17 Nov 2026): "Plan the migration and the Platinum grant as ONE approved step; don't execute without JC's go-ahead, a fresh backup and the Architect verifying."
**Before:** JC says go · fresh backup (Data → Download backup **and** the nightly vault backup) checked to open · the server functions deployed (separately approved) · the Architect has reviewed the script and the target rules.
1. Freeze: read-only mode (admin flag) for the window.
2. Becks creates **her own login**; each of you signs in once on the new version (each gets a `uid`).
3. The §5a copy script moves each person's data to `apps/lifecare/users/{uid}/data/{area}` (counts per person checked, no content printed).
4. **Grant** (admin, `setTier`): JC → `platinum` (source `admin`, no payment, no expiry, never billed); Becks needs no entitlement of her own — she gets Platinum as a member.
5. JC creates the household (My Plan → My family) and invites Becks by email; Becks accepts with her own login.
6. Both set **Visible** and **Household members can log for me** (as today).
7. Admin tops up the family pool for testing (`adminTopUp`, free) — the pool starts at £7.50/month.
8. Verify with the Architect: JC's My Plan shows Platinum Family owner, Becks's Settings shows "You're on JC's Platinum Family plan", each sees the other's tab, AI works for both, counts match the backup.
9. Switch the app to the new paths (flag); retire the joint account from the app; the joint UID stays protected from deletion.
**Rollback:** switch the flag back; the old `data/…` paths are untouched until §5a step 8 (separately approved).

## 6. Tiers (JC, 17 Nov 2026 — replaces the 14 Nov table; defaults, the admin can change them in `config/tiers` without a code change)
**Principle (JC):** the three pillars — **Health, Eating, Exercise** — are in every plan. **Bronze** = manual tracking, no AI. **Silver** = + the Companion (AI feedback and auto-generated info). **Gold** = + automatic planning. **Platinum Family** = Gold for up to 5 people.

| | Bronze | Silver | Gold | Platinum Family |
|---|---|---|---|---|
| Price | free | £5.99/month or £49/year | £9.99/month or £79/year | £15.99/month or £159/year |
| Companion Energy included (AI cost per month) | £0 (no AI) | £1.50 | £2.50 | £7.50, one **shared family pool** |
| People | 1 | 1 | 1 | up to 5 (owner + 4 invited) |
| **Body:** manual entries, progress, charts | ✓ | ✓ | ✓ | ✓ |
| **Health:** vitals, meds, bloods (record only) | ✓ | ✓ | ✓ | ✓ |
| **Exercise:** built-in list or own, log, progress, rules-based progression | ✓ | ✓ | ✓ | ✓ |
| **Eating:** built-in foods, UK products, own lists, Build a meal (totals from stored data; nutrition values not editable) | ✓ | ✓ | ✓ | ✓ |
| Shopping list (manual), mood and journal, colour theme | ✓ | ✓ | ✓ | ✓ |
| Help | searchable FAQ (from the user guide, no AI) | + Ask the Companion | + | + |
| Food ratings (RAG), Snap, "My own" item, auto-generated info | — | ✓ | ✓ | ✓ |
| Companion feedback (exercise, eating, body, health) and chat | — | ✓ | ✓ | ✓ |
| Body balance, steps / health sync | — | ✓ | ✓ | ✓ |
| Generate meals, generate shopping list, AI training plans (incl. warm-up / cool-down) | — | — | ✓ | ✓ |
| Household sharing (visibility, "log for me") | — | — | — | ✓ |
| Buy an Energy top-up | — | ✓ | ✓ | ✓ (into the family pool) |

Feature switches per tier in `apps/{appId}/config/tiers/{tier}`: `foodRatings`, `snap`, `myOwnItem`, `aiFeedback`, `chat`, `aiHelp`, `autoInfo`, `bodyBalance`, `healthSync`, `mealGenerator`, `shoppingGenerator`, `aiPlans`, `household`, `buyEnergy`, `editNutrition`, plus `pricePence`, `yearlyPence`, `allowancePence`, `maxMembers`, `sharedPool`.

**Gating (client and server):**
- A feature the plan doesn't include shows **"[Feature] is part of Silver."** (or Gold / Platinum) with **See plans**, which opens Settings → My Plan. No AI call is made.
- A Platinum **secondary member** sees **"Ask [owner] about your family plan"** instead (members can't buy).
- The server (`aiProxy`) refuses any AI call the person's tier doesn't allow (`permission-denied`), whatever the client sends.
- **Downgrade keeps all data**, and all of it stays visible; only new generation / AI stops. Nothing is ever deleted on a plan change.
- **Pilot:** the admin can set any tier by hand (`source: "admin"`, no payment, no expiry, never billed); pilot testers get Gold free.

**Settings → My Plan** (collapsible, collapsed by default, under the colour theme): current plan, renewal date and Companion Energy % (not for Bronze) · comparison of the four plans with a monthly / yearly toggle, the current plan highlighted · Upgrade / Change plan / Manage or cancel (opens the store's subscription page) · "Top up Companion Energy: £5" (Silver and up) · Platinum owner only: **My family** (members, invite by email, remove, family pool %). A Platinum secondary member's Settings shows only the colour theme and "You're on [owner]'s Platinum Family plan".

**JC and Becks:** when tiers go live, JC = **Platinum Family owner**, Becks = Platinum member, admin-granted (source "admin", no payment, no expiry, never billed). This needs the §5a migration first (Becks's own login, household created and joined, both Visible + "log for me"). **The migration and the Platinum grant are ONE approved step**: not executed without JC's go-ahead, a fresh backup and the Architect verifying. Until then the joint account behaves as Platinum (all features on). The family pool starts at £7.50/month; the admin can top it up free for testing.

## 7. Subscriptions, Companion Energy and payments (JC, 17 Nov 2026)
- **Energy** = money for AI, held as **pence of AI cost** on the server. Each AI call debits its **actual cost**. The client shows a percentage only. Bronze has no Energy.
- **Allowance:** each plan's monthly allowance is credited on each successful renewal (Platinum: once, into the family pool, not per member).
- **Top-up:** one product, **£5 → £2.50 of AI cost**, Silver / Gold / Platinum only (Platinum top-ups go into the family pool). Store fees come out of the margin.
- **Family pool:** one balance per Platinum family (`familyEnergy/{ownerUid}`, ledger `familyLedger/{ownerUid}`); every member's AI calls debit it; when it's empty, AI stops for the whole family until renewal or a top-up. Capped by what was credited — never negative.
- **Payments (PAY1, native apps):**
  - **Android:** Google Play Billing. Subscriptions `silver`, `gold`, `platinum`, each with base plans `monthly` and `yearly`; consumable in-app product `energy_5`. **iOS (later):** StoreKit with the same product IDs.
  - The app only starts the purchase and sends the **purchase token** to the server. The server **verifies it with the Play Developer API**, then sets the entitlement or credits Energy. **Nothing is credited from the client.**
  - **Real-time developer notifications** (Play → Pub/Sub → server function) keep entitlements current: renewals credit the allowance; cancellation keeps the plan to the end of the paid period; expiry returns the person to Bronze (data kept).
  - **Idempotent ledger:** one entry per purchase / renewal (keyed by the order ID), amount, time and reference only, **no content**; a replayed token or notification changes nothing.
  - **Stripe stays out of the native apps.** The Stripe code remains, switched off, for a possible web-only route later.
- **Admin grants** (pilot, JC and Becks): `entitlements/{uid}` = `{ tier, source: "admin" }` with no expiry; never billed, never touched by store notifications.

## 8. Server functions (local build: `functions/`, emulator only)
| Function | What it does |
|---|---|
| `aiProxy` | Signed-in only. Checks the tier allows the feature and the balance is above zero, calls Claude (**Vertex AI EU** when `AI_BACKEND=vertex`; the current direct API path as the fallback until JC switches), records usage, debits the cost. Adds the medication safety rule (P7). |
| `createHousehold`, `inviteMember`, `acceptInvite`, `removeMember`, `leaveHousehold` | Household administration (owner invites/removes; the invitee accepts with the code and a matching sign-in email). No data access comes with it. |
| `setTier` | Admin only: set a person's tier. |
| `adminAccounts` | Admin only: the account list (status, tier, balance) with **no health data**. |
| `createCheckout` | Signed-in only: a Stripe Checkout session (test mode) for an energy pack. |
| `stripeWebhook` | Verifies Stripe's signature, then credits the pack's energy once per payment (idempotent). |
| `playVerify` | Signed-in only: verifies a Play purchase token with the Play Developer API, then sets the entitlement or credits the top-up (idempotent by order ID). |
| `playNotify` | Real-time developer notifications (Pub/Sub push): renewals credit the allowance, expiry returns to Bronze. |
| `familyPool` | Platinum: one shared Energy pool per household; members' AI calls debit it. |
| `grantMonthly` | (later) monthly allowance per tier. |

The region is `europe-west1`. Configuration comes from environment/secrets: no keys in the repository.

## 9. Client
Behind flags, **all off by default**: `useAiProxy`, `useAccounts`, `showBuyEnergy`, `useTiers` (v2.22.0: on for /build/ only until JC approves). With every flag off the app behaves exactly as today.

## 10. Database rules (next)
`database.rules.next.json` (**not deployed**) implements §2–§4: own data only by default; household members read another member's data only when that person is Visible (per area if `areas` is set) and write only when "log for me" is also on; `logForMe` can't be on while Hidden; households and membership are written by server functions only; the owner has no extra data access; entitlements, energy, ledger and usage are server-only; admins read `admin/accounts` and the Tracker, never `users/*`. Emulator tests: `functions/test/rules.test.mjs`.
