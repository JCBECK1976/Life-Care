# Release v2.30.x (prod jumps from v2.15.1) — checklist

> Written 18 Nov 2026 (Coder) for the release of `build` (now v2.32.1) through beta to prod. Everything new since v2.20
> is behind switches that are **off** on beta and prod; the joint account (JC + Becks) keeps working as today.
> Route: PR `build → beta` → JC tests `/beta/` (part C) → PR `beta → main` → JC tests prod (part C again, short).

## A. Proof that the joint account behaves as today with every new switch off
- **Test:** `tests/release-compat.spec.js` (runs only where the 3 Nov backup exists, local emulator only, **counts only**, never prints data). With no switches on, the joint account opens on the real-shaped backup; every section (Home, My Body, My Exercise, My Eating, My Shop, My Health and its four tabs, Settings) opens with no errors; none of the build-only features appear (symptoms/HRT/GP prep, weigh-ins, sharing, consent, plans, demo, pilot invites, go-live switches); no server function is called.
- **Result (18 Nov):** 32 counts compared before/after — weigh-ins, body fat, measurements, exercises, progress weeks, medicines, medicine history, bloods, vitals, health log, photos per person; every food list; journal entries — **all unchanged**; 100 top-level keys before and after; nothing written to the per-person/area layout; no new-feature fields written.
- **One expected change on first open:** the **goal setup** (v2.18.0, already on beta) opens once for each of you, because the 3 Nov data has no goal yet. Choose a goal and timescale; it's then saved.

## B. Every stored-data change since v2.15.1 — all backward compatible (ADR 0002)
v2.15.1 must still read anything a newer version writes (rollback). It reads `dashboard:data` and the lists whole and writes them back whole, so **fields it doesn't know are kept**.

| Version | What is stored differently | Written with switches off? | Compatible with v2.15.1? |
|---|---|---|---|
| v2.16.0 | Exercise progress weeks keep the Companion's feedback: `prog[].companion {verdict, recommendation, at, decision}` | Yes | Yes — added field, ignored by v2.15.1 |
| v2.16.2 / v2.16.5 | Person `googleDaily` (Google daily calories); old `google_token_jc/becks` keys removed once | Only if Google Health is used | Yes — after a rollback, Google Health needs connecting again (tokens), no health data lost |
| v2.16.7 | `audit` node (who did what, no content; includes the account email); `consent:<person>` keys | Audit: yes · consent: no (`pilotConsent` off) | Yes — new keys, ignored |
| v2.17.1–v2.17.2 | Person `calorieSettings`; one-off clean-up of v2.16 settings that v2.15.1 never had | Yes | Yes |
| v2.18.0–v2.18.1 | Person `goal`, `healthConditions`, recommended target (both values kept) | Yes (goal setup) | Yes — added fields |
| v2.18.3 | One-off refresh of stored selection **ratings** for the current and future weeks (same fields, new values) | Yes | Yes — same shape; past weeks unchanged |
| v2.19.0–v2.19.1 | Food-list items **per portion**: added `portion`, `per100`, `meal`; existing kcal/nutrient fields unchanged; idempotent, nothing deleted | Yes | Yes — added fields (ADR 0015) |
| v2.20.0–v2.20.2 | Conversation summaries are worked out when sending (nothing new stored); a repeated progression note is rewritten once on the next save (same field) | Yes | Yes |
| v2.23.0 | Person `dailyActivity` (steps) | No (`useSteps` off) | Yes |
| v2.24.0–v2.28.x | `apps/lifecare/…` (accounts, households, consent, data by area) — a separate tree | No (`useAccounts`/`useOnboarding` off; the live rules don't allow it yet) | Yes — never touches `data` |
| v2.30.0 | Person `symptoms`, `hrt`, `gpSummaries` | No (`usePilotFeatures` off) | Yes |
| v2.31.0 | Server usage ledger: `cw`, `cr`, per-feature counts (server tree) | Only once the functions run | Yes |
| v2.32.0–v2.32.1 | Person `weighIns`, `tips`; imported weekly weigh-ins `{wk, v, src, day}` | No (`useWeighIns` off) | Yes — `src`/`day` ignored, `v` in the existing stone format |

**Known, not changed:** the stone format is ambiguous from 10 lb (plan BUG-ST) — pre-existing in v2.15.1, unchanged by the release.

## C. JC's regression checklist — Beta first, then Prod (one action per line; tick each)
**Before anything: back up (part D).** Then close the tab, reopen, and check the footer shows the new version.
1. Home: today's summary, meals and Companion Energy show.
2. Home: record today's mood.
3. First open only: set your goal in the goal setup (then check My Profile shows it).
4. My Eating: choose a breakfast for today from your list.
5. My Eating: Open that meal → change the portion → Save.
6. My Eating → Update Eating Lists → Add single item → find a food → add it.
7. Update Eating Lists → Build a meal → add an ingredient → tap the unit → choose grams (it opens from the bottom).
8. My Exercise: log this week for one exercise (weight + reps) → Save.
9. My Exercise: + Add Exercise → search → pick one → choose the type (opens from the bottom) → Add.
10. My Exercise: open an exercise's Progress chart.
11. My Body: Record a weigh-in in stone → it shows on the card and the chart.
12. My Body: delete a test measurement → tap **Undo** → it's back.
13. My Health → Vitals: add a reading.
14. My Health → Medications: Stop one, then Restart it.
15. My Health → General: add a Health Log note.
16. Chat: ask a question → an answer comes; ask a follow-up → it remembers.
17. Help: ask a question → a correct answer.
18. My Eating: My Companion Eating Feedback → it appears.
19. Switch between JC and Becks → each shows their own data.
20. Settings → Privacy & your data → Download my data (a file saves).
21. Prod only, the next morning: open on your phone and check yesterday's entries are all there.

## D. Backup first (before the beta → main merge)
1. **JC** — Settings → Data → **Download backup** (save the file somewhere safe, not in the repo).
2. **JC** — Firebase console → Realtime Database → `data` → ⋮ → **Export JSON** (a second copy).
3. **Architect** — confirm both files open and are dated today before merging.

## E. Rollback (if anything is wrong on prod)
1. **Architect/JC** — on GitHub, **revert the release merge on `main`** (never force-push). The previous release redeploys automatically; close and reopen the app; check the footer shows v2.15.1.
2. Data needs nothing: every change in part B is readable by v2.15.1. Google Health may need connecting again.
3. Only if data itself is damaged: Settings → Data → **Full restore** from the backup in D1 (this overwrites everything entered since the backup — note anything typed after it first).
4. Tell the Coder what happened (HANDOVER entry); fix on `build`, then release again through beta.
