import React from "react";
import { ratingsShown, ratingColor } from "../lib/rating.js";
import { openPlans, usePlan } from "../lib/myPlan.js";

// v2.22.1: a rating word in its colour — nothing at all on a plan without food ratings (lib/rating.js).
export default function Rating(props) {
  usePlan();
  if (!ratingsShown() || !props.rating) return null;
  return <span data-testid={props.testid || "rating"} style={Object.assign({ color: ratingColor(props.rating, props.bright ? "bright" : ""), fontWeight: 700 }, props.style)}>{props.children || props.rating}</span>;
}

/** v2.22.1: the one hint on a list header (not per row): "🔒 Ratings: Silver" → Settings → My Plan. */
export function RatingsHint() {
  usePlan();
  if (ratingsShown()) return null;
  return <button type="button" data-testid="ratings-hint" onClick={openPlans} style={{ marginLeft: 8, padding: "2px 8px", minHeight: 24, fontSize: 11, color: "#475569", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 999, cursor: "pointer" }}>🔒 Ratings: Silver</button>;
}
