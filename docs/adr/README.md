# Decision log (ADRs)

One short file per significant decision: context, decision, alternatives rejected, consequences, date, status. Number them `NNNN-title.md`. Security-sensitive decisions are recorded in the private SAD, not here. Earlier decisions in full are in the `HANDOVER.md` Session Log.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-environments-and-release-flow.md) | Environments and release flow (build → beta → prod, hotfix route) | Accepted |
| [0002](0002-shared-database-backward-compatible-changes.md) | Beta and prod share the real database; data changes are backward compatible only (expand/contract) | Accepted |
| [0003](0003-nightly-build-refresh.md) | Nightly Build refresh from real data | Accepted (live 13 Nov 2026) |
| [0004](0004-parent-child-eating-model.md) | Parent/child eating model | Accepted |
| [0005](0005-photos-analysed-then-discarded.md) | Photos are analysed and then discarded, never stored | Accepted |
| [0006](0006-portion-based-rag-in-code.md) | Portion-based RAG rating bands computed in code | Accepted |
| [0007](0007-plan-json-single-source.md) | `docs/plan.json` is the single source of the plan | Accepted |
| [0008](0008-automation-via-github-secrets.md) | Automation via GitHub Actions secrets | Accepted (live 13 Nov 2026) |
| [0009](0009-google-sign-in-and-locked-database.md) | Google sign-in and database access locked to approved accounts | Accepted |
| [0010](0010-companion-energy-from-ai-usage.md) | Companion Energy computed from recorded AI usage | Accepted |
| [0011](0011-companion-platform.md) | Accounts, tiers, energy and AI proxy as a reusable Companion platform (`appId`) | Accepted (designed + built locally 14 Nov 2026; not live) |

Candidates not yet written up: the Open pattern and button standard (v2.8.0 / v2.13.0).
