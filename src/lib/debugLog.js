// v2.15.0: Debug Mode (admin) logs a SAFE summary of each AI call: HTTP status, stop reason, token counts, error type.
// Never the request or reply text (it can hold health data), never keys. The log is kept in memory only (cleared on
// reload); only the on/off switch is remembered on this device.
var KEY = "lc_debug_mode";
export function loadDebugMode() { try { return window.localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
export function saveDebugMode(on) { try { if (on) window.localStorage.setItem(KEY, "1"); else window.localStorage.removeItem(KEY); } catch (e) { /* private window: not remembered */ } }

// Keys, bearer tokens, email addresses and quoted text are removed from anything logged.
export function redact(s) {
  return String(s == null ? "" : s)
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-…")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer …")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "…@…")
    .replace(/"[^"]*"/g, '"…"').replace(/'[^']*'/g, "'…'")
    .slice(0, 200);
}
// A Messages API reply → "stop: end_turn · tokens in 120 / out 340" (or the error type); no content.
export function summariseReply(r) {
  if (!r || typeof r !== "object") return "no reply";
  if (r.type === "error" || r.error) { var e = r.error || {}; return "API error: " + (e.type || "unknown") + (e.message ? " · " + redact(e.message) : ""); }
  var u = r.usage || {};
  var chars = (r.content || []).reduce(function(n, c) { return n + (c && c.text ? c.text.length : 0); }, 0);
  return "stop: " + (r.stop_reason || "?") + " · tokens in " + (u.input_tokens || 0) + " / out " + (u.output_tokens || 0) + " · reply " + chars + " characters (text not logged)";
}
