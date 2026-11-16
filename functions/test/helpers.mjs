// Emulator-only helpers (database :9000, auth :9099). Never touches live Firebase.
import fs from "node:fs";
export const DBH = "http://127.0.0.1:9000", AUTH = "http://127.0.0.1:9099", PROJECT = "life-care-app-64d04";
export async function token(name) {
  const email = name + "@example.com", password = "test-password", localId = "uid-" + name;
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ localId, email, password }) });
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  return { uid: localId, idToken: (await r.json()).idToken };
}
export async function loadRules(ns) {
  const rules = fs.readFileSync(new URL("../../database.rules.next.json", import.meta.url), "utf8");
  const r = await fetch(`${DBH}/.settings/rules.json?ns=${ns}`, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: rules });
  if (!r.ok) throw new Error("rules load failed " + r.status + " " + await r.text());
}
export const asOwner = (ns, path, method = "GET", body) => fetch(`${DBH}/${path}.json?ns=${ns}`, { method, headers: { Authorization: "Bearer owner" }, body: body === undefined ? undefined : JSON.stringify(body) });
export const asUser = (ns, t, path, method = "GET", body) => fetch(`${DBH}/${path}.json?ns=${ns}&auth=${t.idToken}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
