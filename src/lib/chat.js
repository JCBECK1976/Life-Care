// v2.20.0 (JC): every Companion thread shows the NEWEST MESSAGE FIRST, strictly by time at message level (the
// Companion's reply sits above the question it answers). Threads are stored oldest first; messages with a timestamp
// (ts) are ordered by it, older messages without one keep their stored order.
export function newestFirst(thread) {
  return (thread || []).map(function(m, i) { return { m: m, i: i }; }).sort(function(a, b) {
    var ta = a.m && a.m.ts, tb = b.m && b.m.ts;
    if (ta && tb && ta !== tb) return tb - ta;
    return b.i - a.i;
  }).map(function(x) { return x.m; });
}
/** Kept for older imports: now the same message-level order. */
export var latestFirst = newestFirst;
