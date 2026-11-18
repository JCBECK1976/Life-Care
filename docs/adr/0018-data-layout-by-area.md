# ADR 0018 — Data layout final for pilot: each person's data split by area, plus a family shared area

- **Status:** Accepted (Architect, 18 Nov 2026 — "final code drop", Part 1). Built in v2.28.0 on `build`. Replaces the single per-person store of v2.25.0 and the "per-area deferred" plan item.
- **Decision:** **Data layout final for pilot. Future changes additive only (ADR 0002 expand/contract); no restructuring migrations.**
- **Layout** (individual accounts; the shared joint account `data` / `data_build` is unchanged until the §5b migration):
  - `apps/lifecare/users/{uid}/data/{area}/{key}` — the person's OWN records. Areas: `exercise`, `body`, `eating`, `health`, `mood`, `journal`, `companion` (AI chats and feedback — never shown to anyone else), `settings` (profile, goal, colour…).
  - `apps/lifecare/households/{hid}/shared/{area}/{key}` — what the FAMILY shares; readable and writable by family members only (never non-members or the admin).
  - `apps/lifecare/users/{uid}/shared/{area}/{key}` — the same for an account that isn't in a family (a family of one; same code path).
  - "dashboard:data" (one object per person today) is stored as one `dashboard_data` part per area (each person's fields in that area) plus `settings/dashboard_config`; the storage layer assembles today's in-memory shape and writes back only the areas that changed. The app above `lib/storage.js` is unchanged.
- **Personal vs family, per key** (`src/lib/areas.js`, the single source):

| What | Key(s) | Where |
|---|---|---|
| Food lists (breakfast, lunch, dinner, snacks, desserts, drinks) | `custom_*` | **Family** · eating |
| Set Defaults — Individual and All | `meal_defaults` (one object: each person's defaults + everyone's) | **Family** · eating (Individual = your entry in it, All = every entry) |
| Shopping list (defaults, supermarket) | `shop_defaults`, `shop_list*`, `supermarket_pref` | **Family** · eating |
| A generated meal plan before it is applied | `generated_meal*` | **Family** · eating |
| Exercise / measurement / medicine / blood-test name lists | `custom_exercises`, `custom_meas_types`, `custom_med_names`, `custom_blood_tests` | **Family** |
| A person's weekly meal plan (it also holds what they ate on past days) | `mealplan:<week>:<person>`, `meal_tracking:`, `portion_overrides:`, `eat_children:` | **Personal** · eating |
| Copy Week (to another person) | writes that person's `mealplan:` | **Personal** of the target — needs their Eating "log for me" |
| Meal generator (fills a person's week) | that person's `mealplan:` | **Personal** · eating |
| Body, exercise, health, mood, journal records | person fields + `journal_*`, `daily_mood_*`, `comment:*`, `meas_*`, `health_fb_*` … | **Personal** · their area |
| Companion chats and feedback | `qa_history`, `help_history`, `feedback_*`, `eat_feedback` | **Personal** · companion (never shared) |
| Secrets, energy and usage bookkeeping | `anthropic_api_key`, `companion_energy`, `ai_usage`, `audit` | never copied into accounts |

- **Sharing rules:** a family member may read another member's area only when that person is **Visible** and hasn't turned that area off (`privacy.areas.{area}`, default = Visible); may write it only with "log for me" for that area (`privacy.logAreas.{area}`, default = the overall "log for me"). Hidden overrides every area. The family area stays shared for everyone in the family, Hidden members included. Leaving or being removed ends access at once (membership is checked on every read).
- **Rejected:** keeping one store per person (no way to share "exercise but not weight"); copying the shared lists into each person (two lists drift apart — the Architect's "not copied to both"); putting meal plans in the family area (they are each person's eating record — a Hidden member's eating would be exposed).
- **Consequences:** the migration (§5a/§5b) writes per area per person and the family lists once; its dry run prints counts per area. The Architect should confirm the meal-plan line (personal).
