// v2.34.0 (Architect, cyber review 18 Nov — native accessibility): many older forms show a visible <label> right
// before their box without linking the two, so TalkBack / VoiceOver read "edit box" with no name. This links each such
// label to the box right after it (aria-labelledby), for screen readers only; nothing visible changes. Boxes that
// already have a name (aria-label, aria-labelledby, a <label for>, or a label around them) are left alone.
var n = 0;
var CONTROL = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea";
function named(c) {
  if (c.getAttribute("aria-label") || c.getAttribute("aria-labelledby") || c.closest("label")) return true;
  return !!(c.id && document.querySelector('label[for="' + CSS.escape(c.id) + '"]'));
}
export function linkOrphanLabels(root) {
  var done = 0;
  (root || document).querySelectorAll("label:not([for])").forEach(function(l) {
    if (l.querySelector("input, select, textarea") || !l.textContent.trim()) return;
    var c = l.nextElementSibling;
    if (!c || !c.matches(CONTROL) || named(c)) return;
    if (!l.id) l.id = "lc-lbl-" + (++n);
    c.setAttribute("aria-labelledby", l.id); done++;
  });
  return done;
}
/** Keeps doing it as screens change (once per animation frame at most). */
export function watchOrphanLabels() {
  if (typeof MutationObserver === "undefined") return function() {};
  var queued = false;
  var run = function() { queued = false; linkOrphanLabels(document); };
  var mo = new MutationObserver(function() { if (!queued) { queued = true; requestAnimationFrame(run); } });
  mo.observe(document.body, { childList: true, subtree: true });
  run();
  return function() { mo.disconnect(); };
}
