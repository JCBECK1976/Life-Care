// v2.16.7 P2: self-service data export (JSON) and deletion of a person's live data.
// Backups are not touched: they age out within 12 months (Privacy Notice §7). Each action is audited (no content).
import firebase, { DATA_ROOT } from "./firebase.js";

import { collectMyData, deletionUpdate } from "./myDataCore.js";
export * from "./myDataCore.js";

async function rootSnapshot() { return (await firebase.database().ref(DATA_ROOT).once("value")).val() || {}; }
export async function exportMyData(person) {
  var data = collectMyData(await rootSnapshot(), person);
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "lifecare-my-data-" + person + "-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000);
  return data;
}
export async function deleteMyData(person) {
  var up = deletionUpdate(await rootSnapshot(), person);
  await firebase.database().ref(DATA_ROOT).update(up);
  return Object.keys(up).length;
}
