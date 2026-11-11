// v2.13.2: an Open form or Progress panel can open below the card, off-screen on a phone. On open, smoothly scroll
// it so its top is visible. Below any bar fixed to the top of the screen (there is none today; this keeps working
// if one is added), with a small margin. If it is already fully on screen, nothing moves.
function topOffset() {
  var h = 0;
  var els = document.querySelectorAll("header, nav, [data-sticky-header]");
  for (var i = 0; i < els.length; i++) {
    var s = getComputedStyle(els[i]); if (s.position !== "fixed" && s.position !== "sticky") continue;
    var r = els[i].getBoundingClientRect(); if (r.top <= 1 && r.bottom > h) h = r.bottom;
  }
  return h + 8;
}
export function scrollPanelIntoView(el) {
  if (!el || !el.isConnected) return;
  var r = el.getBoundingClientRect(); var top = topOffset(); var vh = window.innerHeight || document.documentElement.clientHeight;
  if (r.top >= top && r.bottom <= vh - 8) return;                   // already fully visible
  if (r.top >= top && r.height > vh - top - 8 && r.top < vh * 0.25) return;   // tall panel whose top is already near the top
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top), behavior: "smooth" });
}
// Stable ref callback: React calls it once when the element mounts (and with null when it unmounts).
export function scrollOnMount(el) {
  if (!el) return;
  requestAnimationFrame(function() { requestAnimationFrame(function() { scrollPanelIntoView(el); }); });
}
