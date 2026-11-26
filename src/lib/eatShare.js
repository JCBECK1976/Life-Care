// v2.44.0 (night batch P6b): "Add to today's eating" — a new row in the chosen category today, then the normal Snap flow.
export var EAT_CATEGORIES = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["o", "Snack"], ["ds", "Dessert"], ["dr", "Drink"]];
/** The category for now: breakfast until 10:30, lunch until 14:30, dinner 17:00–21:30, otherwise a snack. */
export function eatCategoryFor(d) { var t = d.getHours() * 60 + d.getMinutes(); return t < 630 ? "b" : t < 870 ? "l" : t >= 1020 && t < 1290 ? "d" : "o"; }
