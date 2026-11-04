import React from "react";

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════
// Loading button with animated dots
export function LoadingBtn(props) {
  var loading = props.loading;
  var label = props.label || "Generate";
  var loadLabel = props.loadLabel || "Generating";
  return React.createElement("button", {
    onClick: props.onClick,
    disabled: loading || props.disabled,
    style: Object.assign({}, {
      width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8,
      fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.7 : 1, background: loading ? "#94a3b8" : (props.bg || "#2563eb"),
      marginTop: props.mt || 10, position: "relative"
    }, props.style || {})
  }, loading ? React.createElement("span", null,
    loadLabel + " ",
    React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })
  ) : label);
}
