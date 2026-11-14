# ADR 0012 — Household and privacy model: own logins, private by default

- **Status:** Accepted (JC decision, 14 Nov 2026). Designed and built locally (rules + functions, emulator-tested); not live.
- **Context:** JC and Becks share one Google login and see and log each other's data. Pilot users (friends and colleagues) need their own accounts and privacy, but couples and families still want joint workouts and shared views. The Architect's rule (13 Nov) already says the admin can't read users' health data.
- **Decision:**
  - Every person has their **own login** (Google, Apple, or email / email link). The joint account is retired at migration.
  - A **household** has **one owner**, who creates it, invites members by email (invite link), removes members and (later) manages household billing. **The owner role grants no access to members' data.**
  - Each person has a **visibility** setting, **Hidden by default**. Hidden: other members see the tab greyed out ("[Name] keeps this private") and no data. Visible: as today.
  - A separate **"Household members can log for me"** toggle, available only when Visible.
  - Data is stored **per area**, so per-area sharing (e.g. exercise yes, weight no) can be added later without moving data.
  - Health connections (Google Health, Apple Health) are per person, from their own login and device.
  - After sign-in the person's own tab comes first, then other members.
  - Enforced in **database rules and server functions**; emulator tests cover hidden, visible, log-for-me and owner cases.
- **Alternatives rejected:**
  - Mutual pairwise consent (the first v2.16.3 design): harder to explain, and no single place to manage a household.
  - Visible by default: wrong default for colleagues in a pilot.
  - Owner can see everything: conflicts with the privacy rule; the owner may be a partner, not a carer.
- **Consequences:** the v2.16.3 consent paths are replaced (nothing live used them). Migration for JC and Becks: Becks gets her own login, her data moves to her `uid`, both set Visible + log-for-me (plan in [design §5a](../design/ACCOUNTS_TIERS_ENERGY.md); executed later with JC's approval and a backup).
