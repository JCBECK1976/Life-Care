// v2.47.0 (Architect brief 24 Nov, P2): cardio — which exercises count, the effort scale used instead of Range/Form, and
// where Form still makes sense (e.g. rowing).
import { getExerciseType } from "./exercise.js";

var TYPES = ["cardio", "walking", "sports"];
export function isCardioEx(ex) { return TYPES.indexOf((ex && ex.exType) || getExerciseType(ex && ex.name)) >= 0; }
/** Form is still asked where technique matters (rowing, ski or swim machines, paddling). */
export function cardioHasForm(ex) { return isCardioEx(ex) && /\brow|erg\b|ski|swim|kayak|paddl/i.test(String((ex && ex.name) || "")); }
export var EFFORT = [["easy", "Easy"], ["right", "About right"], ["hard", "Very hard"]];
export function effortLabel(v) { var o = EFFORT.find(function(x) { return x[0] === v; }); return o ? o[1] : ""; }
