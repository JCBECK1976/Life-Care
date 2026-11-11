# Lifecare Companion™ — Defects backlog

**How defects are captured and recorded**
- **New reports go into the in-app Tracker** (Settings → 📝 Tracker, admin only, from v2.14.0). Everything sent with 💬 Send Feedback lands there as *Feedback / New*. The admin triages it: re-categorise it as a **Defect**, set status and priority, and add a ref.
- **This file is the planned and approved record:** a defect gets a D-number here once it is approved for fixing. The Tracker entry's "Link / ref" then holds that number, e.g. `D20`.
- Full context for each item is in the dated `HANDOVER.md` Session Log entries (and `HANDOVER_ARCHIVE.md`). This file is the index.

Status: **Fixed in vX** (shipped to build; see [CHANGELOG](../CHANGELOG.md) for how far it has got) · **Open** · **Superseded**.

| ID | Defect | Type | Raised | Status |
|---|---|---|---|---|
| D1 | Switching person in the header while the Log Exercise form is open mixed people's entries | Safety | 6 Nov | Fixed in v2.6.1 |
| D2 | Different weights per set saved as the set-1 value | Data | 6 Nov | Fixed in v2.6.1 |
| D3 | Long bulk-upload lists fail silently | Usability | 7 Nov | Fixed in v2.6.3 (batches of 10, retry per batch) |
| D4 | Bulk upload remembers the previous category (drinks went into Snacks) | Data | 7 Nov | Fixed in v2.6.3 |
| D5 | Bulk upload Cancel doesn't cancel | Data | 7 Nov | Fixed in v2.6.3 |
| D6 | Deleting a list item breaks past meal selections (code shown) | Data | 7 Nov | Fixed in v2.6.2 (+ repair tool v2.6.5) |
| D7 | Update Item doesn't recalculate nutrition from edited ingredients | Data | 8 Nov | Fixed in v2.6.2; Re-check nutrition v2.6.5 |
| D8 | Companion chats in inconsistent order (needed scrolling) | Usability | 8 Nov | Fixed in v2.6.4 (latest first everywhere) |
| D9 | Week meal generator ignores the user's defaults | Data | 8 Nov | Fixed in v2.6.2 |
| D10 | Portion photo of a different food keeps the original item | Data | 8 Nov | Fixed in v2.6.2 |
| D11 | RAG ratings not proportionate to the portion | Design | 8 Nov | Fixed in v2.6.5 (portion-based bands, `src/lib/rag.js`) |
| D12 | Log Exercise: Form and Range defaulted instead of being chosen | Data | 8 Nov | Fixed in v2.6.1 |
| D13 | Portion sizes and eaten/skipped statuses carry over between weeks | Data | 9 Nov | Superseded by the dated parent/child eating model (v2.6.5) |
| D14 | Inline child-rating note squeezes the meal slot row | Layout | 10 Nov | Fixed in v2.6.5 |
| D15 | Same food photo rated differently each time; Re-check anchored to the first answer | Consistency | 10 Nov | Fixed in v2.6.5 (independent deep dive) |
| D16 | Phone keyboard covers the meal picker while searching | Mobile | 10 Nov | Fixed in v2.6.5 (sheet sized to the visible viewport) |
| D17 | Exercise Open form: "Delete week" truncated | Layout | 11 Nov | Fixed in v2.13.0 (Remove, deep orange) |
| D18 | Meal-slot Open form: "Remove from this meal" truncated | Layout | 11 Nov | Fixed in v2.13.0 (Remove) |
| D19 | Update Lists Open form: "Delete from list" truncated | Layout | 11 Nov | Fixed in v2.13.0 (Delete, red) |
| D20 | Editing or removing an older exercise week made a "Reduce" pill appear | Logic | 11 Nov | Fixed in v2.13.0 (only the latest week drives the card) |
| D21 | Exercise Open form (viewing) showed no selected Range/Form value | Layout | 11 Nov | Fixed in v2.13.0 (single chip) |

Also fixed outside the D-series (see CHANGELOG): Open forms opening off-screen (v2.13.2), Weigh In Progress buttons misaligned (v2.13.4), photos sent full size and possibly over the AI's 5 MB limit (v2.14.0).

**Open:** none numbered. New reports: see the Tracker.
