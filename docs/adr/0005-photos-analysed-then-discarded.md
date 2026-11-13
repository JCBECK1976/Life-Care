# ADR 0005: Photos are analysed and then discarded, never stored

- **Status:** Accepted
- **Date:** 11 Nov 2026 (v2.12.0; supersedes an earlier storage plan)

## Context
Several features take photos: food, portions, body composition screens, measurements and body photos. Photos of bodies and health screens are sensitive, and storing them adds risk and cost.

## Decision
- Photos are read in memory, shrunk, sent to the AI for analysis, and then discarded.
- They are never written to the database, file storage or backups.
- Only the structured result is kept: values, scores, notes.
- A Re-check works from the photo still in memory during that session.

## Alternatives rejected
Cloud file storage with access rules (sensitive, extra service, retention questions); on-device storage only (lost between devices, unclear expectations).

## Consequences
- No photo retention, breach exposure or storage cost.
- Past photos can't be reviewed later; only the analysis can.
- Comparisons use previous structured results.
