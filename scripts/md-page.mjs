// v2.21.0: a small Markdown → HTML page converter for the public legal pages (Google Play needs a privacy policy web page).
// Handles what the legal documents use: headings, paragraphs, bullet and numbered lists, block quotes, tables, bold,
// italics and links. Static HTML, no scripts.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[\w./#-]+)\)/g, '<a href="$2">$1</a>')
  .replace(/(^|[\s(])(https:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>');
export function mdToHtml(md) {
  const out = []; let list = null, para = [], table = null;
  const flush = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } if (list) { out.push("</" + list + ">"); list = null; } if (table) { out.push("</tbody></table>"); table = null; } };
  for (const raw of md.split("\n")) {
    const l = raw.replace(/\s+$/, "");
    if (!l.trim()) { flush(); continue; }
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { flush(); out.push("<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">"); continue; }
    if (/^\|/.test(l)) {
      if (/^\|[\s:|-]+\|$/.test(l)) continue;   // the header separator row
      const cells = l.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      if (!table) { flush(); table = true; out.push("<table><thead><tr>" + cells.map((c) => "<th>" + c + "</th>").join("") + "</tr></thead><tbody>"); }
      else out.push("<tr>" + cells.map((c) => "<td>" + c + "</td>").join("") + "</tr>");
      continue;
    }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(l)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) {
      const kind = /^\s*\d/.test(l) ? "ol" : "ul";
      if (para.length || table) flush();
      if (list !== kind) { if (list) out.push("</" + list + ">"); out.push("<" + kind + ">"); list = kind; }
      out.push("<li>" + inline(m[1]) + "</li>"); continue;
    }
    if ((m = /^>\s?(.*)$/.exec(l))) { flush(); out.push("<blockquote>" + inline(m[1]) + "</blockquote>"); continue; }
    if (list || table) flush();
    para.push(l.trim());
  }
  flush();
  return out.join("\n");
}
export function mdPage(md, title) {
  return '<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(title) + '</title>\n' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#0f172a;background:#f8fafc;margin:0;line-height:1.55}main{max-width:720px;margin:0 auto;padding:24px 16px 48px}' +
    'h1{font-size:22px}h2{font-size:17px;margin-top:24px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}' +
    'blockquote{margin:12px 0;padding:8px 12px;background:#fff7ed;border-left:4px solid #f59e0b}a{color:#1d4ed8}</style>\n</head>\n<body>\n<main>\n' + mdToHtml(md) + '\n</main>\n</body>\n</html>\n';
}
