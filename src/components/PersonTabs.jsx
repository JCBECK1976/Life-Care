import { useEffect, useRef } from "react";

// A row of person tabs, used in the header and in the exercise log (v2.5.0).
// - Each tab is at least as wide as its name. With few people the tabs share the width
//   equally (as before); with many, the row scrolls sideways.
// - Names longer than 12 characters are cut with "…" (the full name is the tooltip).
// - Whenever the selected person changes (from anywhere), or the row changes size, the row
//   scrolls sideways so the selected tab is visible. It never scrolls the page.
export const MAX_TAB_CHARS = 12;

export function tabLabel(name) {
  const s = String(name || "");
  return s.length > MAX_TAB_CHARS ? s.slice(0, MAX_TAB_CHARS - 1) + "…" : s;
}

export function personName(data, key) {
  return (data && data[key] && data[key].profile && data[key].profile.name) || key;
}

export function peopleOf(data) {
  return Object.keys(data || {}).filter((k) => k !== "config").map((k) => ({ key: k, name: personName(data, k) }));
}

export default function PersonTabs({ people, activeKey, onSelect, tabStyle, activeStyle, inactiveStyle, rowStyle, testId }) {
  const rowRef = useRef(null);
  // Keep the selected tab in view: when the selected person changes, and whenever the row or a
  // tab changes size (the selected tab's letter-spacing animates; the phone rotates; …).
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const showSelected = () => {
      const el = row.querySelector('[data-active="true"]');
      if (!el) return;
      const r = row.getBoundingClientRect(), e = el.getBoundingClientRect();
      if (e.left < r.left) row.scrollLeft -= r.left - e.left + 8;
      else if (e.right > r.right) row.scrollLeft += e.right - r.right + 8;
    };
    showSelected();
    if (typeof ResizeObserver === "undefined") return undefined;
    // watch the row and every tab: the selected tab grows slightly while its letter-spacing animates
    const ro = new ResizeObserver(showSelected);
    ro.observe(row);
    for (const tab of row.children) ro.observe(tab);
    return () => ro.disconnect();
  }, [activeKey, people.length]);
  return (
    <div ref={rowRef} data-testid={testId} style={{ display: "flex", gap: 4, flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none", ...rowStyle }}>
      {people.map((p) => {
        const active = p.key === activeKey;
        return (
          <button key={p.key} data-active={active ? "true" : "false"} title={p.name} onClick={() => onSelect(p.key)}
            style={{ ...tabStyle, ...(active ? activeStyle : inactiveStyle), flex: "1 0 0", minWidth: "max-content", whiteSpace: "nowrap" }}>
            {tabLabel(p.name)}
          </button>
        );
      })}
    </div>
  );
}
