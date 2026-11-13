# ADR 0010: Companion Energy computed from recorded AI usage

- **Status:** Accepted
- **Date:** 12 Nov 2026 (v2.14.0)

## Context
The AI provider's API key cannot read the remaining credit balance. Earlier estimates drifted and were reset silently.

## Decision
- Every AI reply's token **counts** (never content) are added to a usage ledger, per day and feature, in a transaction.
- The admin enters the balance after each top-up (Set as 100%).
- Companion Energy = spend recorded since then, shown to users as a percentage only.
- "Empty" comes only from the provider's own credit error.

## Alternatives rejected
Polling a balance endpoint (not available to API keys); per-call estimates without a ledger (drifted, lost counts).

## Consequences
- The figure is accurate and explainable, and the admin can see usage per feature.
- It depends on the admin recording top-ups.
- Prices are list prices kept in code.
