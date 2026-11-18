import React, { useEffect, useRef, useState } from "react";
import { usePlan, loadPlan, setPreview, canPreview } from "../lib/myPlan.js";
import { TIER_ORDER, TIER_NAMES, TOP_UP, money, tierAllows } from "../constants/tiers.js";
import { buyPlan, buyTopUp, manageUrl } from "../lib/billing.js";
import { pilotOn } from "../lib/pilot.js";
import { auth } from "../lib/firebase.js";
import { callFunction, APP_ID } from "../lib/platform.js";

// v2.22.0 (ADR 0017): Settings → My Plan. Collapsible, collapsed by default, under the colour theme.
// 1 current plan (+ renewal, Companion Energy %), 2 the four plans compared (monthly / yearly), 3 Upgrade / Change / Manage,
// 4 the £5 top-up (Silver and up), 5 Platinum owner: My family. A Platinum member never sees this card (Settings shows
// "You're on [owner]'s Platinum Family plan" instead).
var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 0, marginBottom: 14 };
var btn = { padding: "10px 14px", minHeight: 44, borderRadius: 8, border: "1px solid #1e3a5f", background: "#fff", color: "#1e3a5f", fontWeight: 700, fontSize: 13, cursor: "pointer" };
var btnP = Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var ROWS = [
  ["Health, Eating, Exercise: track, progress, charts", function() { return true; }],
  ["Companion feedback and chat", function(t, T) { return tierAllows(t, "aiFeedback", T); }],
  ["Food ratings, Snap, My own item", function(t, T) { return tierAllows(t, "snap", T); }],
  ["Body balance, steps and health sync", function(t, T) { return tierAllows(t, "bodyBalance", T); }],
  ["GP prep summary", function(t, T) { return tierAllows(t, "gpSummary", T); }, "pilot"],   // v2.30.0: only while the pilot features are on
  ["Help", function(t, T) { return tierAllows(t, "aiHelp", T) ? "Ask" : "FAQ"; }],
  ["Generate meals and shopping lists", function(t, T) { return tierAllows(t, "mealGenerator", T); }],
  ["AI training plans (warm-up, cool-down)", function(t, T) { return tierAllows(t, "aiPlans", T); }],
  ["Family: up to 5 people, sharing", function(t, T) { return tierAllows(t, "household", T); }],
];
var SHORT = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
var fmtDate = function(ms) { try { return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };

export default function MyPlanCard(props) {
  var plan = usePlan();
  var T = plan.tiers;
  var [open, setOpen] = useState(false);
  var [yearly, setYearly] = useState(plan.basePlan === "yearly");   // start on the period the person pays
  var [pick, setPick] = useState(null);
  var [msg, setMsg] = useState("");
  var [busy, setBusy] = useState(false);
  var [email, setEmail] = useState("");
  var ref = useRef(null);
  useEffect(function() {
    var on = function() { window._lcOpenMyPlan = false; setOpen(true); setTimeout(function() { if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" }); }, 50); };
    window.addEventListener("lc-open-plans", on);
    if (window._lcOpenMyPlan) { window._lcOpenMyPlan = false; on(); }
    return function() { window.removeEventListener("lc-open-plans", on); };
  }, []);
  var cur = plan.tier;
  var choice = pick && pick !== cur ? pick : null;
  var energy = plan.joint && !plan.preview ? (props.energyPct != null ? props.energyPct : null) : plan.energyPct;
  var run = async function(fn) { setBusy(true); setMsg(""); try { var r = await fn(); setMsg(r && r.msg || ""); if (r && r.ok) await loadPlan(); } catch (e) { setMsg(String((e && e.message) || e)); } setBusy(false); };
  var fam = async function(name, data) { return run(async function() { await callFunction(name, Object.assign({ appId: APP_ID }, data), await auth.currentUser.getIdToken()); return { ok: true, msg: "✓ Done." }; }); };
  var cell = { padding: "6px 2px", textAlign: "center", fontSize: 12, borderBottom: "1px solid #f1f5f9" };

  return (<div ref={ref} data-testid="my-plan" style={card}>
    <button type="button" aria-expanded={open} aria-controls="my-plan-body" data-testid="my-plan-toggle" onClick={function() { setOpen(!open); }}
      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, minHeight: 44, cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>💳 My Plan <span style={{ fontWeight: 500, color: "#475569" }}>· {TIER_NAMES[cur]}</span></span>
      <span aria-hidden="true" style={{ fontSize: 14, color: "#475569" }}>{open ? "▲" : "▼"}</span>
    </button>
    {open && <div id="my-plan-body">
      {/* 1. current plan */}
      <div data-testid="plan-current" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginTop: 8, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>
        <div>You're on <b>{TIER_NAMES[cur]}</b>{plan.preview ? " (preview)" : ""}.</div>
        {plan.joint && !plan.preview && <div style={{ fontSize: 12, color: "#475569" }}>Shared account: all features on until each of you has your own login; then JC is the Platinum Family owner and Becks a member, at no charge.</div>}
        {!plan.joint && plan.source === "admin" && <div style={{ fontSize: 12, color: "#475569" }}>Granted by the developer: never billed.</div>}
        {plan.source === "play" && plan.expires && <div data-testid="plan-renewal" style={{ fontSize: 12, color: "#475569" }}>{plan.autoRenew ? "Renews " : "Ends "}{fmtDate(plan.expires)}{plan.basePlan ? " · " + plan.basePlan : ""}</div>}
        {cur !== "bronze" && energy != null && <div data-testid="plan-energy" style={{ marginTop: 4 }}>⚡ Companion Energy this month{plan.role === "owner" && !plan.joint ? " (family pool)" : ""}: <b>{energy}%</b>{plan.topup > 0 ? <span data-testid="plan-topup-left"> + {plan.topup.toLocaleString("en-GB")} top-up</span> : null}
          <div aria-hidden="true" style={{ height: 6, background: "#e2e8f0", borderRadius: 3, marginTop: 3 }}><div style={{ width: energy + "%", height: 6, borderRadius: 3, background: energy > 20 ? "#16a34a" : "#dc2626" }} /></div></div>}
        {cur === "bronze" && <div style={{ fontSize: 12, color: "#475569" }}>Manual tracking for Health, Eating and Exercise. No AI.</div>}
      </div>
      {plan.joint && canPreview() && <label style={{ display: "block", fontSize: 12, color: "#475569", marginTop: 8 }}>Testing on /build/: preview the app as
        <select data-testid="plan-preview" value={plan.preview ? cur + (plan.role === "member" ? "-member" : "") : ""} onChange={function(e) { var v = e.target.value; setPreview(v ? { tier: v.replace("-member", ""), role: /member/.test(v) ? "member" : undefined } : null); }}
          style={{ display: "block", marginTop: 4, padding: "8px 10px", minHeight: 44, fontSize: 13, borderRadius: 8, border: "1px solid #cbd5e1", width: "100%" }}>
          <option value="">This account (all features)</option>
          {TIER_ORDER.map(function(t) { return <option key={t} value={t}>{TIER_NAMES[t]}{t === "platinum" ? " (owner)" : ""}</option>; })}
          <option value="platinum-member">Platinum Family (member)</option>
        </select></label>}

      {/* 2. compare */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div role="heading" aria-level={4} style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Compare plans</div>
        <div role="group" aria-label="Price period" style={{ display: "flex", border: "1px solid #1e3a5f", borderRadius: 8, overflow: "hidden" }}>
          {[["Monthly", false], ["Yearly", true]].map(function(o) { var on = yearly === o[1]; return <button key={o[0]} type="button" aria-pressed={on} data-testid={"period-" + o[0].toLowerCase()} onClick={function() { setYearly(o[1]); }}
            style={{ padding: "6px 10px", minHeight: 36, border: "none", background: on ? "#1e3a5f" : "#fff", color: on ? "#fff" : "#1e3a5f", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{o[0]}</button>; })}
        </div>
      </div>
      <table data-testid="plan-compare" style={{ width: "100%", borderCollapse: "collapse", marginTop: 6, tableLayout: "fixed" }}>
        <caption style={{ position: "absolute", left: -9999 }}>The four plans compared</caption>
        <thead><tr><th scope="col" style={{ width: "36%" }}><span style={{ position: "absolute", left: -9999 }}>Feature</span></th>
          {TIER_ORDER.map(function(t) { var on = t === cur; var sel = t === choice; return <th key={t} scope="col" data-testid={"plan-col-" + t} aria-current={on ? "true" : undefined}
            style={{ padding: 0, background: on ? "#dbeafe" : "transparent", borderRadius: "8px 8px 0 0", border: sel ? "2px solid #2563eb" : "none" }}>
            <button type="button" disabled={plan.role === "member" || plan.joint && !plan.preview || t === "bronze"} onClick={function() { setPick(t); setMsg(""); }} aria-label={"Choose " + TIER_NAMES[t]}
              style={{ width: "100%", padding: "6px 0", minHeight: 44, background: "none", border: "none", cursor: "pointer", color: "#0f172a" }}>
              <div style={{ fontSize: 11, fontWeight: 800 }}>{SHORT[t]}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{t === "bronze" ? "Free" : money(yearly ? T[t].yearlyPence : T[t].pricePence) + (yearly ? "/yr" : "/mo")}</div>
              {on && <div style={{ fontSize: 9, fontWeight: 700, color: "#1d4ed8" }}>Yours</div>}
            </button></th>; })}</tr></thead>
        <tbody>
          {ROWS.filter(function(r) { return r[2] !== "pilot" || pilotOn(); }).map(function(r) { return <tr key={r[0]}><th scope="row" style={{ fontSize: 11, fontWeight: 500, textAlign: "left", color: "#0f172a", padding: "6px 4px 6px 0", borderBottom: "1px solid #f1f5f9", lineHeight: 1.3 }}>{r[0]}</th>
            {TIER_ORDER.map(function(t) { var v = r[1](t, T); return <td key={t} style={Object.assign({}, cell, { background: t === cur ? "#eff6ff" : "transparent", color: v ? "#166534" : "#94a3b8", fontWeight: 700 })}>
              {v === true ? <span aria-label="Included">✓</span> : v ? <span style={{ fontSize: 10 }}>{v}</span> : <span aria-label="Not included">—</span>}</td>; })}</tr>; })}
          <tr><th scope="row" style={{ fontSize: 11, fontWeight: 500, textAlign: "left", padding: "6px 4px 6px 0", color: "#0f172a" }}>Companion Energy each month</th>
            {TIER_ORDER.map(function(t) { return <td key={t} style={Object.assign({}, cell, { fontSize: 10, background: t === cur ? "#eff6ff" : "transparent" })}>{T[t].energy ? Number(T[t].energy).toLocaleString("en-GB") + (T[t].sharedPool ? " shared" : "") : "—"}</td>; })}</tr>
        </tbody>
      </table>
      {yearly && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Yearly saves about two months.</div>}

      {/* v2.27.3: what Companion Energy is (figures from config: admin-configurable) */}
      <details data-testid="energy-explainer" open style={{ marginTop: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#0f172a", lineHeight: 1.5 }}>
        <summary style={{ fontWeight: 700, cursor: "pointer" }}>⚡ About Companion Energy</summary>
        <div style={{ marginTop: 4 }}>Energy pays for the Companion's AI work. Typical Energy per action:</div>
        <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
          {(((plan.guide || {}).typical) || []).map(function(t) { return <li key={t.k}>{t.label}: about <b>{t.energy}</b></li>; })}
        </ul>
        <div>Each month: Silver <b>{Number(T.silver.energy || 0).toLocaleString("en-GB")}</b>, Gold <b>{Number(T.gold.energy || 0).toLocaleString("en-GB")}</b>, Platinum Family <b>{Number(T.platinum.energy || 0).toLocaleString("en-GB")}</b> (shared by the family).</div>
        <div><b>Monthly Energy doesn't roll over:</b> it starts again at the full amount when your plan renews.</div>
        <div><b>Top-ups never expire:</b> they're used after the month's Energy runs out.</div>
        <div><b>Tracking never uses Energy:</b> logging food, exercise, weight and health is always free.</div>
      </details>

      {/* 3. buttons */}
      {!(plan.joint && !plan.preview) && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {cur === "bronze"
          ? <button type="button" data-testid="plan-upgrade" disabled={busy} style={btnP} onClick={function() { if (!choice) { setMsg("Tap a plan above (Silver, Gold or Platinum) to choose it."); return; } run(function() { return buyPlan(choice, yearly ? "yearly" : "monthly"); }); }}>{choice ? "Upgrade to " + SHORT[choice] + " · " + money(yearly ? T[choice].yearlyPence : T[choice].pricePence) + (yearly ? "/yr" : "/mo") : "Upgrade"}</button>
          : <button type="button" data-testid="plan-change" disabled={busy || plan.source === "admin"} style={btnP} onClick={function() { if (!choice) { setMsg("Tap the plan you'd like above."); return; } run(function() { return buyPlan(choice, yearly ? "yearly" : "monthly"); }); }}>{choice ? "Change to " + SHORT[choice] : "Change plan"}</button>}
        {cur !== "bronze" && plan.source !== "admin" && <a data-testid="plan-manage" href={manageUrl(cur)} target="_blank" rel="noopener noreferrer" style={Object.assign({}, btn, { display: "inline-flex", alignItems: "center", textDecoration: "none" })}>Manage or cancel</a>}
      </div>}
      {cur !== "bronze" && <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>If you move to a smaller plan or cancel, everything you've recorded stays. Only new Companion features stop.</div>}

      {/* 4. top-up */}
      {tierAllows(cur, "buyEnergy", T) && !(plan.joint && !plan.preview) && <button type="button" data-testid="plan-topup" disabled={busy} style={Object.assign({}, btn, { marginTop: 10, width: "100%" })} onClick={function() { run(function() { return buyTopUp(); }); }}>⚡ Top up Companion Energy: {money(TOP_UP.pricePence)}</button>}
      {msg && <div role="status" aria-live="polite" data-testid="plan-msg" style={{ marginTop: 8, fontSize: 12, padding: 8, borderRadius: 8, background: /^✓/.test(msg) ? "#dcfce7" : "#f1f5f9", color: "#0f172a" }}>{msg}</div>}

      {/* 5. Platinum owner: My family */}
      {cur === "platinum" && plan.role === "owner" && <div data-testid="my-family" style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
        <div role="heading" aria-level={4} style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>👪 My family</div>
        {plan.joint && !plan.preview
          ? <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>JC and Becks share this account for now. Inviting comes with your own logins (planned, needs your go-ahead).</div>
          : <>
            {energy != null && <div style={{ fontSize: 12, color: "#0f172a", marginTop: 4 }}>Family Energy pool: <b>{energy}%</b> of {Number(T.platinum.energy).toLocaleString("en-GB")} Energy this month, shared by everyone.</div>}
            <ul style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>
              {((plan.family && plan.family.members) || [{ uid: "me", name: "You", owner: true }]).map(function(m) { return <li key={m.uid} data-testid="family-member" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                <span>{m.name}{m.owner ? " (you, owner)" : ""}</span>
                {!m.owner && <button type="button" style={Object.assign({}, btn, { padding: "6px 10px", fontSize: 12, borderColor: "#b91c1c", color: "#b91c1c" })} onClick={function() { if (window.confirm("Remove " + m.name + " from your family plan? Their records stay theirs.")) fam("removeMember", { uid: m.uid }); }}>Remove</button>}
              </li>; })}
              {((plan.family && plan.family.invites) || []).map(function(i) { return <li key={i.code} style={{ fontSize: 12, color: "#475569", padding: "4px 0" }}>Invited: {i.email}</li>; })}
            </ul>
            <label htmlFor="family-invite" style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Invite by email ({Math.max(0, (T.platinum.maxMembers || 5) - ((plan.family && plan.family.members.length) || 1) - ((plan.family && plan.family.invites.length) || 0))} places left)</label>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input id="family-invite" type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="name@example.com" style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 14, borderRadius: 8, border: "1px solid #cbd5e1" }} />
              <button type="button" data-testid="family-invite-btn" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)} style={btnP} onClick={function() { var e = email; setEmail(""); run(async function() {
                var t = await auth.currentUser.getIdToken();
                var hid = plan.family && plan.family.hid;
                if (!hid) hid = ((await callFunction("createHousehold", { appId: APP_ID }, t).catch(function() { return {}; })) || {}).hid || plan.hid;
                var r = await callFunction("inviteMember", { appId: APP_ID, email: e }, t);
                return { ok: true, msg: "✓ Invite ready for " + e + ". Send them this link: " + location.origin + location.pathname + "?join=" + encodeURIComponent((hid || "") + "." + ((r && r.code) || "")) };
              }); }}>Invite</button>
            </div>
          </>}
      </div>}
    </div>}
  </div>);
}
