import React from "react";
// v2.16.7: renders the legal Markdown as React elements — never as HTML (SAD-A2). Headings, lists, tables, quotes, **bold**.
function inline(t, key) {
  return String(t).split(/(\*\*[^*]+\*\*)/g).map(function(part, i) {
    return /^\*\*[^*]+\*\*$/.test(part) ? React.createElement("strong", { key: key + "-" + i }, part.slice(2, -2)) : part;
  });
}
export default function MarkdownText(props) {
  var lines = String(props.text || "").split("\n"); var out = []; var list = null; var table = null;
  var flush = function() {
    if (list) { out.push(React.createElement("ul", { key: "l" + out.length, style: { paddingLeft: 18, margin: "4px 0" } }, list)); list = null; }
    if (table) { out.push(React.createElement("table", { key: "t" + out.length, style: { borderCollapse: "collapse", fontSize: 11, margin: "6px 0", width: "100%" } }, React.createElement("tbody", null, table))); table = null; }
  };
  lines.forEach(function(l, i) {
    var m;
    if ((m = /^(#{1,3}) (.*)$/.exec(l))) { flush(); out.push(React.createElement("h" + (m[1].length + 1), { key: i, style: { fontSize: [16, 14, 13][m[1].length - 1], margin: "12px 0 4px", color: "#0f172a" } }, inline(m[2], i))); }
    else if ((m = /^\s*[-*] (.*)$/.exec(l))) { if (table) flush(); list = list || []; list.push(React.createElement("li", { key: i, style: { margin: "2px 0" } }, inline(m[1], i))); }
    else if (/^\|/.test(l)) { if (list) flush(); if (/^\|[-| ]+\|$/.test(l)) return; table = table || []; table.push(React.createElement("tr", { key: i }, l.split("|").slice(1, -1).map(function(c, j) { return React.createElement("td", { key: j, style: { border: "1px solid #e2e8f0", padding: 4, verticalAlign: "top" } }, inline(c.trim(), i + "-" + j)); }))); }
    else if ((m = /^> ?(.*)$/.exec(l))) { flush(); out.push(React.createElement("div", { key: i, style: { background: "#eff6ff", borderLeft: "3px solid #2563eb", padding: "6px 8px", margin: "6px 0", fontSize: 12 } }, inline(m[1], i))); }
    else if (l.trim()) { flush(); out.push(React.createElement("p", { key: i, style: { margin: "4px 0", lineHeight: 1.5 } }, inline(l, i))); }
    else flush();
  });
  flush();
  return React.createElement("div", { "data-testid": props.testid, style: { fontSize: 12, color: "#1e293b" } }, out);
}
