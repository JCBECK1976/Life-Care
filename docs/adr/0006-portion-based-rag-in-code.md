# ADR 0006: Portion-based RAG rating bands computed in code

- **Status:** Accepted
- **Date:** 10 Nov 2026 (v2.6.5, defect D11)

## Context
AI-assigned Red/Amber/Green ratings were inconsistent and didn't scale with the portion eaten.

## Decision
- Ratings come from fixed rules in code (`src/lib/rag.js`) applied to the nutrition of the actual portion.
- The rules use bands on saturated fat and added sugar (as shares of daily limits), with a fibre/protein credit and a calorie-share rule. A frequency allowance comes with each band (e.g. weekly, monthly).
- The AI supplies nutrition values only; it never decides the rating.

## Alternatives rejected
AI-assigned ratings (inconsistent between calls); ratings per list item only (ignore portion).

## Consequences
- Ratings are repeatable, testable and explainable, and they follow the portion.
- Rule changes are code changes and go through the normal release flow.
