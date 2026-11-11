// v2.13.0 F10: prompt and parser for reading a body measurement from a photo (pure, no imports, testable).
export function readingPrompt(o) {
  return "This photo shows a body measurement for \"" + o.label + "\" (unit: " + o.unit + "), e.g. a tape measure around the body or a scale/app screen. " +
    (o.desc ? "The person says: \"" + o.desc + "\". " : "") +
    (o.previous != null ? "Their previous " + o.label + " was " + o.previous + " " + o.unit + " (for context only; do NOT copy it). " : "") +
    (o.deep ? "DEEP DIVE: this is an independent second look. Ignore any earlier answer, look closely at the markings or digits, and say exactly where you read the value. " : "") +
    "Read the value in " + o.unit + " (convert from inches if the tape shows inches). If you cannot read it, set value to null and say why. " +
    "Return ONLY JSON: {\"value\":number|null,\"unit\":\"" + o.unit + "\",\"reading\":\"one short sentence on where you read it\",\"confidence\":\"high|medium|low\"}";
}
export function parseReading(text) {
  var m = String(text || "").replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The reading came back in a form I couldn't read — try again");
  var r; try { r = JSON.parse(m[0]); } catch (e) { throw new Error("The reading came back in a form I couldn't read — try again"); }
  var v = r.value == null ? null : parseFloat(r.value);
  return { value: v != null && !isNaN(v) && v > 0 ? Math.round(v * 10) / 10 : null, reading: String(r.reading || "").slice(0, 200), confidence: String(r.confidence || "") };
}

