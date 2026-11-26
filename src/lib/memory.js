// v2.20.0 Companion memory (JC, 15/16 Nov): the user sees ONE Companion that remembers the conversation.
// - Every chat / feedback thread sends its own history with each request: the last 20 messages in full, plus a short
//   rolling summary of older ones, within the retention period (threads 12 months).
// - sharedContext(): a small summary of the SAME person's recent Companion feedback from the other areas (14 days),
//   so answers agree. The caller passes only that person's data; nothing here can reach the other person's.
// Pure functions (no Firebase, no network).
export var RECENT_MESSAGES = 20;
export var RETAIN_DAYS = 365;
export var SHARED_DAYS = 14;
var DAY = 864e5;

/** Our thread messages: { role: "user" | "companion" | "assistant", text, when?, ts? }. */
function isUser(m) { return m && m.role === "user"; }
function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/** Drop messages older than the retention period (messages without a timestamp are kept: older data has none). */
export function withinRetention(msgs, now) {
  var cut = (now || Date.now()) - RETAIN_DAYS * DAY;
  return (msgs || []).filter(function(m) { return m && m.text != null && (!m.ts || m.ts >= cut); });
}
/** Chat Q&A entries ({ q, a, when, ts }) → thread messages, oldest first. */
export function qaToMessages(entries) {
  var out = [];
  (entries || []).forEach(function(e) { if (!e) return; if (e.q) out.push({ role: "user", text: e.q, when: e.when, ts: e.ts }); if (e.a) out.push({ role: "assistant", text: e.a, when: e.when, ts: e.ts }); });
  return out;
}
/** { recent: last 20 messages, older: the rest } after retention. */
export function splitHistory(msgs, now) {
  var kept = withinRetention(msgs, now);
  var cut = Math.max(0, kept.length - RECENT_MESSAGES);
  return { recent: kept.slice(cut), older: kept.slice(0, cut) };
}
/** A short rolling summary of older messages (extractive, no AI call): the latest older exchanges first, capped. */
export function rollingSummary(older, maxChars) {
  maxChars = maxChars || 1200;
  if (!older || !older.length) return "";
  var parts = [], len = 0;
  for (var i = older.length - 1; i >= 0; i--) {
    var m = older[i]; var piece = (isUser(m) ? "They said: " : "You said: ") + clip(m.text, 140);
    if (len + piece.length > maxChars) break;
    parts.unshift(piece); len += piece.length + 3;
  }
  return "Earlier in this conversation (" + older.length + " older messages, summarised): " + parts.join(" | ");
}
/** For single-prompt requests: the summary + the recent messages in full, oldest first. "" when there's no history. */
export function historyBlock(msgs, now) {
  var h = splitHistory(msgs, now);
  if (!h.recent.length) return "";
  var sum = rollingSummary(h.older);
  return (sum ? sum + "\n" : "") + "CONVERSATION SO FAR (oldest first; the last message is the newest):\n" +
    h.recent.map(function(m) { return (isUser(m) ? "User" : "Companion") + ": " + m.text; }).join("\n");
}
/** For multi-turn requests: Anthropic messages from the recent history (alternating roles, starting with the user),
 *  followed by the new user content. The summary (if any) is put before the first message. */
export function apiTurns(msgs, newUserContent, now) {
  var h = splitHistory(msgs, now), out = [];
  h.recent.forEach(function(m) {
    var role = isUser(m) ? "user" : "assistant";
    if (!out.length && role === "assistant") return;                       // must start with the user
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + m.text;
    else out.push({ role: role, content: String(m.text) });
  });
  var sum = rollingSummary(h.older);
  if (sum && out.length) out[0].content = "[" + sum + "]\n\n" + out[0].content;
  if (newUserContent != null) {
    if (out.length && out[out.length - 1].role === "user") out[out.length - 1].content += "\n\n" + newUserContent;
    else out.push({ role: "user", content: newUserContent });
  }
  return out;
}

/** Shared context for ONE person: recent Companion conversations from that person's other areas.
 *  areas = [{ label, msgs: [thread messages] }] — all from the same person (the caller's job, see App getCrossSectionCtx).
 *  Keeps messages from the last 14 days (or, for older data without timestamps, the last two), ≤ 300 chars per area,
 *  ≤ 1,500 chars in all. */
export function sharedContext(areas, now) {
  var cut = (now || Date.now()) - SHARED_DAYS * DAY, lines = [], total = 0;
  (areas || []).forEach(function(a) {
    if (!a || !a.msgs || !a.msgs.length) return;
    var stamped = a.msgs.some(function(m) { return m && m.ts; });
    var recent = stamped ? a.msgs.filter(function(m) { return m && m.ts && m.ts >= cut; }) : a.msgs.slice(-2);
    if (!recent.length) return;
    var line = a.label + ": " + clip(recent.slice(-4).map(function(m) { return (isUser(m) ? "They: " : "You: ") + clip(m.text, 110); }).join(" | "), 300);
    if (total + line.length > 1500) return;
    lines.push(line); total += line.length;
  });
  return lines.join("\n");
}
