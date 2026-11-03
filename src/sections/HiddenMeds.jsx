import { DEFAULT_MEDS, DEFAULT_SUPPS } from "../constants/health.js";
import { sSet } from "../lib/storage.js";
import { btnDelete, btnEdit, btnP, btnS, inputStyle, labelStyle } from "../constants/styles.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function HiddenMedsSection({ ctx }) {
  const {
    accent, accentLight, activeTab, customMedNames, data, editMedIdx, medInputs, p,
    saveData, setCustomMedNames, setEditMedIdx, setFormMsg, setMedInputs, setShowMedForm, showMedForm
  } = ctx;

          const allMedNames = [...DEFAULT_MEDS, ...DEFAULT_SUPPS, ...customMedNames].sort();
          const meds = p.meds || [];
          const activeMeds = meds.filter(m => m.active && m.type === "medication");
          const activeSupps = meds.filter(m => m.active && m.type === "supplement");
          const inactive = meds.filter(m => !m.active);
          const saveMed = async (medsList) => {
            const nd = JSON.parse(JSON.stringify(data));
            nd[activeTab].meds = medsList;
            if (!nd[activeTab].medsHistory) nd[activeTab].medsHistory = [];
            nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), action: "Updated", snapshot: medsList.filter(m => m.active).map(m => m.name + " " + m.dosage).join(", ") });
            if (nd[activeTab].medsHistory.length > 20) nd[activeTab].medsHistory = nd[activeTab].medsHistory.slice(-20);
            await saveData(nd);
          };
          const addMed = async () => {
            if (!medInputs.name.trim()) return;
            const newMed = { name: medInputs.name.trim(), type: medInputs.type, dosage: medInputs.dosage, timing: medInputs.timing, frequency: medInputs.frequency, notes: medInputs.notes, started: new Date().toISOString().slice(0, 7), active: true };
            const updated = [...meds, newMed];
            await saveMed(updated);
            if (!allMedNames.includes(newMed.name)) { const cn = [...customMedNames, newMed.name]; setCustomMedNames(cn); await sSet("custom_med_names", JSON.stringify(cn)); }
            setShowMedForm(false); setMedInputs({ name: "", type: "medication", dosage: "", timing: "", frequency: "Daily", notes: "" });
            setFormMsg("✓ " + newMed.name + " added"); setTimeout(() => setFormMsg(""), 3000);
          };
          const updateMed = async () => {
            if (editMedIdx === null) return;
            const updated = [...meds];
            updated[editMedIdx] = Object.assign({}, updated[editMedIdx], medInputs);
            await saveMed(updated);
            setEditMedIdx(null); setFormMsg("✓ Updated"); setTimeout(() => setFormMsg(""), 3000);
          };
          const toggleMed = async (idx) => {
            const updated = [...meds]; updated[idx] = Object.assign({}, updated[idx], { active: !updated[idx].active });
            await saveMed(updated);
          };
          const removeMed = async (idx) => {
            var medName = meds[idx] ? meds[idx].name : "this medication";
            if (!confirm("Remove " + medName + "? This cannot be undone.")) return;
            const updated = meds.filter((_, i) => i !== idx);
            await saveMed(updated);
            setFormMsg("✓ Removed"); setTimeout(() => setFormMsg(""), 3000);
          };
          const renderMedCard = (m, idx) => (<div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", opacity: m.active ? 1 : 0.5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name} {m.dosage ? <span style={{ fontWeight: 400, color: "#64748b" }}>{m.dosage}</span> : ""}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{m.timing} · {m.frequency}{m.notes ? " · " + m.notes : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button onClick={() => { setEditMedIdx(idx); setMedInputs(Object.assign({}, m)); }} style={{...btnEdit, fontSize: 9}}>✎ Edit</button>
              <button onClick={() => toggleMed(idx)} style={{ fontSize: 9, color: m.active ? "#d97706" : "#16a34a", background: "none", border: "none", cursor: "pointer" }}>{m.active ? "Stop" : "Restart"}</button>
            </div>
          </div>);
          return (<div>
          <button onClick={() => { setShowMedForm(true); setEditMedIdx(null); setMedInputs({ name: "", type: "medication", dosage: "", timing: "", frequency: "Daily", notes: "" }); }} style={{ ...btnP(), marginBottom: 14 }}>+ Add Medication / Supplement</button>
          {(showMedForm || editMedIdx !== null) && (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{editMedIdx !== null ? "Edit" : "Add"} {medInputs.type === "supplement" ? "Supplement" : "Medication"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div><label style={labelStyle}>Name</label>
                <select value={allMedNames.includes(medInputs.name) ? medInputs.name : "_custom"} onChange={e => { if (e.target.value !== "_custom") setMedInputs(q => ({ ...q, name: e.target.value })); }} style={{ ...inputStyle, marginBottom: 4 }}>
                  <option value="_custom">Custom / type below</option>
                  {allMedNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <input value={medInputs.name} onChange={e => setMedInputs(q => ({ ...q, name: e.target.value }))} style={inputStyle} placeholder="Or type name" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={labelStyle}>Type</label><select value={medInputs.type} onChange={e => setMedInputs(q => ({ ...q, type: e.target.value }))} style={inputStyle}><option value="medication">Medication</option><option value="supplement">Supplement</option></select></div>
                <div><label style={labelStyle}>Dosage</label><input value={medInputs.dosage} onChange={e => setMedInputs(q => ({ ...q, dosage: e.target.value }))} style={inputStyle} placeholder="e.g. 200mcg" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={labelStyle}>When to take</label><input value={medInputs.timing} onChange={e => setMedInputs(q => ({ ...q, timing: e.target.value }))} style={inputStyle} placeholder="e.g. Lunchtime" /></div>
                <div><label style={labelStyle}>Frequency</label><select value={medInputs.frequency} onChange={e => setMedInputs(q => ({ ...q, frequency: e.target.value }))} style={inputStyle}><option>Daily</option><option>Twice daily</option><option>Training days</option><option>Weekly</option><option>As needed</option></select></div>
              </div>
              <div><label style={labelStyle}>Notes</label><input value={medInputs.notes} onChange={e => setMedInputs(q => ({ ...q, notes: e.target.value }))} style={inputStyle} placeholder="Any notes..." /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={editMedIdx !== null ? updateMed : addMed} disabled={!medInputs.name.trim()} style={{ ...btnP(!!medInputs.name.trim()), flex: 1 }}>{editMedIdx !== null ? "Update" : "Add"}</button>
              {editMedIdx !== null && <button onClick={() => { removeMed(editMedIdx); setEditMedIdx(null); }} style={{...btnDelete, padding: "8px 16px", borderRadius: 8, fontSize: 12}}>🗑 Remove</button>}
              <button onClick={() => { setShowMedForm(false); setEditMedIdx(null); }} style={btnS}>Cancel</button>
            </div>
          </div>)}
          {activeMeds.length > 0 && (<div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 10 }}>Medications</div>
            {activeMeds.map((m) => renderMedCard(m, meds.indexOf(m)))}
          </div>)}
          {activeSupps.length > 0 && (<div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", marginBottom: 10 }}>Supplements</div>
            {activeSupps.map((m) => renderMedCard(m, meds.indexOf(m)))}
          </div>)}
          {inactive.length > 0 && (<div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", marginBottom: 14, opacity: 0.6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Stopped</div>
            {inactive.map((m) => renderMedCard(m, meds.indexOf(m)))}
          </div>)}
          {p.medsHistory && p.medsHistory.length > 0 && (<div style={{ background: accentLight, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>CHANGE HISTORY</div>
            {p.medsHistory.slice(-5).reverse().map((h, i) => (<div key={i} style={{ fontSize: 10, color: "#64748b", padding: "3px 0" }}>{h.date}: {h.snapshot}</div>))}
          </div>)}
        </div>); }
