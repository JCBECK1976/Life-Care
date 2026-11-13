# ADR 0004: Parent/child eating model

- **Status:** Accepted
- **Date:** 10 Nov 2026 (v2.6.5)

## Context
Editing or deleting a food list item changed or broke past meals (D6, D13). Portions and statuses leaked between weeks.

## Decision
- A food list item is the **parent**. Choosing it for a meal creates a dated **child**.
- Children are stored one document per person per week: `eat_children:<person>:<Sunday>`.
- Each child holds:
  - its own snapshot of the parent's nutrition;
  - its portion (a factor or photo-checked values) and any variations;
  - its own nutrition and rating.
- Editing or deleting a parent never changes past children; changing a meal never changes the parent.
- Frequency rules count children.
- Old week plans are converted once, when the week is opened.

## Alternatives rejected
References only, with history recomputed from parents (broke past meals); copying whole lists per week (large, hard to edit).

## Consequences
- History is stable and portions are per meal.
- Shopping, feedback and totals all read the children.
- Storage per week is larger, but bounded: one document per person per week.
