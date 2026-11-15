import React from "react";
// v2.20.0 (WCAG 2.2 AA, JC's accessibility item): dialogs and sheets keep focus inside, close with Esc (or the phone's
// Back gesture where the browser maps it to Esc), move focus in when they open and give it back when they close.
var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Returns a ref for the dialog's panel. open: whether it is shown; onClose: called on Esc. */
export function useDialog(open, onClose) {
  var ref = React.useRef(null);
  var close = React.useRef(onClose); close.current = onClose;
  React.useEffect(function() {
    if (!open) return;
    var before = document.activeElement;
    var t = setTimeout(function() {
      var el = ref.current; if (!el || el.contains(document.activeElement)) return;
      var first = el.querySelector("textarea:not([disabled]), input:not([disabled]):not([type=hidden])") || el.querySelector(FOCUSABLE);
      if (first) first.focus();
    }, 30);
    var onKey = function(e) {
      var el = ref.current; if (!el) return;
      if (e.key === "Escape") { e.preventDefault(); if (close.current) close.current(); return; }
      if (e.key !== "Tab") return;
      var items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function(x) { return x.offsetParent !== null; });
      if (!items.length) return;
      var a = items[0], z = items[items.length - 1];
      if (!el.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return function() { clearTimeout(t); document.removeEventListener("keydown", onKey); if (before && before.focus && document.contains(before)) { try { before.focus(); } catch (e) { /* ignore */ } } };
  }, [open]);
  return ref;
}
