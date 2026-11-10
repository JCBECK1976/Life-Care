// v2.6.4 D8: every companion chat shows the latest exchange first.
// An exchange is a user message plus the companion replies after it; each exchange keeps its own order.
export function latestFirst(thread) {
  var groups = [];
  (thread || []).forEach(function(m) {
    if (!groups.length || (m && m.role === "user")) groups.push([]);
    groups[groups.length - 1].push(m);
  });
  return groups.reverse().reduce(function(a, g) { return a.concat(g); }, []);
}
