import { APP_ENV } from "../constants/version.js";

// A clear coloured badge so you always know you're on a test version.
// Prod renders nothing.
const BADGES = {
  build: { label: "BUILD", bg: "#ea580c" },
  beta: { label: "BETA", bg: "#7c3aed" },
};

export default function EnvBadge() {
  const b = BADGES[APP_ENV];
  if (!b) return null;
  return (
    <span data-testid="env-badge" style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: b.bg, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", verticalAlign: "middle" }}>
      {b.label}
    </span>
  );
}
