import { sGet, sSet } from "./storage.js";
import firebase, { DATA_ROOT } from "./firebase.js";
import { PRICES, addToLedger, costOf, energyFromLedger, featureOf } from "./aiUsage.js";

window.ensureApiKey = async function() {
  if (window._anthropicKey) return window._anthropicKey;
  var ak = await sGet("anthropic_api_key");
  if (ak) { window._anthropicKey = ak; return ak; }
  return "";
};

/* v2.14.0 item 9: every AI reply's token counts go into the usage ledger (src/lib/aiUsage.js), and Companion Energy
   is worked out from the ledger total (spent since the last "Set as 100%"). Counts only, never content. */
window.API_PRICES = PRICES;
window.trackApiUsage = async function(usage, model, feature) {
  try {
    var ref = firebase.database().ref(DATA_ROOT + "/ai_usage");
    var res = await ref.transaction(function(cur) { var L = null; try { L = cur ? JSON.parse(cur) : null; } catch (e) {} return JSON.stringify(addToLedger(L, usage, model, feature || "Other")); });
    var total = JSON.parse(res.snapshot.val()).total.cost;
    var stored = await sGet("companion_energy");
    if (!stored) return;
    var energy = energyFromLedger(JSON.parse(stored), total, total - costOf(usage, model));
    energy.lastUsed = new Date().toISOString();
    await sSet("companion_energy", JSON.stringify(energy));
    /* Update state if the app component can see it */
    window._companionEnergyPct = energy.pct;
    window._companionEnergyStatus = energy.keyStatus || "active";
    if (window._setCompanionEnergy) window._setCompanionEnergy(energy);
  } catch(e) {}
};
// The ledger's running cost total (for "Set as 100%").
window.aiUsageTotal = async function() { try { var v = (await firebase.database().ref(DATA_ROOT + "/ai_usage").once("value")).val(); return v ? JSON.parse(v).total.cost : 0; } catch (e) { return 0; } };

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
    var opts = arguments[1] || {};
    var feature = featureOf(typeof opts.body === "string" ? opts.body : "", { section: window._lcSection, chatOpen: window._lcChatOpen });
    return _origFetch.apply(this, arguments).then(function(resp) {
      var cloned = resp.clone();
      cloned.json().then(function(data) {
        if (data && data.usage) {
          window.trackApiUsage(data.usage, data.model, feature);
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
