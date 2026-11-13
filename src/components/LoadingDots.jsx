import React from "react";
// v2.16.1 SAD-A2: the animated "..." used on busy buttons, as plain React elements (no raw HTML).
export default function LoadingDots(props) {
  return React.createElement("span", { className: props.className || "loading-dots" },
    React.createElement("span", null, "."), React.createElement("span", null, "."), React.createElement("span", null, "."));
}
