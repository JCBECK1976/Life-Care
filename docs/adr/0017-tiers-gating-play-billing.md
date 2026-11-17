# ADR 0017 — Four plans (Bronze / Silver / Gold / Platinum Family), gating, and Play Billing verified on the server

- **Status:** Accepted (JC, 17 Nov 2026). Built in v2.22.0 on `build`, behind the flag `useTiers` (on for /build/ only).
- **Context:** ADR 0016 took Stripe out of the native app (Play requires Play Billing for digital goods). JC set the plans and what each one includes on 17 Nov 2026, replacing the 14 Nov three-tier table.
- **Decision:**
  - **The three pillars (Health, Eating, Exercise) are in every plan.** Bronze = manual tracking with no AI; Silver = + the Companion (AI feedback, ratings, Snap, auto info, AI Help); Gold = + automatic planning (meals, shopping list, training plans); Platinum Family = Gold for up to 5 people with **one shared Energy pool**. Household sharing is Platinum only.
  - **Gating in two places:** the client shows "[Feature] is part of Silver." + **See plans** (secondary members: "Ask [owner] about your family plan") and makes no AI call; the server's `aiProxy` refuses features the tier doesn't allow. Tier switches live in `config/tiers`, so the admin can change them without a code change.
  - **Downgrade never deletes data;** everything stays visible, only new AI / generation stops.
  - **Bronze can't edit nutrition values:** totals come only from stored data, so manual tracking stays trustworthy without AI checks.
  - **Payments:** Google Play Billing (subscriptions `silver` / `gold` / `platinum` with `monthly` and `yearly` base plans; consumable `energy_5`), StoreKit later with the same IDs. **Purchases are verified on the server** (Play Developer API + real-time developer notifications); nothing is credited from the client; an idempotent, content-free ledger keyed by the order ID.
  - **JC and Becks:** Platinum Family (admin-granted, never billed) after the per-person-login migration; migration + grant are **one approved step** (JC's go-ahead, fresh backup, Architect verifies). Until then the joint account behaves as Platinum.
- **Rejected:** Stripe in the native app (store rules); crediting on the client after a successful purchase (forgeable); deleting AI-generated content on downgrade (JC: never delete data); per-member pools on Platinum (JC: one shared pool).
- **Consequences:** v2.22.0 ships the gating, My Plan and the server verification with mocked Google endpoints; the real products are created by JC in Play Console (J22) and nothing is charged until the functions are deployed after approval.
