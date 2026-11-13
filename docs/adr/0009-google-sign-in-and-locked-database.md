# ADR 0009: Google sign-in and database access locked to approved accounts

- **Status:** Accepted
- **Date:** 5 Nov 2026 (v2.6.0, hotfix route)

## Context
The database was originally open to anyone who knew its address.

## Decision
- The app requires Google sign-in.
- Database security rules allow only approved signed-in accounts to read or write the app's data.
- The rules file in the repository is the source of truth.
- Details of the rules and the threat model are in the private security architecture document, not here.

## Alternatives rejected
Password-only gate in the app (no protection at the database); anonymous auth (doesn't identify the household).

## Consequences
- Anonymous access is closed.
- The old single-file fallback stopped working and was later removed (v2.14.2).
- Adding users needs a rules change, and Step 5 (individual accounts) will rework this.
