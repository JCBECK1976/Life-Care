import { sGet, sSet } from "./storage.js";

window.ensureApiKey = async function() {
  if (window._anthropicKey) return window._anthropicKey;
  var ak = await sGet("anthropic_api_key");
  if (ak) { window._anthropicKey = ak; return ak; }
  return "";
};

/* Track API usage cost against companion energy balance */
/* USD per million tokens: [input, 5-min cache write, cache read, output] — Anthropic list prices */
window.API_PRICES = { "claude-sonnet-4-6": [3, 3.75, 0.30, 15] };

window.trackApiUsage = async function(usage, model) {
  try {
    usage = usage || {};
    var pr = window.API_PRICES[model] || window.API_PRICES["claude-sonnet-4-6"];
    var cost = ((usage.input_tokens || 0) * pr[0] + (usage.cache_creation_input_tokens || 0) * pr[1] + (usage.cache_read_input_tokens || 0) * pr[2] + (usage.output_tokens || 0) * pr[3]) / 1000000;
    var stored = await sGet("companion_energy");
    if (!stored) return;
    var energy = JSON.parse(stored);
    energy.spent = (energy.spent || 0) + cost;
    if (!(energy.initial > 0)) energy.initial = 5; /* records saved without a starting level computed 0% */
    energy.balance = Math.max(0, energy.initial - energy.spent);
    energy.pct = Math.round((energy.balance / energy.initial) * 100);
    energy.lastUsed = new Date().toISOString();
    await sSet("companion_energy", JSON.stringify(energy));
    /* Update state if the app component can see it */
    window._companionEnergyPct = energy.pct;
    window._companionEnergyStatus = energy.keyStatus || "active";
    if (window._setCompanionEnergy) window._setCompanionEnergy(energy);
  } catch(e) {}
};

/* Intercept all Anthropic API calls to track usage and block when empty */
export var _origFetch = window.fetch;

window._origFetch = _origFetch;

window.fetch = function() {
  var url = arguments[0];
  if (typeof url === "string" && url.indexOf("api.anthropic.com") !== -1) {
    /* v1.366.1: Local energy ledger is a DISPLAY estimate only — it must never block
       a real API call. Anthropic is the authority on credit: if the account is genuinely
       out, the API returns a "credit balance" error and handleApiError surfaces it.
       The old client-side gate here blocked every call once its own estimate drifted
       past 95% of a hardcoded $5, which made all AI features fail while real credit
       was fine, and never reliably reset. */
    return _origFetch.apply(this, arguments).then(function(resp) {
      var cloned = resp.clone();
      cloned.json().then(function(data) {
        if (data && data.usage) {
          window.trackApiUsage(data.usage, data.model);
        }
      }).catch(function() {});
      return resp;
    });
  }
  return _origFetch.apply(this, arguments);
};

/* Helper: detect ENERGY_EMPTY errors and return user-friendly message */
window.isEnergyEmpty = function(e) { return e && (e.message === "ENERGY_EMPTY" || String(e).indexOf("ENERGY_EMPTY") !== -1); };

window.energyEmptyMsg = "⚡ Companion Energy Empty. Please top up!";

window.aiErrorMsg = function(e, fallback) { return window.isEnergyEmpty(e) ? window.energyEmptyMsg : (fallback || ("Error: " + String(e).substring(0, 100))); };

// Handle API errors - detect credit exhaustion
export function handleApiError(result) {
  if (result && result.error) {
    var msg = (result.error.message || "").toLowerCase();
    var errType = (result.error.type || "").toLowerCase();
    if (msg.indexOf("credit balance") >= 0 || msg.indexOf("billing") >= 0 || msg.indexOf("payment required") >= 0 || errType === "insufficient_quota") {
      /* Anthropic says the account is out of credit — the only true "empty" signal */
      sGet("companion_energy").then(function(st) { var en = st ? JSON.parse(st) : { initial: 5 }; en.balance = 0; en.pct = 0; en.spent = en.initial || 5; en.depleted = true; en.needsCalibration = false; en.keyStatus = "active"; sSet("companion_energy", JSON.stringify(en)); if (window._setCompanionEnergy) window._setCompanionEnergy(en); }).catch(function(){});
      return "ENERGY_EMPTY";
    }
    if (errType === "rate_limit_error" || msg.indexOf("rate limit") >= 0) {
      return "Rate limit reached — wait a moment and try again";
    }
    if (errType === "authentication_error" || msg.indexOf("invalid x-api-key") >= 0 || msg.indexOf("invalid api key") >= 0) {
      return "Invalid API key — check your key in Admin settings";
    }
    if (errType === "overloaded_error" || msg.indexOf("overloaded") >= 0) {
      return "API busy — try again in a moment";
    }
    return "Error: " + (result.error.message || JSON.stringify(result.error)).substring(0, 150);
  }
  return null;
}
