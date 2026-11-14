// v2.16.0: the admin Documentation list. Edit this file to add or move a document; Settings renders it.
// Public docs link to the repository (main). Private docs are in the vault: named only, never linked.
export var DOCS_INDEX = [
  { group: "Guides", docs: [["App guide", "APP_GUIDE.md"], ["Docs index", "docs/README.md"], ["Changelog", "docs/CHANGELOG.md"]] },
  { group: "Design", docs: [["High-level design (HLD)", "docs/HLD.md"], ["Low-level design (LLD)", "docs/LLD.md"], ["Decisions (ADRs)", "docs/adr/README.md"], ["Test strategy", "docs/TEST_STRATEGY.md"], ["Calorie model", "docs/design/CALORIES.md"]] },
  { group: "Plan", docs: [["Plan (plan.json)", "@pages:plan.json"], ["Product backlog", "docs/backlog/PRODUCT_BACKLOG.md"], ["Defects backlog", "docs/backlog/DEFECTS.md"], ["Handover log", "HANDOVER.md"]] },
  { group: "Legal (Draft — for legal review)", draft: true, docs: [["Privacy Notice", "docs/legal/PRIVACY_NOTICE.md"], ["Terms of Use", "docs/legal/TERMS_OF_USE.md"], ["Intended Use", "docs/legal/INTENDED_USE.md"], ["Accessibility", "docs/legal/ACCESSIBILITY.md"], ["Payments", "docs/legal/PAYMENTS_STATEMENT.md"]] },
];
export var VAULT_DOCS = ["01 SAD (security architecture, threat model)", "02 DPIA", "03 Service design + runbooks", "04 Risk register", "05 Supplier register + ROPA"];
