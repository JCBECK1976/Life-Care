# Lifecare Companion™ — documents

Structure agreed 6 Nov 2026 23:10 (see HANDOVER). **Public** documents are here; **security-sensitive** documents are in the private vault repository and are never copied here.

| Document | Where | Status |
|---|---|---|
| High-level design | [HLD.md](HLD.md) | Draft 1 (12 Nov) |
| Low-level design | [LLD.md](LLD.md) | Version 1 (13 Nov, prod v2.15.1); `TECHNICAL_REFERENCE.md` now points here |
| Test strategy | [TEST_STRATEGY.md](TEST_STRATEGY.md) | Draft 1 (12 Nov) |
| Changelog / release notes | [CHANGELOG.md](CHANGELOG.md) | Moved from HANDOVER (12 Nov) |
| Plan (single source) | [plan.json](plan.json) | Every item with phase, status, priority, Token %; published as `/Life-Care/plan.json` and loaded into the admin Tracker (v2.15.0). Update it whenever an item starts or finishes |
| Product backlog | [backlog/PRODUCT_BACKLOG.md](backlog/PRODUCT_BACKLOG.md) | Planned/approved record; new ideas go into the in-app Tracker |
| Defects backlog | [backlog/DEFECTS.md](backlog/DEFECTS.md) | Planned/approved record; new reports go into the in-app Tracker |
| Decision log (ADRs) | [adr/](adr/) | ADRs 0001–0013 (13–14 Nov); earlier detail in HANDOVER's Session Log |
| Calorie model (design) | [design/CALORIES.md](design/CALORIES.md) | v2.17.1 (14 Nov): BMR, goal, activity credit, Plan vs Actual; known-input tests |
| Accounts, tiers and energy (design) | [design/ACCOUNTS_TIERS_ENERGY.md](design/ACCOUNTS_TIERS_ENERGY.md) | Design + local build only (14 Nov); not live |
| User guide | [`../APP_GUIDE.md`](../APP_GUIDE.md) | Read live by Help |
| Privacy notice | [legal/PRIVACY_NOTICE.md](legal/PRIVACY_NOTICE.md) | **DRAFT** for legal review (13 Nov) |
| Terms of use | [legal/TERMS_OF_USE.md](legal/TERMS_OF_USE.md) | **DRAFT** for legal review (13 Nov) |
| Intended use and clinical safety statement (wellness, not a medical device) | [legal/INTENDED_USE.md](legal/INTENDED_USE.md) | **DRAFT** for legal review (13 Nov) |
| Payments compliance statement | [legal/PAYMENTS_STATEMENT.md](legal/PAYMENTS_STATEMENT.md) | **DRAFT** for legal review (13 Nov); no payments yet |
| Accessibility statement | [legal/ACCESSIBILITY.md](legal/ACCESSIBILITY.md) | **DRAFT** for legal review (13 Nov); known gaps listed |

All `legal/` documents are **DRAFT — for legal review before any users other than JC and Becks**.

**Private (vault, Architect):** SAD (incl. threat model and CSIA), DPIA, SDD (support model, suppliers, service levels, runbooks), risk register, supplier/processor register and DPAs, ROPA, LLD sections that reveal security detail.

`HANDOVER.md` stays the hand-over log between the Architect and the Coder; it links here.
