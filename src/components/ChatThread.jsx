import React from "react";
import { newestFirst } from "../lib/chat.js";

// v2.20.0: one way to show a Companion conversation everywhere (Chat, Help, every feedback thread): newest message at
// the top, at message level. messages = [{ role: "user" | "companion" | "assistant", text, when }] stored oldest first.
export var COMPANION_LABEL = "Your Companion";   // v2.20.0 (JC)
export default function ChatThread(props) {
  var msgs = newestFirst(props.messages || []);
  return (<div data-testid={props.testid || "chat-thread"} aria-live="polite">
    {msgs.map(function(m, i) {
      var isUser = m.role === "user";
      return (<div key={i} data-testid="chat-msg" data-role={isUser ? "user" : "companion"} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
        <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isUser ? props.userBg || "#eff6ff" : "#334155", border: isUser ? "1px solid " + (props.userBorder || "#bfdbfe") : "none", color: isUser ? "#334155" : "#fff", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</div>
        <div style={{ fontSize: 9, color: "#475569", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>{isUser ? "You" : COMPANION_LABEL}{m.when ? " · " + m.when : ""}</div>
      </div>);
    })}
  </div>);
}
