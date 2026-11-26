import { readImageForAI } from "./image.js";
import { handleApiError } from "./api.js";
import { requestBody } from "./snap.js";

/** v2.59.0 (brief 26 Nov P4): the photo check on its own (Home's Snap tile) — the same request as My Eating's Snap with
 *  nothing planned; returns the parsed result (deep = the independent Re-check). The photo is shrunk, sent and never stored. */
export async function analyzeSnap(file, desc, deep) {
  var img = await readImageForAI(file);
  var apiKey = await window.ensureApiKey();
  var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "snap", "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify(requestBody({ plannedName: "", desc: String(desc || "").trim(), deep: !!deep }, { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })) });
  var result = await resp.json();
  var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
  var txt = ""; (result.content || []).forEach(function(c) { if (c.text) txt += c.text; });
  var jm = txt.replace(/```json|```/g, "").trim().match(/{[\s\S]*}/); if (!jm) throw new Error("No JSON");
  var info = JSON.parse(jm[0]); if (deep) info._deep = true;
  return info;
}
