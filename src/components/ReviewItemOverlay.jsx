import { btnActionLg, btnClose } from "../constants/styles.js";
import NoFoodPanel from "./NoFoodPanel.jsx";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function ReviewItemOverlay({ ctx }) {
  const {
    accentBtnBorder, accentBtnLight, cameraPreview, formMsg, manageListsOpen, reviewCategories, reviewSideType, section,
    setAddingSlotDay, setAddingSlotKey, setCameraPreview, setFormMsg, setReviewCategories, setReviewSideType
  } = ctx;

  return (<>
{cameraPreview && !manageListsOpen && section === "meals" && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 14, border: "1px solid #86efac", maxWidth: 400, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Review Item</div>
            <button onClick={function() { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); }} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
          </div>
          {cameraPreview.noFood ? (<NoFoodPanel testid="review-no-food" desc={cameraPreview.desc} onRecheck={function(d) { if (window._lcRecheckAddPhoto) window._lcRecheckAddPhoto(d); }} onCancel={function() { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); }} />) : (<>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Name</div>
            <input id="review-item-name-overlay" defaultValue={cameraPreview.name} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, flexWrap: "wrap" }}>
            <span><b>{cameraPreview.kcal}</b> kcal</span><span><b>{cameraPreview.protein}g</b> prot</span><span><b>{cameraPreview.fat}g</b> fat</span>
            {cameraPreview.satFat > 0 && <span><b>{cameraPreview.satFat}g</b> s/fat</span>}
            {cameraPreview.carbs > 0 && <span><b>{cameraPreview.carbs}g</b> carbs</span>}
            {cameraPreview.fibre > 0 && <span><b>{cameraPreview.fibre}g</b> fibre</span>}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: cameraPreview.rating === "RED" ? "#fef2f2" : cameraPreview.rating === "AMBER" ? "#fffbeb" : "#f0fdf4", color: cameraPreview.rating === "RED" ? "#dc2626" : cameraPreview.rating === "AMBER" ? "#d97706" : "#15803d", border: "1px solid " + (cameraPreview.rating === "RED" ? "#fecaca" : cameraPreview.rating === "AMBER" ? "#fcd34d" : "#86efac") }}>{cameraPreview.rating}</div>
          </div>
          {cameraPreview.suitability && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>{cameraPreview.suitability}</div>}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Type</div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "packaged" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "packaged" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "packaged" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "packaged" ? "#1e3a5f" : "#94a3b8" }}>📦 Packaged</button>
              <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "ingredient" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "ingredient" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "ingredient" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "ingredient" ? "#1e3a5f" : "#94a3b8" }}>🍳 Ingredient Prepared</button>
            </div>
          </div>
          {cameraPreview.itemType === "ingredient" && (<div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>🧾 Ingredients <span style={{ fontWeight: 400 }}>(edit to match your recipe)</span></div>
            <textarea id="review-item-ingredients-overlay" defaultValue={(cameraPreview.ingredients || []).join(", ")} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, minHeight: 50, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} placeholder="e.g. oats, milk, chia seeds, honey..." />
            <div style={{ fontSize: 8, color: "#64748b", marginTop: 3, fontStyle: "italic" }}>Any changes to ingredients or portions will update nutritional values when confirmed</div>
          </div>)}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Add to categories</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["breakfast","lunch","dinner","snack","dessert","drink"].map(function(c) {
                var sel = reviewCategories.indexOf(c) >= 0;
                return (<button key={c} onClick={function() { setReviewCategories(function(prev) { return sel ? prev.filter(function(x){return x!==c;}) : prev.concat([c]); }); }} style={{ padding: "5px 10px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#94a3b8", textTransform: "capitalize" }}>{sel ? "✓ " : ""}{c}</button>);
              })}
            </div>
          </div>
          {reviewCategories.indexOf("dinner") >= 0 && (<div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Is this a dinner side dish?</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[{k:"",label:"No — main dish"},{k:"potato",label:"🥔 Potato side"},{k:"veg",label:"🥦 Veg side"},{k:"salad",label:"🥗 Salad side"}].map(function(st) {
                var sel = reviewSideType === st.k;
                return (<button key={st.k} onClick={function() { setReviewSideType(st.k); }} style={{ padding: "5px 8px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#94a3b8" }}>{st.label}</button>);
              })}
            </div>
          </div>)}
          {formMsg && <div style={{ padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, lineHeight: 1.4, background: formMsg.indexOf("✅") === 0 ? "#dcfce7" : formMsg.indexOf("🔄") === 0 ? "#e0f2fe" : "#fee2e2", color: formMsg.indexOf("✅") === 0 ? "#166534" : formMsg.indexOf("🔄") === 0 ? "#0c4a6e" : "#991b1b" }}>{formMsg}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={reviewCategories.length === 0 || formMsg.indexOf("🔄") === 0} onClick={function() { window._confirmReviewItem(true); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: (reviewCategories.length === 0 || formMsg.indexOf("🔄") === 0) ? 0.5 : 1}}>{formMsg.indexOf("🔄") === 0 ? "Recalculating…" : cameraPreview.recalculated ? "✓ Continue — Add" : "✓ Confirm" + (reviewCategories.length > 1 ? " (" + reviewCategories.length + " lists)" : "")}</button>
            <button onClick={function() { if (cameraPreview.recalculated) { setCameraPreview(function(prev) { return Object.assign({}, prev, { recalculated: false }); }); setFormMsg(""); } else { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); setAddingSlotKey(null); setAddingSlotDay(null); setFormMsg(""); } }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{cameraPreview.recalculated ? "Edit Again" : "Cancel"}</button>
          </div>
          </>)}
        </div>
      </div>)}
  </>);
}
