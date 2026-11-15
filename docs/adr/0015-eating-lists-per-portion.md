# ADR 0015 — Eating lists: per portion everywhere, Update Lists tabs, clarifying AI

- **Status:** Accepted (JC, 15 Nov 2026). Built in v2.19.0 (build). Design: [design/EATING_LISTS.md](../design/EATING_LISTS.md).
- **Context:** for the third week the eating flow produced absurd values (e.g. 1,247 kcal for a portion of pasta bake) or failed with "could not be read". Causes: OFF values are per 100 g but were stored as a portion; the D7 recalculation asked for the whole recipe without "serves N"; the screen said "per 100g"; AI replies weren't validated or retried with a way forward.
- **Decision:**
  - All list items and meals store nutrition **per portion** (existing fields), with a portion description; packaged/OFF items keep per-100 g source data and an editable default portion, and per-portion values are derived in code.
  - Drop-downs show only items already in the list, with **"+ Not in my list?"** → Update Lists, returning to the slot.
  - Update Lists has three tabs: **Add single item** (catalogue / OFF), **Build a meal** (components × amount ÷ serves, **computed in code**), **Create my own item** (a **clarifying AI conversation** with a JSON schema, retries, strict validation and a plausibility check; never a dead end).
  - Editing: single items as before (recalculation via the clarifying flow); meals = components, amounts, serves only.
  - Idempotent migration on load: portion descriptions, OFF per-100 g kept with a 100 g default, "Ingredient prepared" without servings flagged "Check me — confirm portions". Nothing deleted.
  - Parent/child model and personal ratings unchanged.
- **Alternatives rejected:** keep asking the AI for whole-recipe totals and divide (still no reliable servings; fragile parsing); store per 100 g and convert at display (every consumer would need to change); free-text AI estimates without validation (the current failure).
- **Consequences:** new item fields `portion`, `per100`, `meal`; the old typed-description add path (D7) is superseded by "Create my own item"; photo and bulk paste remain. Existing ratings of list items are not re-rated by the migration (values unchanged).
