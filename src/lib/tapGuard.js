// v2.30.1 (FINAL DROP Part 6): a double-tap guard. A second tap on the SAME action button (save, add, delete, send,
// generate, buy …) within 300 ms (Android's double-tap time), with nothing else in between, is ignored, so one tap never saves, adds or buys twice. Steppers (+ / −), tabs and
// other buttons are untouched, and a button can opt out with data-repeat.
var ACTION = /\b(save|add|delete|del|remove|generate|prepare|send|update|buy|upload|create|submit|finish|restore|log|stop|confirm|share)\b/i;
export function isActionButton(b) {
  if (!b || b.hasAttribute("data-repeat")) return false;
  var t = ((b.textContent || "") + " " + (b.getAttribute("aria-label") || "")).trim();
  return t.length > 1 && ACTION.test(t);
}
export function installTapGuard(win) {
  win = win || (typeof window !== "undefined" ? window : null);
  if (!win || win._lcTapGuard) return; win._lcTapGuard = true;
  // a double tap = two taps on the same action button in a row, with nothing in between (no typing, no other tap, no reply)
  var lastBtn = null, lastAt = 0;
  var reset = function() { lastBtn = null; };
  // the app answered in between (e.g. "couldn't send" → tap again to retry): that's a new tap, not a double tap
  var f = win.fetch;
  if (typeof f === "function") win.fetch = function() { return f.apply(this, arguments).finally(reset); };
  win.document.addEventListener("input", reset, true);
  win.document.addEventListener("keydown", reset, true);
  win.document.addEventListener("click", function(e) {
    var b = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!isActionButton(b)) { lastBtn = null; return; }
    var now = Date.now();
    if (b === lastBtn && now - lastAt < 300) { e.stopPropagation(); e.preventDefault(); return; }
    lastBtn = b; lastAt = now;
  }, true);
}
