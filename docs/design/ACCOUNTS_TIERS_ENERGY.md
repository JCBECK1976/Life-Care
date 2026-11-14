# Accounts, tiers and Companion Energy — design

> **Status:** design + local build only (14 Nov 2026, Coder overnight Step 4). **Nothing here is deployed or live.** Go-live needs JC's approval, a fresh backup and the setup in HANDOVER ("Step 4 — JC setup before go-live").
> Public-safe: it states the principles. Access-control specifics, threat model and keys stay in the Architect's private SAD.

Related: [ADR 0011 Companion platform](../adr/0011-companion-platform.md) · [HLD](../HLD.md) · [Payments statement](../legal/PAYMENTS_STATEMENT.md) · plan G4, G5, G7, P2, SAD-A1.

## 1. Goals
- Every person has **their own account** (own Google sign-in) and their own data.
- JC and Becks can still **log for each other**, through a **household** link that both have agreed to.
- **Bronze / Silver / Gold** tiers whose features are switched in admin, with no code change.
- **Subscriptions** and **Companion Energy packs**, paid through a payment provider (Stripe for the web app; store billing for store apps).
- The AI is called **only from the server** (EU region), which checks the account, tier and energy, and records usage. The API key leaves the app.
- **Reusable:** this is the first app on the **Companion platform** (CompanionApps.studio). Each app's data is kept apart under its `appId` ([ADR 0011](../adr/0011-companion-platform.md)).

## 2. Hard rule: the admin cannot read other people's health data
(Architect, 13 Nov 22:40, JC approved.) Pilot users include JC's colleagues.
- Admin sees only: **account status, tier, energy balance, Tracker/feedback entries (masked), anonymised aggregates.**
- Enforced in the **database rules and the server functions**, not just the user interface. Admin rights don't give read access to anyone's health data path.
- Household members see each other's data **only with explicit mutual consent**, and either person can withdraw it.

## 3. Data layout (target)
```
apps/{appId}/users/{uid}/data/…        the person's own app data (today's "dashboard:data" person block, eating, journal …)
apps/{appId}/users/{uid}/profile       name, consent record (P9), accepted legal versions (P8)
apps/{appId}/households/{hid}          { members: {uid: true}, invites … }
apps/{appId}/consents/{uid}/{otherUid} true when uid lets otherUid view/log its data (both directions needed for "household")
apps/{appId}/entitlements/{uid}        { tier, since, source }                         — written by server functions only
apps/{appId}/energy/{uid}              { balancePence, updated }                       — server only
apps/{appId}/ledger/{uid}/{entryId}    { at, kind: debit|credit, pence, ref }          — server only, no content
apps/{appId}/usage/{uid}/{day}         { n, in, out, costPence }                       — server only, counts only
apps/{appId}/config/tiers              { bronze: {features…}, silver: {…}, gold: {…} } — admin edits (no code change)
apps/{appId}/admin/accounts/{uid}      { status, tier, balancePence, created }         — the admin's view (no health data)
platform/admins/{uid}                  true
```
- `appId` for this app: `lifecare`.
- Today's shared paths (`data/…`) stay readable until the migration is done (expand, then contract — [ADR 0002](../adr/0002-shared-database-backward-compatible-changes.md)).

## 4. Household
- A person invites another by email. The other accepts. Each person then has a consent switch: "let {name} view and log my data".
- Logging for someone else writes **into that person's own path**, and is allowed only while their consent is on.
- The person switcher shows "you" plus the household members who have consented.

## 5. Migration of JC and Becks's shared data (plan only — **NOT executed**)
Needs JC's approval, a fresh backup (Data → Download backup **and** the nightly vault backup) and a quiet time.
1. Freeze: put the app in read-only mode (admin flag) for the migration window.
2. Back up: download a full backup and check it opens.
3. JC and Becks each sign in once on the new version, so each has a `uid`.
4. A one-off script (run by the Architect/JC with the service account, not from the app) copies `dashboard:data.jc` → `apps/lifecare/users/{jcUid}/data`, `…becks` → Becks's path, plus each person's keyed items (`journal_jc`, `eat_children:jc:*`, …). Shared items (food lists, defaults) are copied to both.
5. Create the household for JC + Becks, with mutual consent on.
6. Verify counts per person (no content printed), then switch the app to the new paths (flag).
7. Keep the old paths read-only for 30 days, then delete them (separate approval).
Rollback: switch the flag back; the old paths are unchanged until step 7.

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
| `setTier` | Admin only: set a person's tier. |
| `adminAccounts` | Admin only: the account list (status, tier, balance) with **no health data**. |
| `createCheckout` | Signed-in only: a Stripe Checkout session (test mode) for an energy pack. |
| `stripeWebhook` | Verifies Stripe's signature, then credits the pack's energy once per payment (idempotent). |
| `grantMonthly` | (later) monthly allowance per tier. |

The region is `europe-west1`. Configuration comes from environment/secrets: no keys in the repository.

## 9. Client
Behind flags, **all off by default**: `useAiProxy`, `useAccounts`, `showBuyEnergy`. With every flag off the app behaves exactly as today.

## 10. Database rules (next)
`database.rules.next.json` (**not deployed**) implements §2–§3: people read/write only their own `users/{uid}`; household access needs both consents; entitlements, energy, ledger and usage are server-only; admins can read `admin/accounts` and the Tracker, never `users/*`. Emulator tests: `functions/test/rules.test.mjs`.
