// v2.44.0 (night batch P6b): Android "Share → Lifecare Companion". The native shell keeps the shared image (LcShare);
// here it is put in the same place as an image shared to the installed web app ("lc-share"), so the same "What is this?"
// picker handles both. iOS: no share extension yet (logged in HANDOVER).
import { registerPlugin } from "@capacitor/core";
import { platform } from "./native.js";
import { SHARE_CACHE } from "../components/SharePicker.jsx";

export var SHARE_EVENT = "lc-shared";

async function keep(data, type) {
  var bin = atob(data), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var cache = await caches.open(SHARE_CACHE);
  await cache.put("/lc-share/" + Date.now(), new Response(new Blob([bytes], { type: type || "image/jpeg" }), { headers: { "Content-Type": type || "image/jpeg", "X-Name": "shared.jpg" } }));
  window.dispatchEvent(new CustomEvent(SHARE_EVENT));
}

/** Call once at start-up: takes a pending Android share now, and any that arrive while the app is open. */
export function startNativeShare() {
  if (platform() !== "android" || typeof caches === "undefined") return;
  var p = registerPlugin("LcShare");
  var take = function() { p.take().then(function(r) { if (r && r.found && r.data) return keep(r.data, r.type); }).catch(function() {}); };
  take();
  try { p.addListener("shared", take); } catch (e) { /* older shell */ }
}
