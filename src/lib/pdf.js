// v2.30.0: a tiny PDF writer for the GP prep summary — A4, the PDF's built-in Helvetica (no fonts or libraries to load),
// word wrap, several pages, a footer on every page. Text only. Returns the file as bytes (Uint8Array).
var W = 595, H = 842, M = 50;
// WinAnsi (the built-in fonts' encoding): Latin-1 as is, plus the common typographic characters; anything else → "?"
var EXTRA = { "–": 0x96, "—": 0x97, "•": 0x95, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "€": 0x80, "…": 0x85 };
function enc(s) {
  var out = "";
  for (var ch of String(s)) {
    var c = ch.codePointAt(0);
    if (EXTRA[ch]) out += String.fromCharCode(EXTRA[ch]);
    else if (c === 0x2192) out += "->";
    else if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) out += ch;
    else out += "?";
  }
  return out;
}
var esc = function(s) { return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); };
// approximate Helvetica widths (em) — enough to wrap safely inside the margins
function width(s, size, bold) {
  var w = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s[i];
    w += /[ilj.,;:'|!\s]/.test(c) ? 0.28 : /[mwMW]/.test(c) ? 0.86 : /[A-Z]/.test(c) ? 0.69 : /[0-9]/.test(c) ? 0.56 : 0.54;
  }
  return w * size * (bold ? 1.06 : 1);
}
function wrap(text, size, bold, max) {
  var words = enc(text).split(/ +/), lines = [], cur = "";
  words.forEach(function(wd) {
    var t = cur ? cur + " " + wd : wd;
    if (width(t, size, bold) <= max || !cur) cur = t; else { lines.push(cur); cur = wd; }
    while (width(cur, size, bold) > max && cur.length > 1) {   // a single very long word: break it
      var n = cur.length; while (n > 1 && width(cur.slice(0, n), size, bold) > max) n--;
      lines.push(cur.slice(0, n)); cur = cur.slice(n);
    }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** doc = { title, period, sections: [{ h, lines: [] }], note } → Uint8Array (a valid PDF). */
export function makePdf(doc) {
  var pages = [[]], y = H - M;
  var put = function(text, size, bold, indent, gap) {
    wrap(text, size, bold, W - 2 * M - (indent || 0)).forEach(function(l) {
      if (y - size * 1.35 < M + 40) { pages.push([]); y = H - M; }
      y -= size * 1.35;
      pages[pages.length - 1].push("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + (M + (indent || 0)) + " " + Math.round(y) + " Td (" + esc(l) + ") Tj ET");
    });
    y -= gap || 0;
  };
  put(doc.title, 16, true, 0, 2);
  if (doc.period) put(doc.period, 11, false, 0, 10);
  (doc.sections || []).forEach(function(s) {
    put(s.h, 13, true, 0, 3);
    (s.lines || []).forEach(function(l) { var b = /^[-•]\s*/.test(l); put(b ? "• " + l.replace(/^[-•]\s*/, "") : l, 11, false, b ? 8 : 0, 2); });
    y -= 8;
  });
  var objs = [];   // objs[i] = body of object i+1
  var add = function(body) { objs.push(body); return objs.length; };
  var catalog = add(""), pagesObj = add(""), f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"), f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  var kids = [];
  pages.forEach(function(ops, i) {
    var foot = wrap(doc.note || "", 9, false, W - 2 * M - 60).map(function(l, j) { return "BT /F1 9 Tf " + M + " " + (M - 4 - j * 11) + " Td (" + esc(l) + ") Tj ET"; });
    foot.push("BT /F1 9 Tf " + (W - M - 52) + " " + (M - 4) + " Td (" + esc("Page " + (i + 1) + " of " + pages.length) + ") Tj ET");
    var stream = ops.concat(["0.6 G " + M + " " + (M + 10) + " m " + (W - M) + " " + (M + 10) + " l S"], foot).join("\n");
    var content = add("<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream");
    kids.push(add("<< /Type /Page /Parent " + pagesObj + " 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /Font << /F1 " + f1 + " 0 R /F2 " + f2 + " 0 R >> >> /Contents " + content + " 0 R >>"));
  });
  objs[catalog - 1] = "<< /Type /Catalog /Pages " + pagesObj + " 0 R >>";
  objs[pagesObj - 1] = "<< /Type /Pages /Kids [" + kids.map(function(k) { return k + " 0 R"; }).join(" ") + "] /Count " + kids.length + " >>";
  var out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", offs = [];
  objs.forEach(function(b, i) { offs.push(out.length); out += (i + 1) + " 0 obj\n" + b + "\nendobj\n"; });
  var xref = out.length;
  out += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + offs.map(function(o) { return String(o).padStart(10, "0") + " 00000 n \n"; }).join("");
  out += "trailer\n<< /Size " + (objs.length + 1) + " /Root " + catalog + " 0 R /Info << /Producer (Lifecare Companion) >> >>\nstartxref\n" + xref + "\n%%EOF\n";
  var bytes = new Uint8Array(out.length);
  for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;   // every character is one byte (WinAnsi)
  return bytes;
}

/** Share the PDF (phone share sheet) or download it. Native: written to the app's cache, then the system share sheet. */
export async function sharePdf(bytes, fileName, title) {
  var native = typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (native) {
    var fs = (await import("@capacitor/filesystem")).Filesystem, sh = (await import("@capacitor/share")).Share;
    var b64 = ""; for (var i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    var r = await fs.writeFile({ path: fileName, data: btoa(b64), directory: "CACHE" });
    await sh.share({ title: title, files: [r.uri] });
    return "shared";
  }
  var file = typeof File === "function" ? new File([bytes], fileName, { type: "application/pdf" }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ title: title, files: [file] }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; } }
  var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  var a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
  return "downloaded";
}
