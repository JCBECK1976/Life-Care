// v2.28.0: test helpers for the per-area layout (ADR 0018) — emulator only.
import { toAreas, locate, cleanKey, joinDash, AREAS, DASH, DASH_CONFIG } from "../src/lib/areas.js";
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const rd = async (p, ns) => (await fetch("http://127.0.0.1:9000/" + p + ".json" + (ns ? "?ns=" + ns : NS), { headers: H })).json();
/** An account's own areas from today's flat key map. */
export function areaData(flat) { return toAreas(flat).own; }
/** The family-shared areas from a flat key map. */
export function familyData(flat) { return toAreas(flat).family; }
/** One key of an account, wherever it lives. */
export async function getKeyOf(uid, key, ns) {
  const l = locate(key);
  return rd(`apps/lifecare/users/${uid}/${l.scope === "family" ? "shared" : "data"}/${l.area}/${encodeURIComponent(cleanKey(key))}`, ns);
}
/** "dashboard:data" as the app sees it, assembled from the account's areas. */
export async function getDashOf(uid, ns) {
  const data = (await rd(`apps/lifecare/users/${uid}/data`, ns)) || {};
  const parts = {};
  for (const a of AREAS) if (data[a] && data[a][DASH]) parts[a] = data[a][DASH];
  if (data.settings && data.settings[DASH_CONFIG]) parts._config = data.settings[DASH_CONFIG];
  return Object.keys(parts).length ? joinDash(parts) : null;
}
