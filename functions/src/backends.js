// How aiProxy reaches Claude. AI_BACKEND: "vertex" = Claude on Vertex AI, EU region (target, SAD-A1/G4);
// "direct" = the current Anthropic API path (fallback until JC switches); "mock" = emulator/tests only.
import { AI_BACKEND, VERTEX } from "./config.js";

export function pickBackend(env = {}) {
  const kind = AI_BACKEND();
  if (kind === "mock") return async (body) => ({ id: "msg_mock", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text: "Mocked server reply." }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } });
  if (kind === "vertex") return async (body) => {
    const { GoogleAuth } = await import("google-auth-library");
    const token = await (await new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" }).getClient()).getAccessToken();
    const url = `https://${VERTEX.region}-aiplatform.googleapis.com/v1/projects/${VERTEX.project}/locations/${VERTEX.region}/publishers/anthropic/models/${body.model}:rawPredict`;
    const vbody = Object.assign({ anthropic_version: "vertex-2023-10-16" }, body); delete vbody.model;
    const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + (token.token || token), "Content-Type": "application/json" }, body: JSON.stringify(vbody) });
    if (!r.ok) throw new Error("Vertex AI HTTP " + r.status);
    return r.json();
  };
  return async (body) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.anthropicKey || "", "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Anthropic API HTTP " + r.status);
    return r.json();
  };
}
