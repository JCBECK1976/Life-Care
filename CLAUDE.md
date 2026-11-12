# Lifecare Companion™ — Claude Code rules

Owner: JC (not a developer). Live app used daily by JC and Becks. Full brief: `MIGRATION_BRIEF.md`.
**Names (JC, 4 Nov 2026):** you (Claude Code) are **Lifecare Companion Coder**; Claude in Chat is **Lifecare Companion Architect**. Use these names with JC and in the docs. Label new Session Log entries **(Coder)**; the Architect's are **(Architect)**. Older (Code)/(Chat) entries keep their labels; where rule 9 says (Code)/(Chat), read (Coder)/(Architect).

## Rules (from MIGRATION_BRIEF.md §0)
1. **Stay in scope.** Only what the brief or JC asks. No drive-by refactors.
2. **Warn before anything token-heavy** (large reads, big rewrites, long test runs).
3. **Trace before you patch.** Find where a failure actually happens first.
4. **One change per version, one deploy per version.** Since v2.0.0 (the Vite cutover): feature/layout = `v2.X.0`, bug fix = `v2.X.Y`. The version lives only in `src/constants/version.js`.
5. **Never break production.** Production changes only after JC has tested a preview and said yes.
6. **Talk plainly.** Short updates: what changed, what to test, what's next. One question at a time.
7. **Ask before anything irreversible** (cutover, deleting files/branches, repo/Pages settings, Firebase rules or data).
8. **Model:** Claude Code runs on Opus 5.5. The app's own AI stays on `claude-sonnet-4-6`; don't change model strings in the app.
9. **`HANDOVER.md` is the project memory. Check it before acting; record in it after acting.** This is how the architect (JC working with Claude in Chat) and you (the builder) stay in sync, because neither remembers the other's conversations.
   - **Read it in full once, at the start of each session.** Note the commit you read it at.
   - **Before every later action or decision, read only what changed since your last read; don't re-read the whole file.** Run `git pull`, then `git diff <last-read-commit> HEAD -- HANDOVER.md`. If the diff is empty, carry on. If not, read just the changed lines, then note the new commit as your last read. Another session (Chat or Code) may have added rules, decisions or open items. If anything conflicts with what you're about to do, stop and ask JC.
   - Your own entries don't need re-reading: you wrote them.
   - **Label every entry you write `(Code)`**, e.g. `### (Code) 4 Nov 2026 — v2.0.0 cutover`. Entries written from Chat are labelled `(Chat)`. The labels let each side read only what the other has added since its own last entry.
   - **After every action** (each version shipped, each checkpoint, each preview or deploy, each fix): add a dated entry to the **Session Log** in `HANDOVER.md` with what was done, the version and commit, what JC needs to test, and anything left open. Update the version table and the "Live Product" version line. Commit and push it in the same step, so it's never left unrecorded.
   - **After every design decision** (yours, JC's, or one JC passes on from Chat): record the decision, the reason and any alternatives rejected under a **Decisions** heading in the Session Log. A decision that isn't written down didn't happen.
   - Keep entries short and factual. Add new Session Log entries at the **end** of the file so diffs stay small. When the Session Log passes about 150 lines, move older entries into `HANDOVER_ARCHIVE.md` (not read routinely) and leave a one-line pointer. Update `TECHNICAL_REFERENCE.md` when the code structure changes and `APP_GUIDE.md` when anything user-visible changes.
10. **Never read `src/App.jsx` in full** (large). Use grep and line ranges; do mechanical moves with scripts.
11. Keep this file short (under 60 lines).

## Session limits and where things go
- Docs (HANDOVER.md etc.) are committed **straight to `main`**. Source: commit to **`build`** → the Architect verifies `/build/` → PR `build → beta` (merge commit) → JC tests `/beta/` → PR `beta → main` (release; the Architect tags it). Never push source straight to `beta` or `main`.
- No tag pushes and no PAT from Coder sessions: report what's needed; the Architect or JC does it.
- **No live Firebase from the Coder.** Dev and tests use the local emulator only. Never run `firebase deploy`.
- The Firebase backup lives outside the repo (`/home/user/firebase-backup/`). Never commit or print it.
- Each (Coder) Session Log entry ends with a **Resume point** (branch, last commit, done, exact next step).

## Dev and checks (run before every preview or deploy)
```
npm install
npm run emulator          # terminal 1: local Firebase emulator on :9000
npm run seed              # load the backup into the emulator under /data
npm run dev               # http://127.0.0.1:5173/Life-Care/ (uses the emulator)
npm run lint              # ESLint: no-undef + React hooks rules, must show 0 errors
npm test                  # Playwright smoke tests (emulator + mocked Claude API)
```

## Deploy (since v2.1.0)
A push to `main`, `beta` or `build` rebuilds all three into Pages: prod `/Life-Care/` (data `data`), `/beta/` (data `data`), `/build/` (data `data_build`). Only main's workflow deploys. Prod failures stop the deploy; beta/build failures skip that environment.
Releases only after JC has tested beta and approved. Rollback: `git revert` the bad release merge on `main` (the previous v2 release redeploys). `legacy.html` was removed in v2.14.2 (history: tag `legacy-v1.374.2`); in an emergency the rules can be reopened in the console.
After a deploy, tell JC to close the tab and reopen it, and check the footer version.

## Pointers
`HANDOVER.md` (memory, session log) · `TECHNICAL_REFERENCE.md` (architecture) · `APP_GUIDE.md` (user guide, read live by Help) · `MIGRATION_BRIEF.md` (the job).
