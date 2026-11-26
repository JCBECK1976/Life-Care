// v2.31.0 (Architect, 18 Nov — HELP/AI COST): prompt caching for large stable context, on BOTH AI paths. The same file
// is kept at functions/src/caching.js (a test checks they are identical): the app applies it before a request leaves
// the device (direct API) and the server applies it again in aiProxy (Vertex AI or direct) — applying it twice changes
// nothing. Pure, no imports.
// - System prompt (instructions, the app guide in Help, the person's profile summary, the medication rule): one cache
//   breakpoint at its END, when it's long enough to be cached (Claude caches from about 1,024 tokens; shorter is ignored).
//   A request that already marks a block (Help marks the guide) keeps its own breakpoint.
// - Conversation (Chat, Help and feedback threads): one breakpoint on the last earlier turn, so the history is read from
//   the cache on the next question instead of being paid for again.
// At most 4 breakpoints are allowed; this adds at most 2.
export var CACHE_MIN_CHARS = 4500;   // ≈ 1,100 tokens: below this the API wouldn't cache anyway
var EPH = { type: "ephemeral" };
var len = function(c) { return typeof c === "string" ? c.length : Array.isArray(c) ? c.reduce(function(a, b) { return a + (b && typeof b.text === "string" ? b.text.length : 0); }, 0) : 0; };
var marked = function(c) { return Array.isArray(c) && c.some(function(b) { return b && b.cache_control; }); };

/** Returns a NEW request body with cache breakpoints added (the input is not changed). */
export function withCaching(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) return body;
  var b = Object.assign({}, body);
  // 1) the system prompt
  if (typeof b.system === "string" && b.system.length >= CACHE_MIN_CHARS) b.system = [{ type: "text", text: b.system, cache_control: EPH }];
  else if (Array.isArray(b.system) && !marked(b.system) && len(b.system) >= CACHE_MIN_CHARS) {
    b.system = b.system.map(function(x, i, a) { return i === a.length - 1 ? Object.assign({}, x, { cache_control: EPH }) : x; });
  }
  // 2) the conversation so far (everything before the newest message)
  var m = b.messages;
  if (m.length >= 3 && !m.some(function(x) { return marked(x.content); })) {
    var hist = m.slice(0, -1).reduce(function(a, x) { return a + len(x.content); }, 0);
    if (hist >= CACHE_MIN_CHARS) {
      var k = m.length - 2, last = m[k];
      var content = typeof last.content === "string" ? [{ type: "text", text: last.content }] : (last.content || []).slice();
      if (content.length) {
        content[content.length - 1] = Object.assign({}, content[content.length - 1], { cache_control: EPH });
        b.messages = m.slice(); b.messages[k] = Object.assign({}, last, { content: content });
      }
    }
  }
  return b;
}

/** Cost of one answer in pence from its usage (cache writes 1.25×, cache reads 0.1× the input price). */
export function answerPence(usage, prices) {
  var u = usage || {}, p = prices || { inUsd: 3, outUsd: 15, cacheWriteUsd: 3.75, cacheReadUsd: 0.3, usdGbp: 0.79 };
  var usd = ((u.input_tokens || 0) * p.inUsd + (u.output_tokens || 0) * p.outUsd + (u.cache_creation_input_tokens || 0) * p.cacheWriteUsd + (u.cache_read_input_tokens || 0) * p.cacheReadUsd) / 1e6;
  return usd * p.usdGbp * 100;
}
