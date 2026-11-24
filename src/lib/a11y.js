import React from "react";
// v2.20.0 (WCAG 2.2 AA, JC's accessibility item): dialogs and sheets keep focus inside, close with Esc (or the phone's
// Back gesture where the browser maps it to Esc), move focus in when they open and give it back when they close.
var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Returns a ref for the dialog's panel. open: whether it is shown; onClose: called on Esc. */
/** opts.noTypingFocus: on a touch phone, move focus to the first button rather than a text box (no keyboard pop-up). */
export function isTouchPhone() { try { return window.matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (e) { return false; } }
export function useDialog(open, onClose, opts) {
  var ref = React.useRef(null);
  var close = React.useRef(onClose); close.current = onClose;
  var optsRef = React.useRef(opts); optsRef.current = opts;
  React.useEffect(function() {
    if (!open) return;
    var before = document.activeElement;
    var t = setTimeout(function() {
      var el = ref.current; if (!el || el.contains(document.activeElement)) return;
      var vis = function(sel) { return Array.prototype.find.call(el.querySelectorAll(sel), function(x) { return x.getClientRects().length > 0 && (x.tagName === "SUMMARY" || !x.closest("details:not([open])")); }); };   // v2.45.0: never a field inside a closed section
      var o = optsRef.current;
      var first = (o && o.noTypingFocus && isTouchPhone() ? vis("button:not([disabled])") : vis("textarea:not([disabled]), input:not([disabled]):not([type=hidden])")) || vis(FOCUSABLE);
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

/** v2.20.0 polish, installed once (main.jsx):
 *  - number fields open the numeric keypad (inputmode="decimal" unless set) and select their value on focus, so typing
 *    replaces it (weights, reps, amounts);
 *  - a light haptic tap on Save / Confirm / Send / Add buttons where the phone supports it. */
export function installFieldHelpers(doc) {
  doc = doc || document;
  var mark = function(root) { (root.querySelectorAll ? root.querySelectorAll('input[type="number"]:not([inputmode])') : []).forEach(function(el) { el.setAttribute("inputmode", "decimal"); }); };
  mark(doc);
  try { new MutationObserver(function(muts) { muts.forEach(function(m) { m.addedNodes.forEach(function(n) { if (n.nodeType === 1) { if (n.matches && n.matches('input[type="number"]:not([inputmode])')) n.setAttribute("inputmode", "decimal"); mark(n); } }); }); }).observe(doc.body || doc, { childList: true, subtree: true }); } catch (e) { /* old browser */ }
  doc.addEventListener("focusin", function(e) {
    var el = e.target; if (!el || el.tagName !== "INPUT" || el.type !== "number") return;
    var sel = function() { try { if (document.activeElement === el) el.select(); } catch (x) { /* not selectable */ } };
    setTimeout(sel, 0);
    var up = function(ev) { ev.preventDefault(); sel(); el.removeEventListener("mouseup", up); };   // keep the selection after a click
    el.addEventListener("mouseup", up); setTimeout(function() { el.removeEventListener("mouseup", up); }, 600);
  });
  doc.addEventListener("click", function(e) {
    var b = e.target && e.target.closest && e.target.closest("button"); if (!b || b.disabled) return;
    if (/^\s*(✓\s*)?(Save|Confirm|Send|Add|Set|Yes)\b/i.test(b.textContent || "")) { try { if (navigator.vibrate) navigator.vibrate(10); } catch (x) { /* no haptics */ } }
  }, true);
}
