// How aiProxy reaches Claude. AI_BACKEND: "vertex" = Claude on Vertex AI, EU region (target, SAD-A1/G4);
// "direct" = the current Anthropic API path (fallback until JC switches); "mock" = emulator/tests only.
import { AI_BACKEND, VERTEX } from "./config.js";

/* v2.26.0: AI_BACKEND=vertex (Claude on Vertex AI, EU region) with AI_FALLBACK=direct — if Vertex is unavailable
   (5xx / 429 / network), the same request goes to the direct API once, so the app keeps working. VERTEX_MODEL names
   the model as Vertex lists it (Model Garden); the app's model string is unchanged. */
export function pickBackend(env = {}) {
  const kind = AI_BACKEND();
  if (kind === "vertex" && (env.fallback || process.env.AI_FALLBACK) === "direct") {
    const primary = vertexBackend(env), backup = directBackend(env);
    return async (body) => {
      try { return await primary(body); }
      catch (e) { if (!/HTTP (429|5\d\d)|fetch|network|ECONN|ETIMEDOUT/i.test(String(e && e.message))) throw e; const r = await backup(body); r.backend = "direct-fallback"; return r; }
    };
  }
  return pick(kind, env);
}
function vertexBackend(env) { return pick("vertex", env); }
function directBackend(env) { return pick("direct", env); }
function pick(kind, env) {
  if (kind === "mock") return async (body) => ({ id: "msg_mock", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text: "Mocked server reply." }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } });
  if (kind === "vertex") return async (body) => {
    const token = env.vertexToken || await (await new (await import("google-auth-library")).GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" }).getClient()).getAccessToken();
    const model = env.vertexModel || process.env.VERTEX_MODEL || body.model;
    const url = `https://${VERTEX.region}-aiplatform.googleapis.com/v1/projects/${VERTEX.project}/locations/${VERTEX.region}/publishers/anthropic/models/${model}:rawPredict`;
    if (env.fetchImpl) env.fetchImplUsed = url;
    const vbody = Object.assign({ anthropic_version: "vertex-2023-10-16" }, body); delete vbody.model;
    const r = await (env.fetchImpl || fetch)(url, { method: "POST", headers: { Authorization: "Bearer " + (token.token || token), "Content-Type": "application/json" }, body: JSON.stringify(vbody) });
    if (!r.ok) throw new Error("Vertex AI HTTP " + r.status);
    return r.json();
  };
  return async (body) => {
    const r = await (env.fetchImpl || fetch)("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.anthropicKey || "", "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Anthropic API HTTP " + r.status);
    return r.json();
  };
}
