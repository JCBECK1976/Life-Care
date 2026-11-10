// Lifted verbatim from the legacy single-file index.html (v1.374.2).
// Only changes: these imports replace CDN globals, and `export default`
// replaces the ReactDOM render call (now in main.jsx).
import React from "react";
import firebase, { DATA_ROOT } from "./lib/firebase.js";
import { TONE_RULES, WELLBEING_RULES } from "./constants/tone.js";
import { MOOD_COLORS, MOOD_EMOJIS, MOOD_LABELS } from "./constants/mood.js";
import { COLOUR_THEMES } from "./constants/themes.js";
import { DEFAULT_DATA } from "./constants/defaultData.js";
import { BREAKFASTS, DAY_MAP, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, MEAL_DAYS, POTATO_SIDES, SNACKS, VEG_SIDES } from "./constants/food.js";
import { DEFAULT_EXERCISES, EXERCISE_DATABASE, EXERCISE_TYPES, PIN_WEIGHTS } from "./constants/exercise.js";
import { BLOOD_TESTS, DEFAULT_MEDS, DEFAULT_SUPPS, IDEALS } from "./constants/health.js";
import { btnAction, btnActionLg, btnClear, btnClose, btnDelete, btnEdit, btnMuted, btnP, btnPortion, btnS, btnStop, inputStyle, labelStyle } from "./constants/styles.js";
import { accentVariant, hexToHsl, hslToHex } from "./lib/colour.js";
import { buildExProfileInfo, getJournalWellbeingCtx, getMoodContext } from "./lib/aiContext.js";
import { autoStatus, entrySets, fmtEntry, fmtReps, getExerciseType, getExerciseTypeConfig, logSetsFrom, parseReps, setsToSave } from "./lib/exercise.js";
import { calcWeek, countStatus, fbIcon, fmtDate, getWeekDates, mealKey, sBg, sColor, sLabel } from "./lib/utils.js";
import { sGet, sSet } from "./lib/storage.js";
import { handleApiError } from "./lib/api.js";
import { BodyCard, FullChart } from "./components/charts.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import DataSection from "./sections/Data.jsx";
import SettingsSection from "./sections/Settings.jsx";
import HealthSection from "./sections/Health.jsx";
import ShopSection from "./sections/Shop.jsx";
import BodySection from "./sections/Body.jsx";
import HomeSection from "./sections/Home.jsx";
import ExerciseSection from "./sections/Exercise.jsx";
import EatingSection from "./sections/Eating.jsx";
import ReviewItemOverlay from "./components/ReviewItemOverlay.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import HelpPanel from "./components/HelpPanel.jsx";
import PrivacyPolicy from "./components/PrivacyPolicy.jsx";
import FeedbackForm from "./components/FeedbackForm.jsx";
import { APP_VERSION } from "./constants/version.js";
import EnvBadge from "./components/EnvBadge.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import PersonTabs, { peopleOf, personName } from "./components/PersonTabs.jsx";
import { ALLOW_ADD_PERSON } from "./constants/features.js";

const { useState, useEffect, useCallback, useRef } = React;
function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("jc");
  // v2.5.1: who is selected RIGHT NOW. Person-specific loads finish later; each result checks this
  // and is dropped if another person has been selected meanwhile (no stale cross-person state).
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const [section, setSection] = useState("overview"); // always starts on Home
  const [weekOff, setWeekOff] = useState(function() { var diff = Math.floor((new Date() - new Date(2026, 6, 19)) / (7*24*60*60*1000)); return diff; });
  const [meals, setMeals] = useState({});
  const [mealLoading, setMealLoading] = useState(true);
  const [editDay, setEditDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [showHist, setShowHist] = useState(false);
  const [logEx, setLogEx] = useState(null);
  const [logSets, setLogSets] = useState([{ w: "", r: "" }, { w: "", r: "" }, { w: "", r: "" }]);
  const [logComment, setLogComment] = useState("");
  const [logOverride, setLogOverride] = useState("standard");
  const [logWeek, setLogWeek] = useState("");
  const [logFullRange, setLogFullRange] = useState("working");
  const [logGoodForm, setLogGoodForm] = useState("working");
  const [logNeedChoice, setLogNeedChoice] = useState(""); // D12: inline "Choose Form and Range" prompt
  const [logStatus, setLogStatus] = useState("");
  const [editPrev, setEditPrev] = useState(false);
  const [showMeasForm, setShowMeasForm] = useState(false);
  const [measInputs, setMeasInputs] = useState({ bicep: "", forearm: "", calf: "", quad: "", chest: "", waist: "", shoulders: "", week: "", comment: "" });
  const [showBodyForm, setShowBodyForm] = useState(false);
  const [bodyInputs, setBodyInputs] = useState({ weight: "", bodyFat: "", muscleMass: "", muscleRate: "", skeletalMuscle: "", visceralFat: "", subcutFat: "", bmr: "", bodyWater: "", boneMass: "", bodyAge: "", bmi: "", week: "" });
  const [customMeals, setCustomMeals] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customInputs, setCustomInputs] = useState({ name: "", jcKcal: "", beckKcal: "", jcProt: "", beckProt: "", jcFat: "", beckFat: "", freq: "Weekly", time: "20" });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackResults, setFeedbackResults] = useState({ jc: null, becks: null });
  const [feedbackHistory, setFeedbackHistory] = useState({ jc: [], becks: [] });
  const [showFbHistory, setShowFbHistory] = useState(false);
  const [eatFbLoading, setEatFbLoading] = useState(false);
  const [eatFbResults, setEatFbResults] = useState({});
  const [eatFbExpanded, setEatFbExpanded] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState({ jc: [], becks: [] });
  const [showQaHistory, setShowQaHistory] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpMsg, setHelpMsg] = useState("");
  const [helpHistory, setHelpHistory] = useState({});
  const [showHelpHistory, setShowHelpHistory] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [userColour, setUserColour] = useState(null); // per-user colour key, null = default
  const [showBloodForm, setShowBloodForm] = useState(false);
  const [bloodInputs, setBloodInputs] = useState({ date: "" });
  const [showBloodResults, setShowBloodResults] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileInputs, setProfileInputs] = useState({});
  const [healthComment, setHealthComment] = useState("");
  const [healthView, setHealthView] = useState("general");
  const [vitalsInput, setVitalsInput] = useState({ date: "", time: "", systolic: "", diastolic: "", hr: "", spo2: "" });
  const [healthFb, setHealthFb] = useState(null);
  const [healthFbAll, setHealthFbAll] = useState({});
  const [healthFbLoading, setHealthFbLoading] = useState(false);
  const [showMedForm, setShowMedForm] = useState(false);
  const [editMedIdx, setEditMedIdx] = useState(null);
  const [medInputs, setMedInputs] = useState({ name: "", type: "medication", dosage: "", timing: "", frequency: "Daily", notes: "" });
  const [customMedNames, setCustomMedNames] = useState([]);
  const [customBloodTests, setCustomBloodTests] = useState([]);
  const [showAddBloodTest, setShowAddBloodTest] = useState(false);
  const [newBloodTest, setNewBloodTest] = useState({ key: "", name: "", unit: "", lo: "", hi: "" });
  const [customExercises, setCustomExercises] = useState([]);
  const [customSnacks, setCustomSnacks] = useState([]);
  const [customDrinks, setCustomDrinks] = useState([]);
  const [customDesserts, setCustomDesserts] = useState([]);
  const [offSearchTerm, setOffSearchTerm] = useState("");
  const [offResults, setOffResults] = useState([]);
  const [offLoading, setOffLoading] = useState(false);
  const [showNewExForm, setShowNewExForm] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [exNotesLoading, setExNotesLoading] = useState(false);
  const [exNotes, setExNotes] = useState(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [generatedTargets, setGeneratedTargets] = useState(null);
  const [supermarket, setSupermarket] = useState("Aldi");
  const [shopLoading, setShopLoading] = useState(false);
  const [generatedShop, setGeneratedShop] = useState(null);
  const [shopDefaults, setShopDefaults] = useState([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [setupDirty, setSetupDirty] = useState(false);
  const [setupTab, setSetupTab] = useState("profile");
  function calcAge(dob) { if (!dob) return null; var d = new Date(dob); if (isNaN(d.getTime())) return null; var t = new Date(); var a = t.getFullYear() - d.getFullYear(); var m = t.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--; return a; }
  const [onboardInputs, setOnboardInputs] = useState({ conditions: "", medications: "", neurodiversity: "", bloods: "", goals: "", activity: "", equipment: "", dietary: "", allergies: "" });
  const [genPlanLoading, setGenPlanLoading] = useState(false);
  const [genMealsLoading, setGenMealsLoading] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState(null);
  const [sessionFbLoading, setSessionFbLoading] = useState(false);
  const [sessionGuideLoading, setSessionGuideLoading] = useState(false);
  const [warmUpOpen, setWarmUpOpen] = useState(false);
  const [coolDownOpen, setCoolDownOpen] = useState(false);
  const [decisionsExpanded, setDecisionsExpanded] = useState({});
  const [exView, setExView] = useState("exercises");
  const [dayView, setDayView] = useState({});
  const [exerciseDay, setExerciseDay] = useState(function() { var ds = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; return ds[new Date().getDay()]; });
  const [selectedEx, setSelectedEx] = useState(null);
  const [exInfoOpen, setExInfoOpen] = useState(false);
  const [fbExpanded, setFbExpanded] = useState(false);
  const [stoppedExOpen, setStoppedExOpen] = useState(false);
  const [homeFbExpanded, setHomeFbExpanded] = useState(false);
  const [healthFbExpanded, setHealthFbExpanded] = useState(false);
  const [manageListsOpen, setManageListsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [addExOpen, setAddExOpen] = useState(false);
  const [addExLoading, setAddExLoading] = useState(false);
  const [addExSearch, setAddExSearch] = useState("");
  const [addExConfirm, setAddExConfirm] = useState(null); // {name, type, sets, m1, m2, progression, notes, isCustom}
  const [foodCheckerPreview, setFoodCheckerPreview] = useState(null);
  const [foodCheckerLoading, setFoodCheckerLoading] = useState(false);
  const [foodCheckerCategory, setFoodCheckerCategory] = useState("");
  const [foodCheckerText, setFoodCheckerText] = useState("");
  const [userMood, setUserMood] = useState(null);
  const [companionEnergy, setCompanionEnergy] = useState(null);
  window._setCompanionEnergy = function(e) { window._companionEnergyPct = e ? e.pct : 100; window._companionEnergyStatus = e ? (e.keyStatus || "active") : "active"; setCompanionEnergy(e); };
  const [energyLoading, setEnergyLoading] = useState(false);
  const [showMyDay, setShowMyDay] = useState(true);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalText, setJournalText] = useState("");
  const [dailyMood, setDailyMood] = useState(null); // {date, mood} — uncommitted mood face
  const [showRecentJournal, setShowRecentJournal] = useState(false);
  const [showFullJournal, setShowFullJournal] = useState(false);
  const [wellbeingFlags, setWellbeingFlags] = useState({});
  const [helpEatCat, setHelpEatCat] = useState("");
  const [helpEatText, setHelpEatText] = useState("");
  const [helpEatLoading, setHelpEatLoading] = useState(false);
  const [helpEatResult, setHelpEatResult] = useState(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);
  const [copyDayTargets, setCopyDayTargets] = useState({});
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekTargets, setCopyWeekTargets] = useState({});
  const [mealTracking, setMealTracking] = useState({});
  const [portionSlot, setPortionSlot] = useState("");
  const [portionLoading, setPortionLoading] = useState(false);
  const [portionResult, setPortionResult] = useState(null);
  const [portionPlanned, setPortionPlanned] = useState(null);
  const [portionOverrides, setPortionOverrides] = useState({});
  const [eatDayEyeOpen, setEatDayEyeOpen] = useState(false);
  const [eatDayChartOpen, setEatDayChartOpen] = useState(false);
  const [eatWeekEyeOpen, setEatWeekEyeOpen] = useState(false);
  const [dataExpandEx, setDataExpandEx] = useState(null);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [reviewCategories, setReviewCategories] = useState([]);
  const [reviewSideType, setReviewSideType] = useState("");
  const [bulkReviewItems, setBulkReviewItems] = useState(null);
  const [bodyView, setBodyView] = useState("data");
  const [measView, setMeasView] = useState("data");
  const [eatDay, setEatDay] = useState(function() { var ds = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; return ds[new Date().getDay()]; });
  const eatWeekResetRef = React.useRef(weekOff);
  React.useEffect(function() { if (eatWeekResetRef.current !== weekOff) { setEatDay("week"); eatWeekResetRef.current = weekOff; } }, [weekOff]);
  const [quickPrepMins, setQuickPrepMins] = useState(20);
  const [showDefaults, setShowDefaults] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [addingSource, setAddingSource] = useState("defaults");
  const [addingSlotKey, setAddingSlotKey] = useState(null);
  const [addingSlotDay, setAddingSlotDay] = useState(null);
  /* ── RAG calculator (NHS traffic light thresholds per 100g) ── */
  const calcRAG = function(n) {
    var score = 0;
    var sf = n.satFat || 0; var su = n.sugar || 0; var sa = n.salt || 0;
    var pr = n.protein || 0; var fi = n.fibre || 0;
    if (sf > 5) score += 2; else if (sf > 1.5) score += 1;
    if (su > 22.5) score += 2; else if (su > 5) score += 1;
    if (sa > 1.5) score += 2; else if (sa > 0.3) score += 1;
    if (pr > 10) score -= 1;
    if (fi > 3) score -= 1;
    return score >= 3 ? "RED" : score >= 1 ? "AMBER" : "GREAT";
  };

  /* ── Open Food Facts search (debounced) ── */
  const offSearchTimeout = React.useRef(null);
  const searchOFF = function(term) {
    setOffSearchTerm(term);
    if (offSearchTimeout.current) clearTimeout(offSearchTimeout.current);
    if (!term || term.length < 2) { setOffResults([]); return; }
    offSearchTimeout.current = setTimeout(async function() {
      setOffLoading(true);
      try {
        var url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(term) + "&search_simple=1&action=process&json=1&page_size=8&fields=product_name,code,nutriments,ingredients_text,serving_size,categories_tags_en,image_front_small_url,brands&countries_tags_en=united-kingdom";
        var resp = await fetch(url);
        var data = await resp.json();
        var products = (data.products || []).filter(function(p) { return p.product_name && p.nutriments; }).map(function(p) {
          var nm = p.nutriments || {};
          return {
            name: p.product_name + (p.brands ? " (" + p.brands.split(",")[0].trim() + ")" : ""),
            barcode: p.code || "",
            kcal: Math.round(nm["energy-kcal_100g"] || nm["energy-kcal_serving"] || 0),
            protein: Math.round((nm.proteins_100g || nm.proteins_serving || 0) * 10) / 10,
            fat: Math.round((nm.fat_100g || nm.fat_serving || 0) * 10) / 10,
            satFat: Math.round((nm["saturated-fat_100g"] || nm["saturated-fat_serving"] || 0) * 10) / 10,
            carbs: Math.round((nm.carbohydrates_100g || nm.carbohydrates_serving || 0) * 10) / 10,
            sugar: Math.round((nm.sugars_100g || nm.sugars_serving || 0) * 10) / 10,
            fibre: Math.round((nm.fiber_100g || nm.fiber_serving || 0) * 10) / 10,
            salt: Math.round((nm.salt_100g || nm.salt_serving || 0) * 10) / 10,
            ingredients: p.ingredients_text || "",
            servingSize: p.serving_size || "per 100g",
            categories: (p.categories_tags_en || []).slice(0, 5),
            image: p.image_front_small_url || ""
          };
        });
        setOffResults(products);
      } catch(e) { setOffResults([]); }
      setOffLoading(false);
    }, 400);
  };

  const openAddForm = function(cat, source, prefillText, slotKey, slotDay) { var scrollY = window.scrollY; setAddingNew(true); setAddingCategory(cat); setAddingSource(source || "defaults"); setAddingSlotKey(slotKey || null); setAddingSlotDay(slotDay || null); if (prefillText) { setNewItemName(prefillText); searchOFF(prefillText); } if(source === "manage"){ setTimeout(function(){var el=document.getElementById("add-item-form-manage");if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},150); } else { requestAnimationFrame(function(){ window.scrollTo(0, scrollY); }); } };
  const [addingCategory, setAddingCategory] = useState("other");
  const [newItemName, setNewItemName] = useState("");
  const [newItemLoading, setNewItemLoading] = useState(false);
  const [customMeasTypes, setCustomMeasTypes] = useState([]);
  const [bodyFbLoading, setBodyFbLoading] = useState(false);
  const [bodyFeedback, setBodyFeedback] = useState(null);
  const [bodyFbAll, setBodyFbAll] = useState({});
  const [measFbLoading, setMeasFbLoading] = useState(false);
  const [measFeedback, setMeasFeedback] = useState(null);
  const [measFbAll, setMeasFbAll] = useState({});
  const [bodyFbExpanded, setBodyFbExpanded] = useState(false);
  const [measFbExpanded2, setMeasFbExpanded2] = useState(false);
  const [bodyMetricOpen, setBodyMetricOpen] = useState(null);
  const [bodyMetricShowAll, setBodyMetricShowAll] = useState(false);
  const [measMetricOpen, setMeasMetricOpen] = useState(null);
  const [measMetricShowAll, setMeasMetricShowAll] = useState(false);
  const [measLogKey, setMeasLogKey] = useState(null);
  const [measLogInputs, setMeasLogInputs] = useState({ week: "", value: "", note: "" });
  const [addMeasOpen, setAddMeasOpen] = useState(false);
  const [addMeasName, setAddMeasName] = useState("");
  const [editMeasKey, setEditMeasKey] = useState(null);
  const [editMeasName, setEditMeasName] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [assessmentExpanded, setAssessmentExpanded] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [ragRecalcLoading, setRagRecalcLoading] = useState(false);
  const [ragRecalcMsg, setRagRecalcMsg] = useState("");
  const [healthDataHash, setHealthDataHash] = useState("");

  // Build person health context for dynamic RAG evaluation
  var buildPersonHealthCtx = function(personData) {
    if (!personData) return "";
    var prof = personData.profile || {};
    var parts = [];
    parts.push((prof.name || "User") + ", " + (prof.sex || "") + ", age " + (calcAge(prof.dob) || prof.age || "unknown"));
    parts.push("Height: " + (prof.height || "unknown") + ", Body type: " + (prof.bodyType || "unknown"));
    if (prof.notes) parts.push("Notes: " + prof.notes);
    // Calorie/macro targets
    if (prof.dailyKcal || prof.kcalTarget) parts.push("Kcal target: " + (prof.dailyKcal || prof.kcalTarget));
    // Blood results
    if (personData.bloods && personData.bloods.length > 0) {
      var latest = personData.bloods[personData.bloods.length - 1];
      parts.push("Latest bloods (" + latest.date + "): " + Object.entries(latest.tests).map(function(e) { return e[0] + "=" + e[1]; }).join(", "));
    }
    // Medications
    if (personData.meds && personData.meds.length > 0) {
      parts.push("Medications: " + personData.meds.filter(function(m) { return m.active; }).map(function(m) { return m.name + " " + (m.dosage || "") + " (" + (m.timing || "") + ")"; }).join(", "));
    }
    // Health profile
    if (personData.healthProfile) parts.push("Health profile: " + personData.healthProfile);
    // Health log recent
    if (Array.isArray(personData.healthLog) && personData.healthLog.length > 0) {
      parts.push("Recent health: " + personData.healthLog.slice(-3).map(function(h) { return h.date + ": " + h.note; }).join("; "));
    }
    // Body data — latest weight, body fat
    if (personData.body) {
      if (personData.body.weight && personData.body.weight.length > 0) {
        var lw = personData.body.weight[personData.body.weight.length - 1];
        parts.push("Current weight: " + lw.v + "kg");
      }
      if (personData.body.bodyFat && personData.body.bodyFat.length > 0) {
        var lbf = personData.body.bodyFat[personData.body.bodyFat.length - 1];
        parts.push("Body fat: " + lbf.v + "%");
      }
    }
    // Exercise data summary
    if (personData.exercises && personData.exercises.length > 0) {
      parts.push("Exercise: " + personData.exercises.length + " exercises programmed, training " + (personData.exercises.filter(function(e2) { return e2.session; }).length > 0 ? "active" : "not yet started"));
    }
    // Vitals
    if (personData.vitals && personData.vitals.length > 0) {
      var lv = personData.vitals[personData.vitals.length - 1];
      parts.push("Vitals(" + lv.date + "): " + (lv.bp ? "BP:" + lv.bp : "") + (lv.hr ? " HR:" + lv.hr : ""));
    }
    return parts.join(". ") + ".";
  };

  // Hash health-relevant data to detect changes
  var computeHealthHash = function(personData) {
    if (!personData) return "";
    var parts = [];
    if (personData.bloods) parts.push(JSON.stringify(personData.bloods));
    if (personData.meds) parts.push(JSON.stringify(personData.meds.filter(function(m) { return m.active; })));
    if (personData.healthProfile) parts.push(personData.healthProfile);
    if (personData.body && personData.body.weight && personData.body.weight.length > 0) parts.push(String(personData.body.weight[personData.body.weight.length - 1].v));
    if (personData.body && personData.body.bodyFat && personData.body.bodyFat.length > 0) parts.push(String(personData.body.bodyFat[personData.body.bodyFat.length - 1].v));
    // Simple string hash
    var str = parts.join("|");
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return String(hash);
  };

  // Dynamic RAG recalculation — batch evaluate items against guidelines + health profile
  var recalculateRagForList = async function(items, category, personCtx, personKey) {
    if (!items || items.length === 0) return { updated: [], changes: 0 };
    // Build item list for AI evaluation
    var itemList = items.map(function(it) {
      return it.id + ":" + it.name + " [current:" + (it.rating || "GREAT") + "] (kcal:" + (it.jcKcal || it.kcal || 0) + ",prot:" + (it.protein || it.jcProt || 0) + "g,fat:" + (it.fat || it.jcFat || 0) + "g,satFat:" + (it.satFat || 0) + "g,carbs:" + (it.carbs || 0) + "g,fibre:" + (it.fibre || 0) + "g,salt:" + (it.salt || 0) + "g)";
    }).join("; ");
    var prompt = "You are a clinical dietitian evaluating food items for a RAG (Red/Amber/Green) traffic light system.\n\n" +
      "PATIENT PROFILE: " + personCtx + "\n\n" +
      "EVALUATION FRAMEWORK — use recognised dietary guidelines (NHS Eatwell, BDA, NICE, WHO) as baseline, then personalise based on the patient's specific conditions:\n" +
      "- GREEN/GREAT: Safe for daily consumption given this person's health profile. Meets nutritional guidelines. Low risk.\n" +
      "- AMBER: Limit to once per week. Moderate concerns for this person — could be sat fat, sugar, sodium, calorie density, or specific contraindication with their conditions/medications.\n" +
      "- RED: Limit to once per month. Significant concerns — high sat fat (especially critical if high cholesterol/FH), very high calories, high sodium with hypertension, high sugar with prediabetes/diabetes, or direct conflict with medications.\n\n" +
      "CONDITION-SPECIFIC ADJUSTMENTS:\n" +
      "- High cholesterol/FH: Stricter sat fat limits (<6g per meal ideal), penalise high-cholesterol foods more heavily\n" +
      "- Prediabetes/HbA1c elevated: Penalise high GI, high added sugar items more heavily\n" +
      "- Thyroid issues: Consider iodine, goitrogen content where relevant\n" +
      "- Statin use: Note grapefruit interaction, liver-loading foods\n" +
      "- Perimenopausal: Consider calcium, vitamin D, phytoestrogen value\n" +
      "- Kidney function (low eGFR): Consider protein load, potassium, phosphorus\n\n" +
      "CATEGORY: " + category + "\n" +
      "ITEMS TO EVALUATE:\n" + itemList + "\n\n" +
      "Return ONLY a JSON array of objects: [{\"id\":\"item_id\",\"rating\":\"GREAT or AMBER or RED\",\"reason\":\"one-line clinical rationale\"}]\n" +
      "Evaluate EVERY item. Use the patient's specific health data to adjust ratings from baseline guidelines. Be evidence-based.";
    try {
      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }) });
      var result = await resp.json();
      var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
      var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
      var jsonStr = txt.replace(/```json|```/g, "").trim();
      var jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      var ratings = JSON.parse(jsonMatch[0]);
      // Apply ratings to items
      var changes = 0;
      var updated = items.map(function(it) {
        var match = ratings.find(function(r) { return r.id === it.id; });
        if (match && match.rating && match.rating !== it.rating) {
          changes++;
          return Object.assign({}, it, { prevRating: it.rating, rating: match.rating, ragReason: match.reason || "", _ragChanged: true, _ragChangedSeen: false });
        }
        return it;
      });
      return { updated: updated, changes: changes };
    } catch(e) {
      console.error("RAG recalc error for " + category + ":", e);
      return { updated: items, changes: 0 };
    }
  };

  // Google Health Connect - OAuth + Fitness API
  const GOOGLE_CLIENT_ID = "464885753789-a8flgh64f1u9qeocktt6uljvjvsd0sf2.apps.googleusercontent.com";
  const GOOGLE_SCOPES = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly";

  const connectGoogle = function() {
    var clientId = "";
    sGet("google_client_id").then(function(id) {
      clientId = id || GOOGLE_CLIENT_ID;
      if (!clientId) { setFormMsg("Set Google Client ID in Admin first"); setTimeout(function() { setFormMsg(""); }, 3000); return; }
      var client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: function(response) {
          if (response.access_token) {
            setGoogleToken(response.access_token);
            setGoogleConnected(true);
            sSet("google_token_" + activeTab, response.access_token);
            setFormMsg("✓ Google Health connected"); setTimeout(function() { setFormMsg(""); }, 3000);
          }
        }
      });
      client.requestAccessToken();
    });
  };

  const syncGoogleHealth = async function() {
    var token = googleToken;
    if (!token) { try { token = await sGet("google_token_" + activeTab); } catch(e) {} }
    if (!token) { setFormMsg("Connect Google Health first"); setTimeout(function() { setFormMsg(""); }, 3000); return; }
    setSyncLoading(true); setFormMsg("Syncing health data...");
    var nd = JSON.parse(JSON.stringify(data));
    var now = Date.now();
    var thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    var headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

    try {
      // Fetch body weight
      var weightResp = await fetch("https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints?pageSize=30&filter=weight.update_time.physical_time%20%3E%3D%20%222026-07-01T00:00:00Z%22", {
        method: "GET", headers: headers
      });
      var weightData = await weightResp.json();
      if (weightData.dataPoint) {
        for (var bi = 0; bi < weightData.dataPoint.length; bi++) {
          var pt = weightData.dataPoint[bi];
          var kg = pt.value && pt.value.floatValue ? pt.value.floatValue : (pt.value && pt.value.intValue ? pt.value.intValue : 0);
          if (!kg && pt.value) { for (var vk in pt.value) { if (typeof pt.value[vk] === "number" && pt.value[vk] > 20) { kg = pt.value[vk]; break; } } }
          if (kg > 0) {
            var stone = (kg * 0.157473).toFixed(2);
            var dt = pt.startTime ? new Date(pt.startTime) : new Date();
            var existing = (nd[activeTab].body.weight || []).find(function(w) { return w.v === parseFloat(stone); });
            if (!existing) { nd[activeTab].body.weight.push({ wk: nd.config.week || 8, v: parseFloat(stone), date: dt.toLocaleDateString("en-GB"), source: "Google" }); }
          }
        }
      }

      // Fetch body fat
      var fatResp = await fetch("https://health.googleapis.com/v4/users/me/dataTypes/body-fat/dataPoints?pageSize=30", {
        method: "GET", headers: headers
      });
      var fatData = await fatResp.json();
      if (fatData.dataPoint) {
        for (var fi = 0; fi < fatData.dataPoint.length; fi++) {
          var fp = fatData.dataPoint[fi];
          var fatPct = fp.value && fp.value.floatValue ? fp.value.floatValue : 0;
          if (!fatPct && fp.value) { for (var fk in fp.value) { if (typeof fp.value[fk] === "number" && fp.value[fk] > 0 && fp.value[fk] < 100) { fatPct = fp.value[fk]; break; } } }
          if (fatPct > 0) {
            var existing2 = (nd[activeTab].body.bodyFat || []).find(function(f) { return f.v === parseFloat(fatPct.toFixed(1)); });
            if (!existing2) { nd[activeTab].body.bodyFat.push({ wk: nd.config.week || 8, v: parseFloat(fatPct.toFixed(1)), source: "Google" }); }
          }
        }
      }

      // Fetch steps (last 7 days)
      var sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      var stepsResp = await fetch("https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints?pageSize=7", {
        method: "GET", headers: headers
      });
      var stepsData = await stepsResp.json();
      if (!nd[activeTab].activity) nd[activeTab].activity = [];
      if (stepsData.dataPoint) {
        for (var si = 0; si < stepsData.dataPoint.length; si++) {
          var sp = stepsData.dataPoint[si];
          var steps = sp.value && sp.value.intValue ? sp.value.intValue : 0;
          if (!steps && sp.value) { for (var sk in sp.value) { if (typeof sp.value[sk] === "number") { steps = sp.value[sk]; break; } } }
          var dayDate = sp.startTime ? new Date(sp.startTime).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
          if (steps > 0) {
            var existingAct = nd[activeTab].activity.find(function(a) { return a.date === dayDate; });
            if (existingAct) { existingAct.steps = steps; existingAct.source = "Google"; }
            else { nd[activeTab].activity.push({ date: dayDate, steps: steps, type: "daily", source: "Google" }); }
          }
        }
      }

      // Fetch exercise sessions
      var sessResp = await fetch("https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints?pageSize=10", {
        method: "GET", headers: headers
      });
      var sessData = await sessResp.json();
      if (sessData.dataPoint) {
        for (var sei = 0; sei < sessData.dataPoint.length; sei++) {
          var sess = sessData.dataPoint[sei];
          var sessDate = sess.startTime ? new Date(sess.startTime).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
          var durMin = (sess.startTime && sess.endTime) ? Math.round((new Date(sess.endTime) - new Date(sess.startTime)) / 60000) : 0;
          var actName = (sess.value && sess.value.stringValue) || "Exercise";
          var existingSess = nd[activeTab].activity.find(function(a) { return a.date === sessDate && a.activity === actName; });
          if (!existingSess) {
            nd[activeTab].activity.push({ date: sessDate, activity: actName, duration: durMin, type: "session", source: "Google" });
          }
        }
      }

      if (nd[activeTab].activity.length > 90) nd[activeTab].activity = nd[activeTab].activity.slice(-90);
      await saveData(nd);
      setFormMsg("✓ Synced — weight, body fat, steps, and activities updated");
    } catch(err) {
      if (String(err).indexOf("401") >= 0 || String(err).indexOf("403") >= 0) {
        setGoogleConnected(false); setGoogleToken(null);
        setFormMsg("Google session expired — reconnect in profile");
      } else {
        setFormMsg("Sync error: " + String(err).substring(0, 100));
      }
    }
    setTimeout(function() { setFormMsg(""); }, 5000);
    setSyncLoading(false);
  };
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editExercise, setEditExercise] = useState(null);
  const [showAddSnack, setShowAddSnack] = useState(false);
  const [newSnackInputs, setNewSnackInputs] = useState({ name: "", kcal: "", rating: "GREAT", freq: "Weekly" });
  const [customBreakfasts, setCustomBreakfasts] = useState([]);
  const [customLunches, setCustomLunches] = useState([]);
  const [showAddMealType, setShowAddMealType] = useState(null);
  const [newMealTypeInputs, setNewMealTypeInputs] = useState({ name: "", jcKcal: "", beckKcal: "", rating: "GREAT" });
  const [mealDefaults, setMealDefaults] = useState({ jc: {}, becks: {} });
  const [defScopes, setDefScopes] = useState({});
  const [generating, setGenerating] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const fileRef = useRef(null);
  const logFormRef = useRef(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [imgParsing, setImgParsing] = useState(false);

  // Scroll to log form when opened
  useEffect(() => { if (logEx && logFormRef.current) logFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [logEx]);
  // Scroll back to exercise after save
  useEffect(() => {
    if (scrollTarget) {
      const el = document.getElementById(scrollTarget);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollTarget(null);
    }
  }, [scrollTarget]);

  // Load dashboard data
  useEffect(() => {
    (async () => {
      const raw = await sGet("dashboard:data");
      if (raw) {
        const d = JSON.parse(raw);
        // Migrate: ensure fullBody measurement exists for all users
        var migrated = false;
        Object.keys(d).forEach(function(uk) { if (uk !== "config" && d[uk].measurements && !d[uk].measurements.fullBody) { d[uk].measurements = Object.assign({ fullBody: [] }, d[uk].measurements); migrated = true; } });
        if (migrated) await sSet("dashboard:data", JSON.stringify(d));
        setData(d);
      } else {
        setData(DEFAULT_DATA);
        await sSet("dashboard:data", JSON.stringify(DEFAULT_DATA));
      }
      setLoading(false);
    })();
  }, []);

  // Load custom meals
  useEffect(() => { (async () => { const r = await sGet("custom_meals"); if (r) setCustomMeals(JSON.parse(r)); })(); }, []);

  // Load saved feedback + history
  useEffect(() => { (async () => {
    const who = activeTab; const stillSelected = () => activeTabRef.current === who; // v2.5.1
    const r = await sGet("feedback_results"); if (r) setFeedbackResults(JSON.parse(r));
    const bfAll = await sGet("body_feedback"); if (bfAll) { var bfObj = JSON.parse(bfAll); setBodyFbAll(bfObj); setBodyFeedback(bfObj[activeTabRef.current] || null); }
    const hfAll = await sGet("health_feedback"); if (hfAll) { var hfObj = JSON.parse(hfAll); setHealthFbAll(hfObj); setHealthFb(hfObj[activeTabRef.current] || null); }
    const mfAll = await sGet("meas_feedback"); if (mfAll) { var mfObj = JSON.parse(mfAll); setMeasFbAll(mfObj); setMeasFeedback(mfObj[activeTabRef.current] || null); }
    const h = await sGet("feedback_history"); if (h) setFeedbackHistory(JSON.parse(h));
    const efb = await sGet("eat_feedback"); if (efb) setEatFbResults(JSON.parse(efb));
    const ce = await sGet("custom_exercises"); if (ce) setCustomExercises(JSON.parse(ce));
    const cs = await sGet("custom_snacks"); if (cs) setCustomSnacks(JSON.parse(cs));
    const cdr = await sGet("custom_drinks"); if (cdr) setCustomDrinks(JSON.parse(cdr));
    const cde = await sGet("custom_desserts"); if (cde) setCustomDesserts(JSON.parse(cde));
    const mt = await sGet("meal_tracking:" + activeTab); if (mt && stillSelected()) setMealTracking(JSON.parse(mt));
    const po = await sGet("portion_overrides:" + activeTab); if (po && stillSelected()) setPortionOverrides(JSON.parse(po));
    const cb = await sGet("custom_breakfasts"); if (cb) setCustomBreakfasts(JSON.parse(cb));
    const cl = await sGet("custom_lunches"); if (cl) setCustomLunches(JSON.parse(cl));
    const md = await sGet("meal_defaults"); if (md) setMealDefaults(JSON.parse(md));
    const cmn = await sGet("custom_med_names"); if (cmn) setCustomMedNames(JSON.parse(cmn));
    const cbt = await sGet("custom_blood_tests"); if (cbt) setCustomBloodTests(JSON.parse(cbt));
    const sm = await sGet("supermarket_pref"); if (sm) setSupermarket(sm);
    const sd = await sGet("shop_defaults"); if (sd) setShopDefaults(JSON.parse(sd));
    const cmt = await sGet("custom_meas_types"); if (cmt) setCustomMeasTypes(JSON.parse(cmt));
    
    // Load saved session feedback
    var sfAll = await sGet("session_feedback_all"); if (sfAll) { setSessionFeedback(JSON.parse(sfAll)); }
const ak = await sGet("anthropic_api_key"); if (ak) window._anthropicKey = ak;
    const gt = await sGet("google_token_" + activeTab); if (gt && stillSelected()) { setGoogleToken(gt); setGoogleConnected(true); }
    const qa = await sGet("qa_history"); if (qa) setQaHistory(JSON.parse(qa));
    const hh = await sGet("help_history"); if (hh) setHelpHistory(JSON.parse(hh));
    const savedMood = await sGet("user_mood_" + activeTab); if (savedMood && stillSelected()) setUserMood(JSON.parse(savedMood));
    const savedJournal = await sGet("journal_" + activeTab); if (savedJournal && stillSelected()) setJournalEntries(JSON.parse(savedJournal));
    const savedDailyMood = await sGet("daily_mood_" + activeTab); if (savedDailyMood && stillSelected()) { var dm = JSON.parse(savedDailyMood); var todayStr = new Date().toISOString().split("T")[0]; if (dm && dm.date === todayStr) setDailyMood(dm); else setDailyMood(null); }
    const savedColour = await sGet("user_colour_" + activeTab); if (stillSelected()) { if (savedColour) setUserColour(savedColour); else setUserColour(null); }
    const savedWbFlags = await sGet("wellbeing_flags_" + activeTab); if (savedWbFlags && stillSelected()) setWellbeingFlags(JSON.parse(savedWbFlags));
    const cen = await sGet("companion_energy"); if (cen) setCompanionEnergy(JSON.parse(cen));
  })(); }, []);

  // Check for health data changes and prompt RAG recalculation
  useEffect(function() {
    if (!data || !data[activeTab]) return;
    var newHash = computeHealthHash(data[activeTab]);
    if (newHash && healthDataHash && newHash !== healthDataHash) {
      // Health data has changed — check if RAG recalc needed
      var hasCustomItems = customBreakfasts.length > 0 || customLunches.length > 0 || customMeals.length > 0 || customSnacks.length > 0 || customDrinks.length > 0 || customDesserts.length > 0;
      if (hasCustomItems) {
        setRagRecalcMsg("Health data updated — dietary ratings may need recalculating");
      }
    }
    if (newHash) setHealthDataHash(newHash);
  }, [data, activeTab]);

  // Full RAG recalculation across all custom lists
  var recalculateAllRag = async function() {
    if (!data || !data[activeTab]) return;
    setRagRecalcLoading(true);
    setRagRecalcMsg("Recalculating dietary ratings...");
    try {
      var personData = data[activeTab];
      var personCtx = buildPersonHealthCtx(personData);
      var isJC = activeTab === "jc";
      // Add known targets from project context
      if (isJC) { personCtx += " Targets: 2000-2200 kcal/day, 110-130g protein, under 20g sat fat, under 25g added sugar, 30-35g fibre. TSH 14.2 (poorly controlled), LDL 3.4, HbA1c 43 (prediabetic range), Cholesterol Ratio 6.3. Levothyroxine 200mcg, Statin 20mg."; }
      else { personCtx += " Targets: 1700-1900 kcal/day, 90-110g protein, under 20g sat fat (critical), under 25g added sugar, 25-30g fibre. Suspected FH. Total Cholesterol 9.6, LDL 7.2, Triglycerides 2.62, HDL 1.2, Ratio 8.0, Non-HDL 8.4. HbA1c 40, eGFR 67. Perimenopausal. Citalopram. Atorvastatin. Portfolio Diet framework."; }
      var totalChanges = 0;
      // Recalculate each category
      if (customBreakfasts.length > 0) {
        setRagRecalcMsg("Evaluating breakfasts (" + customBreakfasts.length + " items)...");
        var bfResult = await recalculateRagForList(customBreakfasts, "breakfast", personCtx, activeTab);
        if (bfResult.changes > 0) { setCustomBreakfasts(bfResult.updated); await sSet("custom_breakfasts", JSON.stringify(bfResult.updated)); totalChanges += bfResult.changes; }
      }
      if (customLunches.length > 0) {
        setRagRecalcMsg("Evaluating lunches (" + customLunches.length + " items)...");
        var luResult = await recalculateRagForList(customLunches, "lunch", personCtx, activeTab);
        if (luResult.changes > 0) { setCustomLunches(luResult.updated); await sSet("custom_lunches", JSON.stringify(luResult.updated)); totalChanges += luResult.changes; }
      }
      if (customMeals.length > 0) {
        setRagRecalcMsg("Evaluating dinners (" + customMeals.length + " items)...");
        var dinResult = await recalculateRagForList(customMeals, "dinner", personCtx, activeTab);
        if (dinResult.changes > 0) { setCustomMeals(dinResult.updated); await sSet("custom_meals", JSON.stringify(dinResult.updated)); totalChanges += dinResult.changes; }
      }
      if (customSnacks.length > 0) {
        setRagRecalcMsg("Evaluating snacks (" + customSnacks.length + " items)...");
        var snResult = await recalculateRagForList(customSnacks, "snack", personCtx, activeTab);
        if (snResult.changes > 0) { setCustomSnacks(snResult.updated); await sSet("custom_snacks", JSON.stringify(snResult.updated)); totalChanges += snResult.changes; }
      }
      if (customDrinks.length > 0) {
        setRagRecalcMsg("Evaluating drinks (" + customDrinks.length + " items)...");
        var drResult = await recalculateRagForList(customDrinks, "drink", personCtx, activeTab);
        if (drResult.changes > 0) { setCustomDrinks(drResult.updated); await sSet("custom_drinks", JSON.stringify(drResult.updated)); totalChanges += drResult.changes; }
      }
      if (customDesserts.length > 0) {
        setRagRecalcMsg("Evaluating desserts (" + customDesserts.length + " items)...");
        var deResult = await recalculateRagForList(customDesserts, "dessert", personCtx, activeTab);
        if (deResult.changes > 0) { setCustomDesserts(deResult.updated); await sSet("custom_desserts", JSON.stringify(deResult.updated)); totalChanges += deResult.changes; }
      }
      // Save health hash so we don't re-prompt
      setHealthDataHash(computeHealthHash(personData));
      await sSet("rag_health_hash_" + activeTab, computeHealthHash(personData));
      if (totalChanges > 0) {
        setRagRecalcMsg("✅ " + totalChanges + " item" + (totalChanges !== 1 ? "s" : "") + " updated based on your health profile");
      } else {
        setRagRecalcMsg("✅ All ratings confirmed — no changes needed");
      }
      setTimeout(function() { setRagRecalcMsg(""); }, 5000);
    } catch(e) {
      setRagRecalcMsg("Error: " + String(e).substring(0, 100));
      setTimeout(function() { setRagRecalcMsg(""); }, 6000);
    }
    setRagRecalcLoading(false);
  };

  // Load saved health hash on startup
  useEffect(function() {
    (async function() {
      var savedHash = await sGet("rag_health_hash_" + activeTab);
      if (savedHash) setHealthDataHash(savedHash);
    })();
  }, [activeTab]);

  // Meal data
  const baseStart = new Date(2026, 6, 19); // Training start - Sun-Sat weeks
  const weekStart = new Date(baseStart); weekStart.setDate(weekStart.getDate() + (weekOff * 7));
  const weekDates = getWeekDates(weekStart);
  const sk = mealKey(weekStart) + ":" + activeTab;
  const weekLabel = fmtDate(weekDates[0]) + " – " + fmtDate(weekDates[6]);
  const FIRST_KEY = "mealplan:2026-08-23";
  const FIRST_DEF = { sun: "spag_bol", mon: "sweet_chilli_mash", tue: "chicken_risotto", wed: "fish_chips", thu: "pesto_pasta", _notes: { wed: "JC at parents — Fish & Chips for Beck + boys", thu: "JC: work lunch + McFlurry with Evan. Session 3 moved to Thu." } };

  const [pastWeeksMeals, setPastWeeksMeals] = useState([]);
  useEffect(() => {
    setMealLoading(true);
    (async () => {
      const raw = await sGet(sk);
      if (raw) setMeals(JSON.parse(raw));
      else if (sk === FIRST_KEY) { setMeals(FIRST_DEF); await sSet(sk, JSON.stringify(FIRST_DEF)); }
      else setMeals({});
      /* Load past 4 weeks for RED frequency checking */
      var past = [];
      for (var pw = 1; pw <= 4; pw++) {
        var pws = new Date(weekStart); pws.setDate(pws.getDate() - (pw * 7));
        var psk = mealKey(pws) + ":" + activeTab;
        var praw = await sGet(psk);
        if (praw) past.push(JSON.parse(praw));
      }
      setPastWeeksMeals(past);
      setMealLoading(false);
    })();
  }, [sk]);

  const saveMeals = useCallback(async (d) => { setSaving(true); await sSet(sk, JSON.stringify(d)); setSaving(false); }, [sk]);
  const pickMeal = (dk, id) => { const n = { ...meals, [dk]: id }; setMeals(n); saveMeals(n); setEditDay(null); };
  const clearMeal = dk => { const n = { ...meals }; delete n[dk]; setMeals(n); saveMeals(n); };
  const saveData = async (nd) => { setData(nd); await sSet("dashboard:data", JSON.stringify(nd)); };

  // ─── WEIGHT LOGGING ───
  const [prevComment, setPrevComment] = useState("");
  const [editingHealthLog, setEditingHealthLog] = useState(null);
  const [editHealthText, setEditHealthText] = useState("");
  React.useEffect(function() {
    if (!logEx) return;
    var ex = data[activeTab] && data[activeTab].exercises && data[activeTab].exercises[logEx.day] ? data[activeTab].exercises[logEx.day][logEx.idx] : null;
    if (!ex) return;
    setPrevComment("");
    var last = ex.prog && ex.prog.length > 0 ? ex.prog[ex.prog.length - 1] : null;
    if (last) {
      sGet("comment:" + activeTab + ":" + ex.name + ":" + last.wk).then(function(val) { if (val) setPrevComment(val); });
    }
    if (ex.notes) setPrevComment(function(prev) { return prev ? prev + "\n" + ex.notes : ex.notes; });
    if (last && last.note) setPrevComment(function(prev) { return prev ? prev + "\nPrev session: " + last.note : last.note; });
  }, [activeTab]);

  // Auto-refresh companion energy on app load
  const checkCompanionEnergy = useCallback(async function() {
    setEnergyLoading(true);
    try {
      var ak = await window.ensureApiKey();
      if (!ak) { window._setCompanionEnergy({ balance: 0, pct: 0, keyStatus: "no_key", initial: 5, spent: 0 }); setEnergyLoading(false); return; }
      var pingResp = await window._origFetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ak, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }) });
      var stored = await sGet("companion_energy");
      if (pingResp.ok) {
        if (stored) {
          var parsed = JSON.parse(stored);
          parsed.keyStatus = "active";
          /* A working ping means credit exists. If the estimate says empty, it is out of date
             (topped up, or spend elsewhere) — ask the user to set the real balance, don't guess. */
          parsed.depleted = false;
          parsed.needsCalibration = (parsed.pct <= 0 || parsed.balance <= 0);
          window._setCompanionEnergy(parsed);
          await sSet("companion_energy", JSON.stringify(parsed));
        } else {
          var fresh = { balance: 5.00, initial: 5.00, pct: 100, keyStatus: "active", spent: 0 };
          window._setCompanionEnergy(fresh);
          await sSet("companion_energy", JSON.stringify(fresh));
        }
      } else {
        var errData = null; try { errData = await pingResp.json(); } catch(e2) {}
        var errType = errData && errData.error ? errData.error.type : "unknown";
        var status = handleApiError(errData) === "ENERGY_EMPTY" ? "empty" : errType === "authentication_error" ? "invalid_key" : errType === "rate_limit_error" ? "rate_limited" : pingResp.status === 400 ? "active" : "error";
        if (stored) {
          var parsed2 = JSON.parse(stored);
          parsed2.keyStatus = status;
          if (status === "invalid_key") { parsed2.balance = 0; parsed2.pct = 0; }
          else if (status === "empty") { parsed2.balance = 0; parsed2.pct = 0; parsed2.depleted = true; parsed2.needsCalibration = false; parsed2.keyStatus = "active"; }
          else if (status === "active") { parsed2.depleted = false; parsed2.needsCalibration = (parsed2.pct <= 0 || parsed2.balance <= 0); }
          window._setCompanionEnergy(parsed2);
          await sSet("companion_energy", JSON.stringify(parsed2));
        } else {
          var bal2 = status === "invalid_key" ? 0 : 5;
          var en = { balance: bal2, initial: 5, pct: status === "invalid_key" ? 0 : 100, keyStatus: status, spent: 0 };
          window._setCompanionEnergy(en);
          await sSet("companion_energy", JSON.stringify(en));
        }
      }
    } catch(e) {
      /* If error is ENERGY_EMPTY (shouldn't happen now with _origFetch bypass), try loading stored data */
      if (window.isEnergyEmpty && window.isEnergyEmpty(e)) {
        var storedFallback = await sGet("companion_energy");
        if (storedFallback) { var pf = JSON.parse(storedFallback); pf.keyStatus = "active"; window._setCompanionEnergy(pf); }
        else { window._setCompanionEnergy({ balance: 0, pct: 0, keyStatus: "error", initial: 5, spent: 0 }); }
      } else {
        window._setCompanionEnergy({ balance: 0, pct: 0, keyStatus: "error", initial: 5, spent: 0 });
      }
    }
    setEnergyLoading(false);
  }, []);
  useEffect(() => { checkCompanionEnergy(); }, []);

  const openLogForm = (day, idx) => {
    window._dualLogState = null;

    const ex = data[activeTab].exercises[day][idx];
    const last = ex.prog && ex.prog.length > 0 ? ex.prog[ex.prog.length - 1] : null;
    setLogEx({ day, idx, who: activeTab }); setLogNeedChoice(""); // D1: the form belongs to this person
    var targetW = "";
    var targetR = "";
    if (ex.target) {
      var tm = ex.target.match(/([\.\d]+)kg/);
      var tr = ex.target.match(/(\d+)[x×](\d+)/);
      if (tm) targetW = tm[1];
      if (tr) targetR = tr[1];
    }
    var useW = targetW || (last ? last.w.replace("kg", "") : "");
    var lastReps = last && last.r ? parseReps(last.r) : [];
    var r1 = targetR || (lastReps[0] ? String(lastReps[0]) : "");
    var r2 = targetR || (lastReps[1] ? String(lastReps[1]) : (lastReps[0] ? String(lastReps[0]) : ""));
    var r3 = targetR || (lastReps[2] ? String(lastReps[2]) : (lastReps[0] ? String(lastReps[0]) : ""));
    var lastSets = last ? entrySets(last) : [];
    var wFor = function(i) { return targetW || (lastSets[i] ? lastSets[i].w : useW); }; // D2: last session's per-set weights
    if (last && Array.isArray(last.sets) && last.sets.length) setLogSets(logSetsFrom(last, 3)); // each set from the previous entry
    else setLogSets([{ w: wFor(0), r: r1 }, { w: wFor(1), r: r2 }, { w: wFor(2), r: r3 }]);
    (function() {
      var maxWk = 0;
      if (ex.prog) { for (var mwi = 0; mwi < ex.prog.length; mwi++) { if (ex.prog[mwi].wk > maxWk) maxWk = ex.prog[mwi].wk; } }
      setLogWeek(String(maxWk > 0 ? maxWk + 1 : calcWeek(data.config.trainingStart)));
    })();
    // Check if current week already has saved data — if so, pre-fill from it
    var currentCalcWk2 = calcWeek(data.config.trainingStart);
    var currentWkEntry = null;
    if (ex.prog) { for (var cwi = 0; cwi < ex.prog.length; cwi++) { if (ex.prog[cwi].wk === currentCalcWk2) { currentWkEntry = ex.prog[cwi]; break; } } }
    if (currentWkEntry) {
      setLogSets(logSetsFrom(currentWkEntry, 3)); // D2: per-set
      setLogWeek(String(currentCalcWk2));
      setLogComment(currentWkEntry.note || "");
      setLogFullRange(currentWkEntry.fullRange || "");
      setLogGoodForm(currentWkEntry.goodForm || "");
      setEditPrev(true);
    } else {
      setLogComment(""); setEditPrev(false);
      setLogFullRange(""); setLogGoodForm(""); // D12: always start unselected
    }
    setLogStatus("");
    setPrevComment("");
    // Load previous week's comment
    if (last) {
      sGet("comment:" + activeTab + ":" + ex.name + ":" + last.wk).then(function(val) {
        if (val) setPrevComment(val);
      });
    }
    // Also check for exercise notes and latest prog entry note
    if (ex.notes) setPrevComment(function(prev) { return prev ? prev + "\n" + ex.notes : ex.notes; });
    if (last && last.note) setPrevComment(function(prev) { return prev ? prev + "\nPrev session: " + last.note : last.note; });
  };
  const saveLog = async () => {
    if (!logEx || !data) return;
    const { day, idx } = logEx;
    const nd = JSON.parse(JSON.stringify(data));
    const ex = nd[activeTab].exercises[day][idx];
    if (ex && ex.stopped) { setFormMsg("⏸ " + ex.name + " is stopped — restart it in Exercise Settings to log"); setTimeout(() => setFormMsg(""), 4000); return; }
    // D12: Form and Range must be chosen (for everyone being saved from this form)
    if (!logGoodForm || !logFullRange) { setLogNeedChoice("Choose Form and Range to save"); return; }
    setLogNeedChoice("");
    var _sets = setsToSave(logSets); // D2: weight and reps per set
    if (editPrev && ex.prog.length > 0) {
      // Edit previous entry
      const prev = ex.prog[ex.prog.length - 1];
      prev.w = (logSets[0].w || prev.w.replace("kg", "")) + "kg";
      prev.r = fmtReps(logSets.map(s => parseInt(s.r) || 0));
      prev.wk = parseInt(logWeek) || prev.wk;
      prev.note = logComment.trim() || prev.note || "";
      prev.fullRange = logFullRange; prev.goodForm = logGoodForm; prev.sets = _sets;
      ex.current = prev.w; ex.reps = prev.r;
      // Status and target deferred to AI feedback
      ex.status = "";
      delete ex.target;
    } else {
      // New entry - check for duplicates
      var logWk = parseInt(logWeek) || calcWeek(data.config.trainingStart);
      var existingIdx = -1;
      for (var di = 0; di < ex.prog.length; di++) {
        if (ex.prog[di].wk === logWk) { existingIdx = di; break; }
      }
      if (existingIdx >= 0) {
        var action = confirm("Week " + logWk + " already has an entry for " + ex.name + " (" + ex.prog[existingIdx].w + " " + ex.prog[existingIdx].r + ").\n\nOK = Update existing entry\nCancel = Go back");
        if (!action) return;
        // Update existing entry instead of adding new
        ex.prog[existingIdx].w = (logSets[0].w || String(parseInt(ex.current) || 0)) + "kg";
        ex.prog[existingIdx].r = fmtReps(logSets.map(s => parseInt(s.r) || 0));
        ex.prog[existingIdx].note = logComment.trim() || ex.prog[existingIdx].note || "";
        ex.prog[existingIdx].fullRange = logFullRange; ex.prog[existingIdx].goodForm = logGoodForm; ex.prog[existingIdx].sets = _sets;
        ex.current = ex.prog[existingIdx].w;
        ex.reps = ex.prog[existingIdx].r;
        ex.notes = logComment.trim() || "";
        // Status and target deferred to AI feedback
        ex.status = "";
        delete ex.target;
        nd.config.lastUpdate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        if (logComment.trim()) await sSet("comment:" + activeTab + ":" + ex.name + ":" + logWk, logComment.trim());
        // Don't save yet or return — flow through to dual-log section below
      } else {
      const w = logSets[0].w || String(parseInt(ex.current) || 0);
      const repsStr = fmtReps(logSets.map(s => parseInt(s.r) || 0));
      const wStr = w + "kg";
      const wk = parseInt(logWeek) || calcWeek(data.config.trainingStart);
      ex.prog.push({ wk, w: wStr, r: repsStr, sets: _sets, note: logComment.trim() || "", fullRange: logFullRange, goodForm: logGoodForm });
      ex.current = wStr; ex.reps = repsStr;
      // Status and target deferred to AI feedback
      ex.status = "";
      delete ex.target;
      nd.config.week = Math.max(nd.config.week, wk);
    }
    }
    // Sync parent-level context (notes) across other days — each day keeps its own prog/current/reps/status/target
    ["sunday", "monday", "friday"].filter(function(d) { return d !== day; }).forEach(function(od) {
        var oi = -1;
        var odExs = nd[activeTab].exercises[od] || [];
        for (var si = 0; si < odExs.length; si++) { if (odExs[si].name === ex.name) { oi = si; break; } }
        if (oi >= 0) { var oe = nd[activeTab].exercises[od][oi]; oe.notes = ex.notes || ""; if (ex.progressionNotes) oe.progressionNotes = ex.progressionNotes; }
      });
    nd.config.week = calcWeek(nd.config.trainingStart); nd.config.lastUpdate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    ex.notes = logComment.trim() || ""; // Carry forward to next session
    if (logComment.trim()) await sSet("comment:" + activeTab + ":" + ex.name + ":" + logWeek, logComment.trim());
    const target = "ex-" + day + "-" + idx;
    var scrollY = window.scrollY; setLogEx(null); setSelectedEx(null); requestAnimationFrame(function() { window.scrollTo(0, scrollY); });
    await saveData(nd);
    // Save other person's data if they were edited via dual tabs.
    // JC's rule (v2.6.1): another person is saved ONLY if their Form and Range are both chosen;
    // otherwise their entry is treated as untouched and not saved (no block). Confirmation names both.
    var _savedFor = [personName(nd, activeTab)], _notSaved = [];
    if (window._dualLogState) {
      var otherTabs = Object.keys(window._dualLogState).filter(function(t) { return t !== activeTab; });
      for (var oti = 0; oti < otherTabs.length; oti++) {
        var ot = otherTabs[oti];
        var otState = window._dualLogState[ot];
        var _hasEntry = otState && otState._edited && otState.sets && otState.sets[0] && otState.sets[0].w && otState.sets[0].r;
        if (_hasEntry && !(otState.goodForm && otState.fullRange)) { _notSaved.push(personName(nd, ot)); continue; }
        if (_hasEntry) {
          var otEx = nd[ot] && nd[ot].exercises && nd[ot].exercises[day] ? nd[ot].exercises[day][idx] : null;
          if (otEx && !otEx.stopped) {
            _savedFor.push(personName(nd, ot));
            var otW = otState.sets[0].w + "kg";
            var otReps = fmtReps(otState.sets.map(function(s) { return parseInt(s.r) || 0; }));
            var otWk = parseInt(otState.week || logWeek) || calcWeek(data.config.trainingStart);
            var otExistIdx = -1;
            for (var oti2 = 0; oti2 < otEx.prog.length; oti2++) { if (otEx.prog[oti2].wk === otWk) { otExistIdx = oti2; break; } }
            if (otExistIdx >= 0) {
              otEx.prog[otExistIdx].w = otW;
              otEx.prog[otExistIdx].r = otReps;
              otEx.prog[otExistIdx].sets = setsToSave(otState.sets);
              otEx.prog[otExistIdx].note = otState.comment || "";
              otEx.prog[otExistIdx].fullRange = otState.fullRange; otEx.prog[otExistIdx].goodForm = otState.goodForm;
            } else {
              otEx.prog.push({ wk: otWk, w: otW, r: otReps, sets: setsToSave(otState.sets), note: otState.comment || "", fullRange: otState.fullRange, goodForm: otState.goodForm });
            }
            otEx.current = otW; otEx.reps = otReps;
            otEx.notes = otState.comment || "";
            var otOverride = otState.override || "standard";
            // Status and target deferred to AI feedback
            otEx.status = "";
            delete otEx.target;
            // Sync parent-level context (notes) for other person — each day keeps its own session data
            ["sunday", "monday", "friday"].filter(function(od2) { return od2 !== day; }).forEach(function(od2) {
              var odExs2 = nd[ot].exercises[od2] || [];
              for (var si2 = 0; si2 < odExs2.length; si2++) {
                if (odExs2[si2].name === otEx.name) {
                  odExs2[si2].notes = otEx.notes || "";
                  if (otEx.progressionNotes) odExs2[si2].progressionNotes = otEx.progressionNotes;
                  break;
                }
              }
            });
          }
        }
      }
      window._dualLogState = {};
      await saveData(nd);
    }
    setFormMsg("✓ " + ex.name + ": saved for " + _savedFor.join(" and ") + (_notSaved.length ? " · " + _notSaved.join(", ") + " not saved (Form and Range not chosen)" : "")); setTimeout(() => setFormMsg(""), 6000);
    setScrollTarget(target);
  };

  // ─── MEASUREMENT FORM ───
  const saveMeasurements = async () => { if (!data) return; const wk = parseInt(measInputs.week); if (!wk) return; const nd = JSON.parse(JSON.stringify(data)); const p = nd[activeTab]; ["bicep","forearm","calf","quad","chest","waist","shoulders"].forEach(f => { const v = parseFloat(measInputs[f]); if (!isNaN(v)) { if (!p.measurements[f]) p.measurements[f] = []; const ei = p.measurements[f].findIndex(e => e.wk === wk); if (ei >= 0) p.measurements[f][ei].v = v; else p.measurements[f].push({ wk, v }); p.measurements[f].sort((a, b) => a.wk - b.wk); } }); nd.config.week = calcWeek(nd.config.trainingStart); nd.config.lastUpdate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); if (measInputs.comment.trim()) await sSet("meas_comment:" + activeTab + ":" + wk, measInputs.comment.trim()); await saveData(nd); setShowMeasForm(false); setFormMsg("✓ Measurements saved"); setTimeout(() => setFormMsg(""), 3000); };

  // ─── BODY COMP FORM ───
  const saveBodyComp = async () => { if (!data) return; const wk = parseInt(bodyInputs.week); if (!wk) return; const nd = JSON.parse(JSON.stringify(data)); const p = nd[activeTab]; ["bodyFat","muscleRate","skeletalMuscle","visceralFat","subcutFat","bmr","bodyWater","bodyAge","bmi"].forEach(f => { const v = parseFloat(bodyInputs[f]); if (!isNaN(v)) { if (!p.body[f]) p.body[f] = []; const ei = p.body[f].findIndex(e => e.wk === wk); if (ei >= 0) p.body[f][ei].v = v; else p.body[f].push({ wk, v }); p.body[f].sort((a, b) => a.wk - b.wk); } }); ["muscleMass","boneMass"].forEach(f => { if (bodyInputs[f]?.trim()) { if (!p.body[f]) p.body[f] = []; const ei = p.body[f].findIndex(e => e.wk === wk); if (ei >= 0) p.body[f][ei].v = bodyInputs[f].trim(); else p.body[f].push({ wk, v: bodyInputs[f].trim() }); p.body[f].sort((a, b) => a.wk - b.wk); } }); if (bodyInputs.weight?.trim()) { 
        var rawWt = bodyInputs.weight.trim();
        var wv;
        if (rawWt.indexOf(":") >= 0) {
          var parts = rawWt.split(":");
          wv = parseInt(parts[0]) + parseFloat(parts[1]) / 14;
        } else if (rawWt.indexOf("st") >= 0) {
          var stParts = rawWt.replace(/[a-z]/gi, " ").trim().split(/\s+/);
          wv = parseInt(stParts[0]) + (parseFloat(stParts[1] || 0) / 14);
        } else {
          wv = parseFloat(rawWt);
        }
        if (!isNaN(wv)) { if (!p.body.weight) p.body.weight = []; const ei = p.body.weight.findIndex(e => e.wk === wk); if (ei >= 0) p.body.weight[ei].v = wv; else p.body.weight.push({ wk, v: wv }); p.body.weight.sort((a, b) => a.wk - b.wk); } } nd.config.week = calcWeek(nd.config.trainingStart); nd.config.lastUpdate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); await saveData(nd); setShowBodyForm(false); setFormMsg("✓ Body comp saved"); setTimeout(() => setFormMsg(""), 3000); };

  // ─── CUSTOM MEAL ───
  const saveCustomMeal = async () => { if (!customInputs.name.trim()) return; const id = "custom_" + Date.now(); const jf = parseFloat(customInputs.jcFat) || 0; const bf = parseFloat(customInputs.beckFat) || 0; const rating = (jf > 20 || bf > 20) ? "RED" : (jf > 14 || bf > 14) ? "AMBER" : "GREAT"; const meal = { id, name: customInputs.name.trim(), rating, jcKcal: parseInt(customInputs.jcKcal) || 0, beckKcal: parseInt(customInputs.beckKcal) || 0, jcProt: parseInt(customInputs.jcProt) || 0, beckProt: parseInt(customInputs.beckProt) || 0, jcFat: jf, beckFat: bf, freq: customInputs.freq, time: parseInt(customInputs.time) || 20, shop: [] }; const updated = [...customMeals, meal]; setCustomMeals(updated); await sSet("custom_meals", JSON.stringify(updated)); setShowCustomForm(false); setCustomInputs({ name: "", jcKcal: "", beckKcal: "", jcProt: "", beckProt: "", jcFat: "", beckFat: "", freq: "Weekly", time: "20" }); setFormMsg("✓ " + meal.name + " added"); setTimeout(() => setFormMsg(""), 3000); };

  // ─── FEEDBACK ───
  const generateFeedback = async () => {
    if (!data) return;
    setHomeFbExpanded(true); setFeedbackLoading(true);
    const tab = activeTab;
    try {
      const isJ = tab === "jc";
      const p = isJ ? data.jc : data.becks;
      const prof = p.profile || {};
      const who = prof.name + " (" + (prof.sex || "") + ", " + (calcAge(prof.dob) || prof.age || "") + ", " + (prof.height || "") + ", ideal " + (prof.idealWeight || "") + ", " + (prof.bodyType || "") + ". " + (prof.notes || "") + ")";
      // Health log
      let healthContext = ""; if (p.vitals && p.vitals.length > 0) { var lv = p.vitals[p.vitals.length-1]; healthContext += "\nVitals(" + lv.date + "): " + (lv.bp ? "BP:" + lv.bp + " " : "") + (lv.hr ? "HR:" + lv.hr + " " : "") + (lv.spo2 ? "SpO2:" + lv.spo2 + "% " : ""); } if (p.healthProfile) healthContext += "\nHealth profile: " + p.healthProfile;
      if (Array.isArray(p.healthLog) && p.healthLog.length > 0) {
        healthContext = "\nRecent health updates: " + p.healthLog.slice(-5).map(h => h.date + ": " + h.note).join("; ") + ".";
      }
      // Blood results
      let bloodContext = "";
      if (p.bloods && p.bloods.length > 0) {
        const latest = p.bloods[p.bloods.length - 1];
        bloodContext = "\nLatest bloods (" + latest.date + "): " + Object.entries(latest.tests).map(function([k, v]) { return k + "=" + v; }).join(", ") + ".";
        if (p.bloods.length > 1) { const prev = p.bloods[p.bloods.length - 2]; bloodContext += " Previous (" + prev.date + "): " + Object.entries(prev.tests).map(function([k, v]) { return k + "=" + v; }).join(", ") + "."; }
      }
      // Medications
      let medsContext = "";
      if (p.meds && p.meds.length > 0) {
        medsContext = "\nCurrent medications/supplements: " + p.meds.filter(m => m.active).map(m => m.name + " " + (m.dosage || "") + " (" + m.timing + ", " + m.frequency + ")").join(", ") + ".";
      }
      // Meds change history
      let medsHistCtx = "";
      if (p.medsHistory && p.medsHistory.length > 0) medsHistCtx = "\nMeds changes: " + p.medsHistory.slice(-5).map(h => h.date + ": " + h.snapshot).join("; ") + ".";
      // Measurement comments
      let measCommCtx = "";
      try { const mck = await firebase.database().ref(DATA_ROOT).orderByKey().startAt("meas_comment_" + activeTab + "_").endAt("meas_comment_" + activeTab + "_\uf8ff").once("value").then(function(s) { return { keys: s.exists() ? Object.keys(s.val()) : [] }; }); if (mck && mck.keys && mck.keys.length > 0) { const mcs = []; for (const k of mck.keys.slice(-5)) { try { const v = await firebase.database().ref(DATA_ROOT + "/" + k.replace(/[.#$/\[\]]/g, "_")).once("value").then(function(s) { return s.exists() ? { value: s.val() } : null; }); if (v && v.value) mcs.push(k.split(":")[2] + ": " + v.value); } catch {} } if (mcs.length > 0) measCommCtx = "\nMeasurement notes: " + mcs.join("; ") + "."; } } catch {}
      // Q&A history context
      let qaCtx = "";
      if (qaHistory[activeTab] && qaHistory[activeTab].length > 0) qaCtx = "\nRecent Q&A: " + qaHistory[activeTab].slice(-3).map(qa => "Q: " + qa.q.slice(0, 60) + " A: " + qa.a.slice(0, 100)).join(" | ") + ".";
      // Attachments extracted data
      let attachCtx = "";
      if (p.attachments && p.attachments.length > 0) {
        var attParts = [];
        for (var ati = 0; ati < p.attachments.length; ati++) { if (p.attachments[ati].extracted) attParts.push(p.attachments[ati].name + ": " + p.attachments[ati].extracted.substring(0, 300)); }
        if (attParts.length > 0) attachCtx = "\nAttached documents: " + attParts.join(" | ");
      }
      // Photo analysis data
      let photoCtx = "";
      if (p.bodyAnalysis) photoCtx += "\nBody type assessment: " + JSON.stringify(p.bodyAnalysis);
      if (p.progressPhotos && p.progressPhotos.length > 0) {
        var recent = p.progressPhotos.slice(-3);
        var pDescs = [];
        for (var pi = 0; pi < recent.length; pi++) { if (recent[pi].analysis) pDescs.push("Wk" + recent[pi].week + " " + recent[pi].date + ": " + recent[pi].analysis); }
        if (pDescs.length > 0) photoCtx += "\nProgress photo observations: " + pDescs.join("; ");
      }
      // Activity data (steps, walks, swims)
      let activityCtx = "";
      if (p.activity && p.activity.length > 0) {
        var recentAct = p.activity.slice(-7);
        var actParts = [];
        for (var aci = 0; aci < recentAct.length; aci++) { var a = recentAct[aci]; actParts.push(a.date + ": " + (a.steps ? a.steps + " steps" : "") + (a.activity ? " " + a.activity + " " + (a.duration || "") + "min" : "")); }
        activityCtx = "\nRecent activity (7 days): " + actParts.join(", ");
      }
      // Gather meal plan
      let mealSummary = "";
      try { const mr = await sGet(sk); if (mr) { const mp = JSON.parse(mr); const dayInfo = MEAL_DAYS.map(d => { const entry = mp[d.key]; const isO = entry && typeof entry === "object"; const din = isO ? entry.d : entry; const ml = allDinners.find(m => m.id === din); const note = isO ? entry._note : ""; return d.label + ": " + (ml ? ml.name : "unplanned") + (note ? " (" + note + ")" : ""); }).join(", "); mealSummary = "\nThis week's meals: " + dayInfo + "."; } } catch {}
      // Gather exercise comments \u2014 separated by current vs previous weeks
      let exComments = "";
      try {
        const keys = await firebase.database().ref(DATA_ROOT).orderByKey().startAt("comment_" + tab + "_").endAt("comment_" + tab + "_\uf8ff").once("value").then(function(s) { return { keys: s.exists() ? Object.keys(s.val()) : [] }; });
        if (keys && keys.keys && keys.keys.length > 0) {
          const currentWkComments = [];
          const prevWkComments = [];
          var currentWeekStr = String(data.config.week);
          for (const k of keys.keys.slice(-10)) {
            try { const v = await firebase.database().ref(DATA_ROOT + "/" + k.replace(/[.#$/\[\]]/g, "_")).once("value").then(function(s) { return s.exists() ? { value: s.val() } : null; }); if (v && v.value) { const parts = k.split(":"); var commentWk = parts[3]; var formatted = "Wk" + commentWk + " " + parts[2] + ": " + v.value; if (commentWk === currentWeekStr) { currentWkComments.push(formatted); } else { prevWkComments.push(formatted); } } } catch {}
          }
          if (currentWkComments.length > 0 || prevWkComments.length > 0) {
            exComments = "";
            if (currentWkComments.length > 0) exComments += "\nCurrent week (Wk" + currentWeekStr + ") session notes: " + currentWkComments.join(". ") + ".";
            if (prevWkComments.length > 0) exComments += "\nPrevious weeks session notes (HISTORICAL CONTEXT ONLY \u2014 do not treat as current): " + prevWkComments.join(". ") + ".";
            if (currentWkComments.length === 0) exComments += "\nNote: No session notes logged yet for current week (Wk" + currentWeekStr + "). Previous notes above are historical context only \u2014 do not present them as this week.";
          }
        }
      } catch {}
      // Previous feedback context
      const prev = feedbackResults[tab];
      var prevThreadCtx = "";
      if (prev && prev._thread && prev._thread.length > 0) {
        prevThreadCtx = "\nConversation on that feedback:\n" + prev._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + " (" + (m.when || "") + "): " + m.text; }).join("\n") + "\nTake this conversation into account — respect what they pushed back on, build on what they agreed with.";
      } else if (prev && prev._comment) {
        prevThreadCtx = "\nUser's response to that feedback: \"" + prev._comment + "\"" + (prev._commentWhen ? " (" + prev._commentWhen + ")" : "") + "\nTake their response into account — acknowledge what they acted on, address any concerns they raised, and adjust recommendations accordingly.";
      }
      var prevSummary = "";
      if (prev && prev._when !== "failed") {
        if (prev.chat) { prevSummary = prev.chat.substring(0, 400); }
        else { prevSummary = "Good: " + (prev.good || []).join("; ") + ". Opportunities: " + (prev.opportunities || []).join("; ") + ". Focus: " + (Array.isArray(prev.focus) ? prev.focus.join("; ") : prev.focus); }
      }
      const prevContext = prev && prev._when !== "failed" ? "\n\nPrevious catch-up (generated " + prev._when + "): " + prevSummary + "." + prevThreadCtx + "\nBuild on this — note what has changed since your last catch-up." : "\nThis is your FIRST catch-up since the programme started. Chat about the full journey from Week 1 to now.";
      // Compress exercise data - just current state, not full progression
      var exSummary = {};
      var days = Object.keys(p.exercises);
      for (var di = 0; di < days.length; di++) {
        var dayExs = p.exercises[days[di]];
        exSummary[days[di]] = dayExs.map(function(ex) {
          var latest = ex.prog && ex.prog.length > 0 ? ex.prog[ex.prog.length - 1] : null;
          var prev = ex.prog && ex.prog.length > 1 ? ex.prog[ex.prog.length - 2] : null;
          var qualInfo = ""; if (latest) { var et = ex.exType || "weights"; var frLbl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FullRange" : "CompletedInOne"; qualInfo = frLbl + "=" + (latest.fullRange === "good" ? "Good" : "Working") + ",GoodForm=" + (latest.goodForm === "good" ? "Good" : "Working"); }
          return { name: ex.name, current: ex.current, reps: ex.reps, status: ex.status, target: ex.target || "", notes: ex.notes || "", prev: prev ? fmtEntry(prev) + " Wk" + prev.wk : "", weeksTracked: ex.prog ? ex.prog.length : 0, quality: qualInfo };
        });
      }
      const prompt = "You are " + (prof.name || "the user") + "'s Lifecare Companion — a trusted, knowledgeable friend checking in on their progress in Week " + data.config.week + ". You know " + (prof.name || "them") + " well: " + who + ".\n\nSCENE: You're giving your honest take on how things are going across their exercise, eating, body, health, medications, and life in general. You have access to ALL their data and you weave it together naturally like a friend who's been following their journey.\n\nCOMMUNICATION STYLE: Start with 'Hi " + (prof.name || "") + ",' then get straight into your observations. Speak directly using 'you' and 'your' — NEVER third person. Do NOT ask them questions about themselves (unless you genuinely need a specific piece of information to make a recommendation). Do NOT suggest doing things together — you're an AI companion, not a real person. Do NOT use fake-casual openers like 'grab a coffee' or 'good to see you'. Write as flowing, natural paragraphs. No bullet points, no headers, no structured sections.\n\n" + TONE_RULES + getMoodContext(userMood) + getJournalWellbeingCtx(journalEntries, wellbeingFlags) + "\n\nDATA TO WEAVE INTO YOUR CHAT:\nExercises: " + JSON.stringify(exSummary) + "\nBody: " + JSON.stringify(p.body) + "\nMeasurements: " + JSON.stringify(p.measurements) + mealSummary + exComments + healthContext + bloodContext + medsContext + medsHistCtx + measCommCtx + qaCtx + attachCtx + photoCtx + activityCtx + getOnboardingCtx(tab) + prevContext + getCrossSectionCtx(tab, "home") + (function() { if (!journalEntries || journalEntries.length === 0) return ""; var todayStr = new Date().toISOString().split("T")[0]; var todayEntries = journalEntries.filter(function(e) { return e.date === todayStr; }); var recentEntries = journalEntries.slice(0, 10); var moodCounts = {}; recentEntries.forEach(function(e) { if (e.mood !== null && e.mood !== undefined) { var label = MOOD_LABELS[e.mood]; moodCounts[label] = (moodCounts[label] || 0) + 1; } }); return "\n\nJOURNAL ENTRIES (read these carefully — the user is sharing what's on their mind):\nToday's entries: " + (todayEntries.length > 0 ? todayEntries.map(function(e) { return (e.mood !== null && e.mood !== undefined ? "[" + MOOD_LABELS[e.mood] + "] " : "") + e.text; }).join(" | ") : "None yet") + "\nRecent entries (last 10): " + JSON.stringify(recentEntries.map(function(e) { return { date: e.date, mood: e.mood !== null && e.mood !== undefined ? MOOD_LABELS[e.mood] : null, text: e.text }; })) + "\nMood distribution (recent): " + JSON.stringify(moodCounts) + "\nTotal journal entries: " + journalEntries.length; })() + "\n\nRULES:\n- Write 3-4 short paragraphs of natural conversation — like actual speech, not a report.\n- Reference SPECIFIC numbers from the data (weights, reps, calories, blood results, measurements).\n- Cover the full picture: what's going well, what could be better, and one thing to focus on — but woven together naturally, not in labelled sections.\n- MEDICATION: Note interactions between active meds AND with diet/exercise. Label [OFFICIAL] vs [ANECDOTAL]. Never recommend stopping medication.\n- Keep total length under 200 words. Quality over quantity.\n- Return ONLY a JSON object: {\"chat\":\"your conversational paragraphs here\", \"wellbeingFlags\":{}} where wellbeingFlags is OPTIONAL — only include it if you are flagging a wellbeing concern at Tier 2+. Format: {\"concern_key\":{\"tier\":2,\"concern\":\"recurring headaches\",\"signposted\":\"GP\",\"date\":\"" + new Date().toISOString().split("T")[0] + "\"}}. Use snake_case keys like 'headaches', 'low_mood', 'work_stress'. Omit wellbeingFlags entirely if no concerns at Tier 2+.\n- Use \\n\\n between paragraphs in the chat value.";
      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }) });
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "Feedback API", status: response.status, statusText: response.statusText }].concat(prev).slice(0, 20); });
      const result = await response.json();
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "Feedback Response", data: JSON.stringify(result).substring(0, 500) }].concat(prev).slice(0, 20); });
      var apiErr = handleApiError(result);
      if (apiErr) throw new Error(apiErr);
      var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
      if (!text && result.error) throw new Error(result.error.message || JSON.stringify(result.error));
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const newFb = { chat: parsed.chat || "", good: parsed.good || [], opportunities: parsed.opportunities || [], focus: parsed.focus || [], _when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
      /* Save wellbeing flags if companion flagged concerns */
      if (parsed.wellbeingFlags && typeof parsed.wellbeingFlags === "object" && Object.keys(parsed.wellbeingFlags).length > 0) {
        var mergedFlags = Object.assign({}, wellbeingFlags, parsed.wellbeingFlags);
        setWellbeingFlags(mergedFlags);
        await sSet("wellbeing_flags_" + tab, JSON.stringify(mergedFlags));
      }
      // Archive previous to history
      if (prev && prev._when && prev._when !== "failed") {
        const hist = Object.assign({}, feedbackHistory);
        if (!hist[tab]) hist[tab] = [];
        hist[tab] = [prev, ...hist[tab]].slice(0, 10);
        setFeedbackHistory(hist);
        await sSet("feedback_history", JSON.stringify(hist));
      }
      const updated = Object.assign({}, feedbackResults); updated[tab] = newFb;
      setFeedbackResults(updated);
      await sSet("feedback_results", JSON.stringify(updated));
    } catch(fbErr) {
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "Feedback Error", data: String(fbErr).substring(0, 300) }].concat(prev).slice(0, 20); });
      const updated = Object.assign({}, feedbackResults); updated[tab] = { good: [window.isEnergyEmpty(fbErr) ? window.energyEmptyMsg : "Error: " + String(fbErr).substring(0, 150)], opportunities: [], focus: window.isEnergyEmpty(fbErr) ? [] : ["Check debug log for details"], _when: "failed" };
      setFeedbackResults(updated);
    }
    setFeedbackLoading(false);
  };

  // ─── EATING DAY FEEDBACK ───
  const generateEatFeedback = async (dayKey) => {
    if (!data) return;
    setEatFbLoading(true); setEatFbExpanded(true);
    const tab = activeTab;
    const fbStoreKey = "eat_feedback";
    try {
      const isJ = tab === "jc";
      const p = isJ ? data.jc : data.becks;
      const prof = p.profile || {};
      const who = prof.name + " (" + (prof.sex || "") + ", " + (calcAge(prof.dob) || prof.age || "") + ", " + (prof.height || "") + ", " + (prof.bodyType || "") + ")";
      const kf = isJ ? "jcKcal" : "beckKcal";
      const pf = isJ ? "jcProt" : "beckProt";
      const ff = isJ ? "jcFat" : "beckFat";
      const allBf = [...BREAKFASTS, ...customBreakfasts];
      const allLu = [...LUNCHES, ...customLunches];
      const allDin = [...DINNERS, ...customMeals];
      const allSn = [...SNACKS, ...customSnacks];
      const allDr = [...customDrinks];
      const allDe = [...customDesserts];
      const allFood = [].concat(allBf, allLu, allDin, allSn, allDr, allDe);
      const dayMeals = meals[dayKey] || {};
      const tracking = mealTracking || {};
      // Build planned vs consumed for this day
      var planned = []; var consumed = []; var skipped = [];
      var slots = [
        { prefix: "b", cat: "Breakfast", items: allBf, multi: true },
        { prefix: "l", cat: "Lunch", items: allLu, multi: true },
        { prefix: "d", cat: "Dinner", items: allDin, multi: true },
        { prefix: "ds", cat: "Dessert", items: allDe, multi: true },
        { prefix: "dr", cat: "Drink", items: allDr, multi: true },
        { prefix: "o", cat: "Snack", items: allSn, multi: true }
      ];
      slots.forEach(function(sl) {
        var keys = sl.multi ? [] : [sl.prefix];        if (sl.multi) { if (sl.prefix === "o") { for (var i = 1; i <= 20; i++) { if (dayMeals["o" + i]) keys.push("o" + i); } } else { keys.push(sl.prefix); for (var j = 2; j <= 10; j++) { if (dayMeals[sl.prefix + j]) keys.push(sl.prefix + j); } } }
        keys.forEach(function(k) {
          var id = dayMeals[k]; if (!id || id === "__empty__") return;
          var item = allFood.find(function(x) { return x.id === id; });
          if (!item) return;
          var trackKey = dayKey + ":" + k;
          var status = tracking[trackKey] || "planned";
          var entry = { slot: sl.cat, name: item.name, kcal: item[kf] || 0, prot: item[pf] || item.jcProt || 0, fat: item[ff] || item.jcFat || 0, rating: item.rating || "GREAT", freq: item.freq || "" };
          planned.push(entry);
          if (status === "consumed") consumed.push(entry);
          else if (status === "skipped") skipped.push(entry);
          else consumed.push(entry); // default to planned = consumed if not tracked
        });
      });
      // Calorie & macro targets
      var limKcal = isJ ? 2200 : 1900; var limProt = isJ ? 130 : 110; var limSfat = 20;
      var limCarbs = isJ ? 300 : 260; var limFib = isJ ? 35 : 30; var limSalt = 6;
      var totPlanned = planned.reduce(function(s,x){return s+x.kcal;},0);
      var totConsumed = consumed.reduce(function(s,x){return s+x.kcal;},0);
      var protConsumed = consumed.reduce(function(s,x){return s+(x.prot||0);},0);
      var fatConsumed = consumed.reduce(function(s,x){return s+(x.fat||0);},0);
      // RAG frequency summary
      var ragSummary = "";
      var redItems = consumed.filter(function(x){return x.rating==="RED";});
      var amberItems = consumed.filter(function(x){return x.rating==="AMBER";});
      if (redItems.length > 0) ragSummary += "RED items (target monthly): " + redItems.map(function(x){return x.name;}).join(", ") + ". ";
      if (amberItems.length > 0) ragSummary += "AMBER items (target weekly): " + amberItems.map(function(x){return x.name;}).join(", ") + ". ";
      // Day notes
      var dayNote = dayMeals._note || "";
      // Health context
      let healthCtx = ""; if (p.healthProfile) healthCtx += "Health: " + p.healthProfile + ". ";
      if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; healthCtx += "Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function([k,v]){return k+"="+v;}).join(", ") + ". "; }
      if (p.meds && p.meds.length > 0) healthCtx += "Meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+m.dosage;}).join(", ") + ". ";
      // Body comp
      let bodyCtx = "";
      if (p.body) { var bk = Object.keys(p.body); bk.forEach(function(k) { var arr = p.body[k]; if (arr && arr.length > 0) bodyCtx += k + ":" + arr[arr.length-1].v + " "; }); }
      // Measurements
      let measCtx = "";
      if (p.measurements && p.measurements.length > 0) { var lm = p.measurements[p.measurements.length-1]; measCtx = Object.entries(lm).filter(function(e){return e[0]!=="date"&&e[0]!=="week";}).map(function(e){return e[0]+"="+e[1];}).join(", "); }
      // Exercise context
      let exCtx = "";
      if (p.exercises) { var exDays = Object.keys(p.exercises); exCtx = exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + ql;}).join(", "); }).join("; "); }
      // Activity
      let actCtx = "";
      if (p.activity && p.activity.length > 0) { actCtx = p.activity.slice(-3).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", "); }
      // Previous eating feedback for this day
      var prevEat = (eatFbResults[tab] || {})[dayKey];
      var prevEatThread = "";
      if (prevEat && prevEat._thread && prevEat._thread.length > 0) {
        prevEatThread = "\nConversation on that feedback:\n" + prevEat._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n") + "\nRespect what they pushed back on, build on what they agreed with.";
      } else if (prevEat && prevEat._comment) {
        prevEatThread = "\nUser responded: \"" + prevEat._comment + "\"";
      }
      var prevCtx = prevEat && prevEat._when ? "\nPrevious feedback for this day (" + prevEat._when + "): Wins: " + (prevEat.wins || []).join("; ") + ". Tweaks: " + (prevEat.tweaks || []).join("; ") + ". Outlook: " + (prevEat.outlook || "") + "." + prevEatThread + "\nBuild on what changed since." : "";
      // Previous activity feedback
      var prevActFb = feedbackResults[tab];
      var prevActCtx = prevActFb && prevActFb._when !== "failed" ? "\nLast activity feedback (" + prevActFb._when + "): Good: " + (prevActFb.good || []).join("; ") + ". Opportunities: " + (prevActFb.opportunities || []).join("; ") + "." : "";
      // Week context - what other days look like
      var weekCtx = "";
      try {
        var DAYS7 = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
        var dayParts = [];
        DAYS7.forEach(function(dk) {
          if (dk === dayKey) return;
          var dm = meals[dk]; if (!dm) return;
          var dayItems = [];
          ["b","l","d"].forEach(function(s) { if (dm[s]) { var it = allFood.find(function(x){return x.id===dm[s];}); if (it) dayItems.push(it.name + "(" + (it[kf]||0) + "kcal)"); } });
          for (var oi=1;oi<=5;oi++) { if (dm["o"+oi]) { var oit = allFood.find(function(x){return x.id===dm["o"+oi];}); if (oit) dayItems.push(oit.name+"("+((oit[kf])||0)+"kcal)"); } }
          if (dayItems.length > 0) dayParts.push(dk.slice(0,3) + ": " + dayItems.join(", "));
        });
        if (dayParts.length > 0) weekCtx = "\nOther days this week: " + dayParts.join("; ") + ".";
      } catch(e) {}

      const prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend reviewing " + dayKey.charAt(0).toUpperCase() + dayKey.slice(1) + "'s eating for " + who + ". Week " + (data.config.week || calcWeek(data.config.trainingStart)) + " of their programme.\n\n" +
        "COMMUNICATION STYLE: Imagine you're on a video call with your friend, specifically about their eating today. You're a knowledgeable mate who happens to know a lot about nutrition — not a coach delivering a verdict. Be pragmatic, warm, non-judgemental and direct. Give your honest opinions based on experience. NEVER be preachy or say 'you should have cut that out'. If they ate something indulgent, assume there was a good reason. Instead of criticising, show how a small tweak (like reducing a portion by a third) would have made it fit comfortably within targets — so they can enjoy it guilt-free next time. Frame every improvement as a choice they can make, not a rule they broke.\n\n" +
        "TARGETS: Kcal " + limKcal + ", Protein " + limProt + "g, Sat Fat <" + limSfat + "g, Carbs " + limCarbs + "g, Fibre " + limFib + "g, Salt <" + limSalt + "g.\n" +
        "RAG STATUS FREQUENCY TARGETS: GREEN items = daily staples. AMBER items = weekly max. RED items = monthly max.\n\n" +
        "PLANNED TODAY: " + planned.map(function(x){return x.slot+": "+x.name+" ("+x.kcal+"kcal, "+x.prot+"g prot, "+x.fat+"g fat, "+x.rating+")";}).join("; ") + "\n" +
        "CONSUMED TODAY: " + consumed.map(function(x){return x.slot+": "+x.name+" ("+x.kcal+"kcal, "+x.prot+"g prot, "+x.fat+"g fat)";}).join("; ") + "\n" +
        (skipped.length > 0 ? "SKIPPED: " + skipped.map(function(x){return x.name;}).join(", ") + "\n" : "") +
        "Day total: " + totConsumed + "/" + limKcal + " kcal, " + protConsumed + "/" + limProt + "g protein, " + fatConsumed + "/" + limSfat + "g sat fat.\n" +
        (ragSummary ? "RAG: " + ragSummary + "\n" : "") +
        (dayNote ? "Day notes: " + dayNote + "\n" : "") +
        weekCtx + "\n" +
        healthCtx + "\n" +
        (bodyCtx ? "Body comp: " + bodyCtx + "\n" : "") +
        (measCtx ? "Measurements: " + measCtx + "\n" : "") +
        (exCtx ? "Exercise programme: " + exCtx + "\n" : "") +
        (actCtx ? "Recent activity: " + actCtx + "\n" : "") +
        prevCtx + prevActCtx + getOnboardingCtx(tab) + getCrossSectionCtx(tab, "eating") + "\n\n" +
        TONE_RULES + getMoodContext(userMood) + "\n\n" +
        "RULES FOR RESPONSE:\n" +
        "1. 'wins': 2-3 things that went well — specific good decisions, smart food choices, patterns improving vs previous feedback. Reference actual items and numbers.\n" +
        "2. 'tweaks': 1-2 constructive alternatives. NEVER say 'cut it out'. Instead: 'If you'd done [specific small change], the saving of Xg sat fat per week over 3 months would reduce [material health benefit like visceral fat, LDL impact, etc]'. Always translate the nutritional number into a real-world health outcome they care about.\n" +
        "3. 'outlook': One sentence — the honest but encouraging big picture for the day. Frame it as a mate who's proud of the effort.\n" +
        "Keep it tight — similar length to the home page companion feedback. Quality over quantity.\n\n" +
        "Return ONLY valid JSON: {\"wins\":[\"point\",\"point\"],\"tweaks\":[\"point\",\"point\"],\"outlook\":\"one sentence\"}";

      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }) });
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "EatFeedback API", status: response.status }].concat(prev).slice(0, 20); });
      const result = await response.json();
      var apiErr = handleApiError(result);
      if (apiErr) throw new Error(apiErr);
      var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
      if (!text && result.error) throw new Error(result.error.message || JSON.stringify(result.error));
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const newFb = { ...parsed, _when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
      // Save
      const updated = Object.assign({}, eatFbResults);
      if (!updated[tab]) updated[tab] = {};
      updated[tab][dayKey] = newFb;
      setEatFbResults(updated);
      await sSet(fbStoreKey, JSON.stringify(updated));
    } catch(err) {
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "EatFeedback Error", data: String(err).substring(0, 300) }].concat(prev).slice(0, 20); });
      const updated = Object.assign({}, eatFbResults);
      if (!updated[tab]) updated[tab] = {};
      updated[tab][dayKey] = { wins: [window.isEnergyEmpty(err) ? window.energyEmptyMsg : "Error: " + String(err).substring(0, 150)], tweaks: [], outlook: window.isEnergyEmpty(err) ? "" : "Check debug log", _when: "failed" };
      setEatFbResults(updated);
    }
    setEatFbLoading(false);
  };

  const generateWeekEatFeedback = async () => {
    if (!data) return;
    setEatFbLoading(true); setEatFbExpanded(true);
    const tab = activeTab;
    const fbStoreKey = "eat_feedback";
    try {
      const isJ = tab === "jc";
      const p = isJ ? data.jc : data.becks;
      const prof = p.profile || {};
      const who = prof.name + " (" + (prof.sex || "") + ", " + (calcAge(prof.dob) || prof.age || "") + ", " + (prof.height || "") + ", " + (prof.bodyType || "") + ")";
      const kf = isJ ? "jcKcal" : "beckKcal";
      const pf = isJ ? "jcProt" : "beckProt";
      const ff = isJ ? "jcFat" : "beckFat";
      const allBf = [...BREAKFASTS, ...customBreakfasts];
      const allLu = [...LUNCHES, ...customLunches];
      const allDin = [...DINNERS, ...customMeals];
      const allSn = [...SNACKS, ...customSnacks];
      const allDr = [...customDrinks];
      const allDe = [...customDesserts];
      const allFood = [].concat(allBf, allLu, allDin, allSn, allDr, allDe);
      const tracking = mealTracking || {};
      var DAYS7 = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      var weekSummary = []; var weekTotKcal = 0; var weekTotProt = 0; var weekTotFat = 0; var daysPlanned = 0;
      var allRedItems = []; var allAmberItems = [];
      DAYS7.forEach(function(dk) {
        var dm = meals[dk]; if (!dm) return;
        var dayPlanned = []; var dayConsumed = []; var daySkipped = [];
        var slots = [
          { prefix: "b", cat: "Breakfast", multi: true },
          { prefix: "l", cat: "Lunch", multi: true },
          { prefix: "d", cat: "Dinner", multi: true },
          { prefix: "ds", cat: "Dessert", multi: true },
          { prefix: "dr", cat: "Drink", multi: true },
          { prefix: "o", cat: "Snack", multi: true }
        ];
        slots.forEach(function(sl) {
          var keys = [];
          if (sl.prefix === "o") { for (var i = 1; i <= 20; i++) { if (dm["o" + i]) keys.push("o" + i); } } else { keys.push(sl.prefix); for (var j = 2; j <= 10; j++) { if (dm[sl.prefix + j]) keys.push(sl.prefix + j); } }
          keys.forEach(function(k) {
            var id = dm[k]; if (!id || id === "__empty__") return;
            var item = allFood.find(function(x) { return x.id === id; });
            if (!item) return;
            var trackKey = dk + ":" + k;
            var status = tracking[trackKey] || "planned";
            var entry = { slot: sl.cat, name: item.name, kcal: item[kf] || 0, prot: item[pf] || item.jcProt || 0, fat: item[ff] || item.jcFat || 0, rating: item.rating || "GREAT", freq: item.freq || "" };
            dayPlanned.push(entry);
            if (status === "consumed") dayConsumed.push(entry);
            else if (status === "skipped") daySkipped.push(entry);
            else dayConsumed.push(entry);
          });
        });
        if (dayPlanned.length > 0) {
          daysPlanned++;
          var dKcal = dayConsumed.reduce(function(s,x){return s+x.kcal;},0);
          var dProt = dayConsumed.reduce(function(s,x){return s+(x.prot||0);},0);
          var dFat = dayConsumed.reduce(function(s,x){return s+(x.fat||0);},0);
          weekTotKcal += dKcal; weekTotProt += dProt; weekTotFat += dFat;
          dayConsumed.forEach(function(x){if(x.rating==="RED")allRedItems.push(x.name);if(x.rating==="AMBER")allAmberItems.push(x.name);});
          weekSummary.push(dk.slice(0,3) + ": " + dKcal + "kcal, " + dProt + "g prot. Items: " + dayConsumed.map(function(x){return x.name+"("+x.kcal+"kcal,"+x.rating+")";}).join(", ") + (daySkipped.length > 0 ? ". Skipped: " + daySkipped.map(function(x){return x.name;}).join(", ") : ""));
        }
      });
      var limKcal = isJ ? 2200 : 1900; var limProt = isJ ? 130 : 110; var limSfat = 20;
      var avgKcal = daysPlanned > 0 ? Math.round(weekTotKcal / daysPlanned) : 0;
      var avgProt = daysPlanned > 0 ? Math.round(weekTotProt / daysPlanned) : 0;
      var ragSummary = "";
      if (allRedItems.length > 0) ragSummary += "RED items (target monthly): " + allRedItems.join(", ") + ". ";
      if (allAmberItems.length > 0) ragSummary += "AMBER items (target weekly): " + allAmberItems.join(", ") + ". ";
      let healthCtx = ""; if (p.healthProfile) healthCtx += "Health: " + p.healthProfile + ". ";
      if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; healthCtx += "Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function([k,v]){return k+"="+v;}).join(", ") + ". "; }
      if (p.meds && p.meds.length > 0) healthCtx += "Meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+m.dosage;}).join(", ") + ". ";
      let bodyCtx = "";
      if (p.body) { var bk = Object.keys(p.body); bk.forEach(function(k) { var arr = p.body[k]; if (arr && arr.length > 0) bodyCtx += k + ":" + arr[arr.length-1].v + " "; }); }
      let measCtx2 = "";
      if (p.measurements && p.measurements.length > 0) { var lm2 = p.measurements[p.measurements.length-1]; measCtx2 = Object.entries(lm2).filter(function(e){return e[0]!=="date"&&e[0]!=="week";}).map(function(e){return e[0]+"="+e[1];}).join(", "); }
      let exCtx = "";
      if (p.exercises) { var exDays = Object.keys(p.exercises); exCtx = exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + ql;}).join(", "); }).join("; "); }
      let actCtx = "";
      if (p.activity && p.activity.length > 0) { actCtx = p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", "); }
      var prevEat = (eatFbResults[tab] || {})["week"];
      var prevCtx = prevEat && prevEat._when && prevEat._when !== "failed" ? "\nPrevious week feedback (" + prevEat._when + "): Wins: " + (prevEat.wins || []).join("; ") + ". Tweaks: " + (prevEat.tweaks || []).join("; ") + ". Outlook: " + (prevEat.outlook || "") + ".\nBuild on what changed since." : "";
      if (prevEat && prevEat._thread && prevEat._thread.length > 0) {
        prevCtx += "\nConversation on that week feedback:\n" + prevEat._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n") + "\nRespect what they pushed back on, build on what they agreed with.";
      } else if (prevEat && prevEat._comment) {
        prevCtx += "\nUser responded to that feedback: \"" + prevEat._comment + "\"";
      }
      var prevActFb = feedbackResults[tab];
      var prevActCtx = prevActFb && prevActFb._when !== "failed" ? "\nLast activity feedback (" + prevActFb._when + "): Good: " + (prevActFb.good || []).join("; ") + ". Opportunities: " + (prevActFb.opportunities || []).join("; ") + "." : "";

      const prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend reviewing the FULL WEEK of eating for " + who + ". Week " + (data.config.week || calcWeek(data.config.trainingStart)) + " of their programme.\n\n" +
        "COMMUNICATION STYLE: Imagine you're on a video call with your friend, specifically about how their eating went this week. You're a knowledgeable mate who knows a lot about nutrition — not a coach delivering a weekly report card. Be pragmatic, warm, non-judgemental and direct. Give your honest opinions based on experience. NEVER be preachy or say 'you should have cut that out'. If they ate something indulgent, assume there was a good reason. Instead of criticising, show how small tweaks would accumulate over the week to meaningful health outcomes. Frame every improvement as a choice they can make, not a rule they broke.\n\n" +
        "DAILY TARGETS: Kcal " + limKcal + "/day, Protein " + limProt + "g/day, Sat Fat <" + limSfat + "g/day.\n" +
        "RAG STATUS FREQUENCY TARGETS: GREEN items = daily staples. AMBER items = weekly max. RED items = monthly max.\n\n" +
        "WEEK SUMMARY (" + daysPlanned + " days planned):\n" + weekSummary.join("\n") + "\n\n" +
        "WEEK AVERAGES: " + avgKcal + "/" + limKcal + " kcal/day, " + avgProt + "/" + limProt + "g protein/day.\n" +
        "WEEK TOTAL FAT: " + weekTotFat + "g across " + daysPlanned + " days.\n" +
        (ragSummary ? "RAG: " + ragSummary + "\n" : "") +
        healthCtx + "\n" +
        (bodyCtx ? "Body comp: " + bodyCtx + "\n" : "") +
        (measCtx2 ? "Measurements: " + measCtx2 + "\n" : "") +
        (exCtx ? "Exercise programme: " + exCtx + "\n" : "") +
        (actCtx ? "Recent activity: " + actCtx + "\n" : "") +
        prevCtx + prevActCtx + getOnboardingCtx(tab) + getCrossSectionCtx(tab, "eating") + "\n\n" +
        TONE_RULES + getMoodContext(userMood) + "\n\n" +
        "RULES FOR RESPONSE:\n" +
        "1. 'wins': 2-3 things that went well across the WHOLE WEEK — patterns, consistency, smart choices, improvements from previous weeks. Reference actual items, numbers and trends across days.\n" +
        "2. 'tweaks': 1-2 constructive alternatives for the week ahead. NEVER say 'cut it out'. Instead: 'If you swapped [X] for [Y] on [days], the weekly saving of Xg sat fat over 3 months would [material health benefit]'. Always translate the nutritional number into a real-world health outcome they care about.\n" +
        "3. 'outlook': One sentence — the honest but encouraging big picture for the week. Frame it as a mate who's proud of the effort and can see the trajectory.\n" +
        "Keep it tight — similar length to the home page companion feedback. Quality over quantity.\n\n" +
        "Return ONLY valid JSON: {\"wins\":[\"point\",\"point\"],\"tweaks\":[\"point\",\"point\"],\"outlook\":\"one sentence\"}";

      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }) });
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "WeekEatFeedback API", status: response.status }].concat(prev).slice(0, 20); });
      const result = await response.json();
      var apiErr = handleApiError(result);
      if (apiErr) throw new Error(apiErr);
      var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
      if (!text && result.error) throw new Error(result.error.message || JSON.stringify(result.error));
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const newFb = { ...parsed, _when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
      const updated = Object.assign({}, eatFbResults);
      if (!updated[tab]) updated[tab] = {};
      updated[tab]["week"] = newFb;
      setEatFbResults(updated);
      await sSet(fbStoreKey, JSON.stringify(updated));
    } catch(err) {
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "WeekEatFeedback Error", data: String(err).substring(0, 300) }].concat(prev).slice(0, 20); });
      const updated = Object.assign({}, eatFbResults);
      if (!updated[tab]) updated[tab] = {};
      updated[tab]["week"] = { wins: [window.isEnergyEmpty(err) ? window.energyEmptyMsg : "Error: " + String(err).substring(0, 150)], tweaks: [], outlook: window.isEnergyEmpty(err) ? "" : "Check debug log", _when: "failed" };
      setEatFbResults(updated);
    }
    setEatFbLoading(false);
  };

  const [qaMsg, setQaMsg] = useState("");
  const [threadLoading, setThreadLoading] = useState({});

  // ─── CROSS-SECTION THREAD CONTEXT ───
  const getCrossSectionCtx = function(tab, excludeSection) {
    var lines = [];
    var addThreadSummary = function(label, fbObj) {
      if (!fbObj) return;
      if (fbObj._thread && fbObj._thread.length > 0) {
        var lastTwo = fbObj._thread.slice(-4);
        lines.push(label + " conversation: " + lastTwo.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join(" | "));
      }
    };
    if (excludeSection !== "home") addThreadSummary("Home feedback", feedbackResults[tab]);
    if (excludeSection !== "eating") {
      var eatTab = eatFbResults[tab];
      if (eatTab) {
        if (eatTab.week) addThreadSummary("Weekly eating", eatTab.week);
        var eatDays = Object.keys(eatTab).filter(function(k) { return k !== "week"; });
        if (eatDays.length > 0) { var lastEatDay = eatDays[eatDays.length - 1]; addThreadSummary("Eating (" + lastEatDay + ")", eatTab[lastEatDay]); }
      }
    }
    if (excludeSection !== "session" && sessionFeedback) {
      var sfbKeys = Object.keys(sessionFeedback).filter(function(k) { return k.startsWith(tab + "_"); });
      if (sfbKeys.length > 0) { addThreadSummary("Activities (" + sfbKeys[sfbKeys.length - 1].split("_")[1] + ")", sessionFeedback[sfbKeys[sfbKeys.length - 1]]); }
    }
    if (excludeSection !== "bodycomp") addThreadSummary("Body comp", bodyFeedback);
    if (excludeSection !== "meas") addThreadSummary("Measurements", measFeedback);
    /* Journal summary for cross-section awareness */
    if (journalEntries && journalEntries.length > 0) {
      var recentJ = journalEntries.slice(0, 5);
      var jSummary = recentJ.map(function(e) { return (e.date || "") + (e.mood !== null && e.mood !== undefined ? " [" + MOOD_LABELS[e.mood] + "]" : "") + ": " + (e.text || "").substring(0, 120); }).join(" | ");
      lines.push("Journal (recent): " + jSummary);
    }
    return lines.length > 0 ? "\n\nCROSS-SECTION CONTEXT (recent conversations from other feedback areas — use to connect the dots):\n" + lines.join("\n") : "";
  };

  // ─── ONBOARDING/PROFILE CONTEXT FOR AI FEEDBACK ───
  const getOnboardingCtx = function(tab) {
    var p = tab === "jc" ? data.jc : data.becks;
    if (!p) return "";
    var ob = p.onboarding || {};
    var prof = p.profile || {};
    var parts = [];
    // Personality & motivation
    if (ob.personalityType) parts.push("Personality: " + ob.personalityType);
    if (ob.motivationStyle) parts.push("Motivation style: " + ob.motivationStyle);
    if (ob.whatDerails) parts.push("What derails them: " + ob.whatDerails);
    if (ob.accountabilityPref) parts.push("Accountability preference: " + ob.accountabilityPref);
    if (ob.neurodiversity) parts.push("Neurodiversity: " + ob.neurodiversity);
    // Lifestyle & work
    if (ob.occupation) parts.push("Occupation: " + ob.occupation);
    if (ob.workPattern) parts.push("Work pattern: " + ob.workPattern);
    if (ob.workHours) parts.push("Work hours: " + ob.workHours);
    if (ob.commute) parts.push("Commute: " + ob.commute);
    // Living situation
    if (ob.livingSituation) parts.push("Living situation: " + ob.livingSituation);
    if (ob.familyHistory) parts.push("Family health history: " + ob.familyHistory);
    // Goals & activity
    if (ob.goals) parts.push("Goals: " + ob.goals);
    if (ob.activity) parts.push("Current activity level: " + ob.activity);
    if (ob.equipment) parts.push("Equipment: " + ob.equipment);
    // Eating habits
    if (ob.cookingConfidence) parts.push("Cooking confidence: " + ob.cookingConfidence);
    if (ob.eatingOutFreq) parts.push("Eating out frequency: " + ob.eatingOutFreq);
    if (ob.whoCooks) parts.push("Who cooks: " + ob.whoCooks);
    if (ob.mealRegularity) parts.push("Meal regularity: " + ob.mealRegularity);
    if (ob.emotionalEating) parts.push("Emotional eating: " + ob.emotionalEating);
    if (ob.waterIntake) parts.push("Water intake: " + ob.waterIntake);
    if (ob.caffeineDaily) parts.push("Daily caffeine: " + ob.caffeineDaily);
    if (ob.alcoholFrequency) parts.push("Alcohol frequency: " + ob.alcoholFrequency);
    // Wellbeing
    if (ob.sleepHours) parts.push("Sleep: " + ob.sleepHours + "hrs");
    if (ob.sleepQuality) parts.push("Sleep quality: " + ob.sleepQuality + "/5");
    if (ob.sleepIssues) parts.push("Sleep issues: " + ob.sleepIssues);
    if (ob.screensBed) parts.push("Screens before bed: " + ob.screensBed);
    if (ob.caffeineCutoff) parts.push("Caffeine cutoff: " + ob.caffeineCutoff);
    if (ob.stressLevel) parts.push("Stress level: " + ob.stressLevel + "/5");
    if (ob.mainStressors) parts.push("Main stressors: " + ob.mainStressors);
    if (ob.copingStrategies) parts.push("Coping strategies: " + ob.copingStrategies);
    if (ob.mentalHealth) parts.push("Mental health: " + ob.mentalHealth);
    if (ob.currentSupport) parts.push("Current support: " + ob.currentSupport);
    // Health setup
    if (ob.conditions) parts.push("Health conditions: " + ob.conditions);
    if (ob.injuries) parts.push("Injuries: " + ob.injuries);
    if (ob.painAreas) parts.push("Pain areas: " + ob.painAreas);
    if (ob.weightHighest) parts.push("Highest weight: " + ob.weightHighest);
    if (ob.weightLowest) parts.push("Lowest adult weight: " + ob.weightLowest);
    if (ob.previousDiets) parts.push("Previous diets: " + ob.previousDiets);
    // Body analysis
    if (p.bodyAnalysis) parts.push("Body type assessment: " + JSON.stringify(p.bodyAnalysis));
    // Profile notes
    if (prof.notes) parts.push("Profile notes: " + prof.notes);
    if (prof.bodyType) parts.push("Body type: " + prof.bodyType);
    if (prof.fibreType) parts.push("Fibre type: " + prof.fibreType);
    return parts.length > 0 ? "\n\nPERSONAL PROFILE CONTEXT (use to personalise advice — reference personality, lifestyle, sleep, stress, and wellbeing factors where relevant):\n" + parts.join(". ") + "." : "";
  };

  // ─── FEEDBACK THREAD REPLY ───
  const threadReply = async function(fbObj, fbType, fbKey, updateFn, saveKey) {
    var elId = "thread-input-" + fbType + "-" + fbKey;
    var el = document.getElementById(elId);
    var txt = el ? el.value.trim() : "";
    if (!txt) return;
    var loadKey = fbType + "-" + fbKey;
    setThreadLoading(function(prev) { return Object.assign({}, prev, { [loadKey]: true }); });
    try {
      var thread = (fbObj._thread || []).concat([{ role: "user", text: txt, when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }]);
      // Build conversation history for API
      var convoHistory = thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n");
      // Build context about what feedback this is responding to
      var fbContext = "";
      if (fbObj.good) fbContext += "Good: " + (fbObj.good || []).join("; ") + ". ";
      if (fbObj.opportunities) fbContext += "Opportunities: " + (fbObj.opportunities || []).join("; ") + ". ";
      if (fbObj.focus) fbContext += "Focus: " + (Array.isArray(fbObj.focus) ? fbObj.focus.join("; ") : fbObj.focus) + ". ";
      if (fbObj.wins) fbContext += "Wins: " + (fbObj.wins || []).join("; ") + ". ";
      if (fbObj.tweaks) fbContext += "Tweaks: " + (fbObj.tweaks || []).join("; ") + ". ";
      if (fbObj.outlook) fbContext += "Outlook: " + fbObj.outlook + ". ";
      if (fbObj.summary) fbContext += "Summary: " + fbObj.summary + ". ";
      if (fbObj.exercises) fbContext += "Exercises: " + fbObj.exercises.map(function(ex) { return ex.name + " — " + ex.verdict + (ex._decision ? " (" + ex._decision + (ex._userNote ? ": " + ex._userNote : "") + ")" : ""); }).join("; ") + ". ";
      var wellbeingCtx = (fbType === "home" && journalEntries && journalEntries.length > 0) ? "\n\n" + WELLBEING_RULES + (wellbeingFlags && Object.keys(wellbeingFlags).length > 0 ? "\nActive wellbeing flags: " + JSON.stringify(wellbeingFlags) : "") + "\nRecent journal: " + journalEntries.slice(0, 5).map(function(e) { return e.date + ": " + (e.text || "").substring(0, 100); }).join(" | ") : "";
      var prompt = "You are the user's Lifecare Companion continuing a conversation about feedback you gave. You are their trusted, knowledgeable friend — imagine you're still on the same video call about this topic. Mirror and match their energy, be warm, empathetic and honest. Keep responses conversational — 2-4 sentences max unless they ask for detail. "+TONE_RULES+getMoodContext(userMood)+wellbeingCtx+"\n\nOriginal feedback: " + fbContext + "\n\nConversation so far:\n" + convoHistory + "\n\nRespond naturally to their latest message. If they're pushing back, respect it — they know their situation better than you. If they're asking for detail, give it with specific numbers. If they're sharing context, acknowledge it and adjust your advice. If they share something concerning about their health or wellbeing, support them warmly and signpost appropriate help — never say it's outside your scope. Return ONLY your response text, no JSON, no formatting.";
      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
      var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
      var replyTxt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) replyTxt += result.content[ci].text; } }
      if (replyTxt) {
        thread.push({ role: "companion", text: replyTxt.trim(), when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) });
      }
      var updatedFb = Object.assign({}, fbObj, { _thread: thread });
      delete updatedFb._comment; delete updatedFb._commentWhen;
      updateFn(updatedFb, saveKey);
      if (el) el.value = "";
    } catch(e) { console.error("Thread reply error:", e); if (window.isEnergyEmpty(e)) { setFormMsg(window.energyEmptyMsg); setTimeout(function() { setFormMsg(""); }, 4000); } }
    setThreadLoading(function(prev) { return Object.assign({}, prev, { [loadKey]: false }); });
  };

  // Thread update helpers for each feedback type
  const updateHomeFb = function(updatedFb, saveKey) {
    var updated = Object.assign({}, feedbackResults, { [activeTab]: updatedFb });
    setFeedbackResults(updated); sSet("feedback_results", JSON.stringify(updated));
  };
  const updateEatDayFb = function(updatedFb, dayKey) {
    var updated = Object.assign({}, eatFbResults);
    updated[activeTab] = Object.assign({}, updated[activeTab], { [dayKey]: updatedFb });
    setEatFbResults(updated); sSet("eat_feedback", JSON.stringify(updated));
  };
  const updateEatWeekFb = function(updatedFb) {
    var updated = Object.assign({}, eatFbResults);
    updated[activeTab] = Object.assign({}, updated[activeTab], { week: updatedFb });
    setEatFbResults(updated); sSet("eat_feedback", JSON.stringify(updated));
  };
  const updateSessionFb = function(updatedFb, sfbKey) {
    var updated = Object.assign({}, sessionFeedback, { [sfbKey]: updatedFb });
    setSessionFeedback(updated); sSet("session_feedback_all", JSON.stringify(updated));
  };
  const updateBodyFb = function(updatedFb) {
    setBodyFeedback(updatedFb);
    sSet("body_feedback", JSON.stringify(Object.assign({}, bodyFbAll || {}, { [activeTab]: updatedFb })));
  };
  const updateMeasFb = function(updatedFb) {
    setMeasFeedback(updatedFb);
    sSet("meas_feedback", JSON.stringify(Object.assign({}, measFbAll || {}, { [activeTab]: updatedFb })));
  };

  // Thread UI renderer
  const renderThread = function(fbObj, fbType, fbKey, updateFn, saveKey) {
    var thread = fbObj._thread || [];
    // Migrate old single comment to thread
    if (!thread.length && fbObj._comment) {
      thread = [{ role: "user", text: fbObj._comment, when: fbObj._commentWhen || "" }];
    }
    var loadKey = fbType + "-" + fbKey;
    var isLoading = threadLoading[loadKey];
    return React.createElement("div", { style: { marginTop: 10 } },
      thread.length > 0 && React.createElement("div", { style: { marginBottom: 8 } },
        React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" } }, "Conversation"),
        thread.map(function(m, i) {
          var isUser = m.role === "user";
          return React.createElement("div", { key: i, style: { display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 6 } },
            React.createElement("div", { style: { maxWidth: "85%", padding: "8px 12px", borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isUser ? accentChatUser : "#334155", border: isUser ? "1px solid " + accentBorder : "none", color: isUser ? "#334155" : "#fff", fontSize: 12, lineHeight: 1.5 } }, m.text),
            React.createElement("div", { style: { fontSize: 9, color: "#94a3b8", marginTop: 2, paddingLeft: 4, paddingRight: 4 } }, isUser ? "You" : "Companion", m.when ? " · " + m.when : "")
          );
        })
      ),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        React.createElement("textarea", { id: "thread-input-" + fbType + "-" + fbKey, placeholder: thread.length > 0 ? "Continue the conversation..." : "Respond to this feedback...", disabled: isLoading, style: { flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 40, boxSizing: "border-box", fontFamily: "inherit", opacity: isLoading ? 0.6 : 1 } }),
        React.createElement("button", { onClick: function() { threadReply(fbObj, fbType, fbKey, updateFn, saveKey); }, disabled: isLoading, style: { padding: "8px 14px", background: isLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap", alignSelf: "flex-end", minWidth: 50 } }, isLoading ? React.createElement("span", null, React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })) : "Send")
      )
    );
  };

  // ─── HELP (how to use the app) — answers from APP_GUIDE.md ───
  const askHelp = async () => {
    var el = document.getElementById("help-input-" + activeTab);
    var question = el ? el.value.trim() : "";
    if (!question) { setHelpMsg("Type a question first"); setTimeout(function() { setHelpMsg(""); }, 2000); return; }
    if (helpLoading) return;
    setHelpLoading(true); setHelpMsg("");
    try {
      if (!window._appGuide) {
        var gr = await fetch("APP_GUIDE.md", { cache: "no-cache" });
        if (!gr.ok) throw new Error("Couldn't load the app guide (" + gr.status + ")");
        window._appGuide = await gr.text();
      }
      var secNames = { overview: "Home", body: "My Body", weights: "My Exercise", meals: "My Eating", shop: "My Shop", bloods: "My Health", admin: "Settings", data: "Settings" };
      var who = (data && data[activeTab] && data[activeTab].profile && data[activeTab].profile.name) || activeTab;
      var system = [
        { type: "text", text: "You are the user's Lifecare Companion, helping them USE the Lifecare Companion app. Answer ONLY from the app guide below. Be warm, friendly and direct, and speak to them as \"you\". Use UK English.\n\nHOW TO ANSWER:\n- Say exactly where things are: tab → section → button, using the names as they appear in the app.\n- For how-to questions give short numbered steps.\n- Explain the why when it helps them use the app well.\n- Keep it short: usually under 120 words. Plain text only: no headings, no bold, no tables. Simple numbered or dash lists are fine.\n- If the guide doesn't cover it, say so honestly and suggest 💬 Send Feedback at the bottom of the app. Never invent buttons, screens or features.\n- For questions about their own health, food, training or results (rather than how the app works), point them to the 💬 Chat button, which uses their data.\n- Never give medical advice.\n\n=== APP GUIDE ===\n" + window._appGuide, cache_control: { type: "ephemeral" } }
      ];
      var hist = (helpHistory[activeTab] || []).slice(-6);
      var msgs = [];
      hist.forEach(function(h) { msgs.push({ role: "user", content: h.q }); msgs.push({ role: "assistant", content: h.a }); });
      msgs.push({ role: "user", content: "[I'm " + who + ", currently on the " + (secNames[section] || "Home") + " tab]\n" + question });
      var resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, system: system, messages: msgs })
      });
      var result = await resp.json();
      var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
      var answer = ""; if (result.content) { for (var hi = 0; hi < result.content.length; hi++) { if (result.content[hi].text) answer += result.content[hi].text; } }
      if (!answer) throw new Error("No answer came back — please try again");
      answer = answer.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/`([^`]+)`/g, "$1"); /* panel shows plain text */
      var entry = { q: question, a: answer.trim(), when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
      var updated = Object.assign({}, helpHistory); updated[activeTab] = [].concat(updated[activeTab] || [], [entry]).slice(-30);
      setHelpHistory(updated);
      try { await sSet("help_history", JSON.stringify(updated)); } catch(se) {}
      if (el) el.value = "";
    } catch(err) {
      setHelpMsg(window.isEnergyEmpty(err) ? window.energyEmptyMsg : "Error: " + String(err.message || err).substring(0, 120));
    }
    setHelpLoading(false);
  };

  // ─── ASK QUESTION ───
  const askQuestion = async () => {
    var el = document.getElementById("qa-input-" + activeTab);
    var question = el ? el.value.trim() : "";
    if (!question) { setQaMsg("Type a question first"); setTimeout(function() { setQaMsg(""); }, 2000); return; }
    if (qaLoading) return;
    setQaLoading(true);
    setQaMsg("Sending question...");
    try {
      var prof = p.profile || {};
      var who = (prof.name || activeTab) + " (" + (prof.sex || "") + ", " + (calcAge(prof.dob) || prof.age || "") + ")";
      var mealCtx = "", healthCtx = "", bloodCtx = "", medsCtx = "", qaActCtx = "";
      try { var mr = await sGet(sk); if (mr) { var mp = JSON.parse(mr); var parts = []; for (var di = 0; di < MEAL_DAYS.length; di++) { var dd = MEAL_DAYS[di]; var entry = mp[dd.key]; var isO = entry && typeof entry === "object"; var din = isO ? entry.d : entry; var ml = null; for (var mi = 0; mi < allDinners.length; mi++) { if (allDinners[mi].id === din) { ml = allDinners[mi]; break; } } var dn = isO && entry._note ? entry._note : ""; parts.push(dd.label + ": " + (ml ? ml.name : "none") + (dn ? " (" + dn + ")" : "")); } mealCtx = "\nMeals: " + parts.join(", "); } } catch(me) {}
      if (Array.isArray(p.healthLog) && p.healthLog.length > 0) { var hp = []; for (var hi = Math.max(0, p.healthLog.length - 5); hi < p.healthLog.length; hi++) hp.push(p.healthLog[hi].date + ": " + p.healthLog[hi].note); healthCtx = "\nHealth: " + hp.join("; "); }
      if (p.bloods && p.bloods.length > 0) { var lat = p.bloods[p.bloods.length - 1]; var bp = []; var bk = Object.keys(lat.tests); for (var bi = 0; bi < bk.length; bi++) bp.push(bk[bi] + "=" + lat.tests[bk[bi]]); bloodCtx = "\nBloods: " + bp.join(", "); }
      if (p.meds && p.meds.length > 0) { var mp2 = []; for (var mmi = 0; mmi < p.meds.length; mmi++) { if (p.meds[mmi].active) mp2.push(p.meds[mmi].name + " " + (p.meds[mmi].dosage || "")); } medsCtx = "\nMeds: " + mp2.join(", "); }
      if (p.activity && p.activity.length > 0) { qaActCtx = "\nActivity: " + p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", "); }
      var attCtx = "";
      if (p.attachments && p.attachments.length > 0) { var ap = []; for (var ai = 0; ai < p.attachments.length; ai++) { if (p.attachments[ai].extracted) ap.push(p.attachments[ai].extracted.substring(0, 200)); } if (ap.length > 0) attCtx = "\nDocuments: " + ap.join("; "); }
      var photoCtx2 = "";
      if (p.bodyAnalysis) photoCtx2 += " Body assessment: " + JSON.stringify(p.bodyAnalysis);
      if (p.progressPhotos && p.progressPhotos.length > 0) { var rp = p.progressPhotos.slice(-3); var rpd = []; for (var rpi = 0; rpi < rp.length; rpi++) { if (rp[rpi].analysis) rpd.push("Wk" + rp[rpi].week + ": " + rp[rpi].analysis); } if (rpd.length > 0) photoCtx2 += " Progress: " + rpd.join("; "); }
      var prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend supporting " + who + ". Imagine they've just messaged you with a question — reply like a mate who genuinely knows their stuff in this area, not like a search engine. Be warm, direct, and specific to THEIR situation using the data you have about them.\n\n"+TONE_RULES+getMoodContext(userMood)+"\n\nTHEIR DATA:\nExercises: " + JSON.stringify(Object.keys(p.exercises).map(function(d) { return d + ": " + p.exercises[d].map(function(e) { return e.name + " " + e.current + " " + e.reps + " (" + e.status + ")"; }).join(", "); })) + "\nBody: " + JSON.stringify(p.body) + "\nMeasurements: " + JSON.stringify(p.measurements) + mealCtx + healthCtx + bloodCtx + medsCtx + qaActCtx + attCtx + photoCtx2 + getOnboardingCtx(activeTab) + getCrossSectionCtx(activeTab, "qa") + "\n\nQuestion: " + question + "\n\nAnswer in 2-4 clear sentences. Be specific with actual numbers from their data. Speak directly to them using 'you' and 'your'. If relevant, connect your answer to their overall programme context.";
      var response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "Ask API", status: response.status, statusText: response.statusText }].concat(prev).slice(0, 20); });
      var result = await response.json();
      if (debugMode) setDebugLog(function(prev) { return [{ time: new Date().toLocaleTimeString(), action: "Ask Response", data: JSON.stringify(result).substring(0, 500) }].concat(prev).slice(0, 20); });
      var apiErr2 = handleApiError(result);
      if (apiErr2) { setQaMsg(apiErr2); setQaLoading(false); return; }
      var answer = "";
      if (result.content) {
        for (var i = 0; i < result.content.length; i++) {
          if (result.content[i].text) answer = answer + result.content[i].text;
        }
      }
      if (!answer && result.error) answer = "API Error: " + (result.error.message || JSON.stringify(result.error));
      if (!answer) answer = "No answer received. Response: " + JSON.stringify(result).substring(0, 300);
      var qaEntry = { q: question, a: answer, when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
      var updated = Object.assign({}, qaHistory);
      if (!updated[activeTab]) updated[activeTab] = [];
      updated[activeTab] = [].concat(updated[activeTab], [qaEntry]).slice(-20);
      setQaHistory(updated);
      try { await sSet("qa_history", JSON.stringify(updated)); } catch(se) {}
      if (el) el.value = "";
      setQaMsg("");
    } catch(err) {
      setQaMsg("Error: " + String(err).substring(0, 100));
    }
    setQaLoading(false);
  };

  // ─── IMAGE UPLOAD ───
  const handleFitdaysImage = async (e) => { const file = e.target.files?.[0]; if (!file) return; setImgParsing(true); try { const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(new Error("fail")); r.readAsDataURL(file); }); const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: 'Extract body comp values from this Fitdays screenshot. Return ONLY JSON. WEIGHT: The Fitdays screen shows weight as stones and pounds like 14 6.8 meaning 14st 6.8lb. Return the EXACT raw value as shown combining stones and pounds with a dot: 14st 6.8lb becomes 14.68, 14st 4.9lb becomes 14.49, 15st 0.3lb becomes 15.03. Do NOT convert or calculate - just read the digits and combine them. All other values as numbers exactly as shown on screen: {"weight":"14.579","bodyFat":"25.8","muscleMass":"","muscleRate":"","skeletalMuscle":"","visceralFat":"","subcutFat":"","bmr":"","bodyWater":"","boneMass":"","bodyAge":"","bmi":""}. Empty string for unreadable values.' }] }] }) }); const result = await response.json(); var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join(""); setBodyInputs(prev => ({ ...prev, ...JSON.parse(text.replace(/```json|```/g, "").trim()) })); setShowBodyForm(true); setFormMsg("✓ Values extracted — review and save"); setTimeout(() => setFormMsg(""), 5000); } catch(err2) { setFormMsg("Error: " + String(err2).substring(0, 100)); setTimeout(function() { setFormMsg(""); }, 8000); } setImgParsing(false); if (fileRef.current) fileRef.current.value = ""; };

  // ─── ADMIN IMPORT ───
  const doImport = async () => { try { const parsed = JSON.parse(importText); const merged = JSON.parse(JSON.stringify(data)); if (parsed.config) merged.config = { ...merged.config, ...parsed.config }; if (parsed.jc) { if (parsed.jc.body) merged.jc = { ...merged.jc, body: { ...merged.jc.body, ...parsed.jc.body } }; if (parsed.jc.exercises) merged.jc = { ...merged.jc, exercises: parsed.jc.exercises }; if (parsed.jc.measurements) merged.jc = { ...merged.jc, measurements: { ...merged.jc.measurements, ...parsed.jc.measurements } }; } if (parsed.becks) { if (parsed.becks.body) merged.becks = { ...merged.becks, body: { ...merged.becks.body, ...parsed.becks.body } }; if (parsed.becks.exercises) merged.becks = { ...merged.becks, exercises: parsed.becks.exercises }; if (parsed.becks.measurements) merged.becks = { ...merged.becks, measurements: { ...merged.becks.measurements, ...parsed.becks.measurements } }; } await saveData(merged); setImportMsg("✓ Data updated"); setImportText(""); setTimeout(() => setImportMsg(""), 3000); } catch (e) { setImportMsg("✗ Invalid JSON: " + e.message); } };

  if (loading || !data) return <LoadingScreen />;

  // Dev/test only (removed from builds): the selected person's loaded state, so tests can check
  // that nothing from a previously selected person is shown (tests/person-race.spec.js).
  if (import.meta.env.DEV) window.__lcPerson = { activeTab, userColour, userMood, dailyMood, journalEntries, mealTracking, portionOverrides, googleConnected };

  const isJC = activeTab === "jc";
  const isAdmin = activeTab === "jc";
  const p = isJC ? data.jc : data.becks;
  const personKeys = Object.keys(data).filter(k => k !== "config");
  const personIdx = personKeys.indexOf(activeTab);
  const accentCols = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#e11d48"];
  const defaultAccent = accentCols[personIdx >= 0 ? personIdx % accentCols.length : 0];
  const defaultAccentLight = isJC ? "#dbeafe" : "#ede9fe";
  const userTheme = userColour && COLOUR_THEMES[userColour] ? COLOUR_THEMES[userColour] : null;
  const accent = userTheme ? userTheme.accent : defaultAccent;
  const accentLight = userTheme ? userTheme.light : defaultAccentLight;
  const accentDark = accentVariant(accent, 25);
  const accentMid = (function() { var hsl = hexToHsl(accent); return hslToHex(hsl[0], Math.min(hsl[1], 30), 40); })();
  const accentBtnLight = accentVariant(accent, 93);
  const accentBtnBorder = accentVariant(accent, 80);
  const accentChatUser = accentVariant(accent, 88);
  /* Per-person settings — shared by the top name tabs and the switch inside the exercise log */
  const loadUserSettings = function(k) { activeTabRef.current = k; var stale = function() { return activeTabRef.current !== k; }; /* v2.5.1 */ if (bodyFbAll[k]) setBodyFeedback(bodyFbAll[k]); else setBodyFeedback(null); if (healthFbAll[k]) setHealthFb(healthFbAll[k]); else setHealthFb(null); if (measFbAll[k]) setMeasFeedback(measFbAll[k]); else setMeasFeedback(null); sGet("meal_tracking:" + k).then(function(mt) { if (stale()) return; if (mt) setMealTracking(JSON.parse(mt)); else setMealTracking({}); }); sGet("user_mood_" + k).then(function(m) { if (stale()) return; if (m) setUserMood(JSON.parse(m)); else setUserMood(null); }); sGet("journal_" + k).then(function(j) { if (stale()) return; if (j) setJournalEntries(JSON.parse(j)); else setJournalEntries([]); }); sGet("daily_mood_" + k).then(function(dm) { if (stale()) return; if (dm) { var parsed = JSON.parse(dm); var todayStr = new Date().toISOString().split("T")[0]; if (parsed && parsed.date === todayStr) setDailyMood(parsed); else setDailyMood(null); } else setDailyMood(null); }); sGet("wellbeing_flags_" + k).then(function(wf) { if (stale()) return; if (wf) setWellbeingFlags(JSON.parse(wf)); else setWellbeingFlags({}); }); sGet("user_colour_" + k).then(function(uc) { if (stale()) return; if (uc) setUserColour(uc); else setUserColour(null); }); sGet("portion_overrides:" + k).then(function(po) { if (stale()) return; setPortionOverrides(po ? JSON.parse(po) : {}); }); sGet("google_token_" + k).then(function(gt) { if (stale()) return; if (gt) { setGoogleToken(gt); setGoogleConnected(true); } else { setGoogleToken(null); setGoogleConnected(false); } }); };
  const accentBorder = accentVariant(accent, 78);
  const btnST = Object.assign({}, btnS, { background: accentBtnLight, border: "1px solid " + accentBtnBorder });
  const btnMT = Object.assign({}, btnMuted, { background: accentBtnLight, border: "1px solid " + accentBtnBorder });
  const stats = countStatus(p.exercises);
  const allDinners = [...DINNERS, ...customMeals];
  const shopItems = {}; MEAL_DAYS.forEach(d => { var _dk = DAY_MAP[d.key] || d.key; var _dm = meals[_dk] || {}; var _did = typeof _dm === "object" ? _dm.d : _dm; const m = allDinners.find(x => x.id === _did); if (m) m.shop?.forEach(it => { shopItems[it] = (shopItems[it] || 0) + 1; }); });
  const shopList = Object.entries(shopItems).sort((a, b) => a[0].localeCompare(b[0]));
  const planned = MEAL_DAYS.filter(d => meals[DAY_MAP[d.key] || d.key]).length;
  const SECS = [{ id: "overview", l: "Home" }, { id: "body", l: "My Body" }, { id: "weights", l: "My Exercise" }, { id: "meals", l: "My Eating" }, { id: "shop", l: "My Shop" }, { id: "bloods", l: "My Health" }];
  const wt = p.body.weight || [];
  const latestWt = wt.length > 0 ? wt[wt.length - 1] : null;
  const idealSt = isJC ? IDEALS.jc : IDEALS.becks;
  const latestStVal = latestWt ? latestWt.v : null;
  const toIdeal = latestStVal ? ((latestStVal - idealSt) * 14).toFixed(1) : null;
  const wtStone = latestStVal ? Math.floor(latestStVal) : "—";
  const wtLbs = latestStVal ? ((latestStVal - Math.floor(latestStVal)) * 10).toFixed(1) : "";
  const wtStr = latestStVal ? wtStone + "st " + wtLbs + "lb" : "—";
  const firstWtVal = wt.length > 0 ? wt[0].v : null;
  const wtDelta = (firstWtVal && latestStVal) ? (((latestStVal - firstWtVal) * 14).toFixed(1) + "lb from baseline") : "";
  const wtSign = (firstWtVal && latestStVal && latestStVal < firstWtVal) ? "-" : "+";

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "20px 16px 16px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", overflow: "hidden", flexShrink: 0 }}>
              <img src={import.meta.env.BASE_URL + "brand/header-mark-288.png"} alt="Lifecare Companion logo" width="44" height="44" style={{ display: "block", width: 44, height: 44 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Lifecare Companion™</div>
              <div data-testid="header-title" style={{ fontSize: 22, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{personName(data, activeTab)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <button onClick={() => setHelpOpen(true)} style={{ background: helpOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0 10px", height: 38, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#cbd5e1", fontSize: 13, fontWeight: 600, transition: "all 0.2s ease", marginTop: 2 }} title="Help using the app" aria-label="Help using the app">Help <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #94a3b8", fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>?</span></button>
              <button onClick={() => { setSection("admin"); setShowOnboarding(false); setSetupTab("profile"); }} style={{ background: section === "admin" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", marginTop: 2 }} title="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
          </div>
          <EnvBadge />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Week {calcWeek(data.config.trainingStart)} · Updated {data.config.lastUpdate}{saving ? " · Saving..." : ""}</div>
        <div style={{ display: "flex", gap: 4, marginTop: 14, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
          <PersonTabs testId="person-tabs" people={peopleOf(data)} activeKey={activeTab}
            tabStyle={{ padding: "10px 12px", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}
            activeStyle={{ background: "rgba(255,255,255,0.95)", color: "#0f172a", letterSpacing: "0.02em" }} inactiveStyle={{ background: "transparent", color: "rgba(255,255,255,0.45)", letterSpacing: "0" }}
            onSelect={(k) => {
              // D1: a Log Exercise form belongs to the person it was opened for. Switching person here asks
              // first and closes the form cleanly; never a form showing one person's entries for another.
              if (logEx && k !== activeTab) {
                if (!window.confirm("Discard " + personName(data, activeTab) + "'s unsaved log entries and switch to " + personName(data, k) + "?")) return;
                setLogEx(null); setSelectedEx(null); setLogNeedChoice(""); window._dualLogState = null;
              }
              setActiveTab(k); setEatDayEyeOpen(false); setEatDayChartOpen(false); setEatWeekEyeOpen(false); setCopyDayOpen(false); setCopyWeekOpen(false); setHomeFbExpanded(false); setFbExpanded(false); setEatFbExpanded(false); setHealthFbExpanded(false); setBodyFbExpanded(false); setMeasFbExpanded2(false); loadUserSettings(k); setJournalText(""); setShowRecentJournal(false); setShowFullJournal(false); }} />
          {ALLOW_ADD_PERSON && (<button onClick={() => setShowAddPerson(true)} style={{ padding: "10px 12px", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.3)", transition: "all 0.2s ease" }}>+</button>)}
        </div>
        {showAddPerson && (<div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Name..." style={{ flex: 1, padding: "8px 10px", border: "1px solid #475569", borderRadius: 8, fontSize: 13, background: "#1e293b", color: "#fff" }} />
          <button onClick={async () => { if (!newPersonName.trim()) return; const key = newPersonName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_"); const nd = JSON.parse(JSON.stringify(data)); nd[key] = { profile: { name: newPersonName.trim(), age: "", sex: "", height: "", bodyType: "", fibreType: "", idealWeight: "", notes: "" }, meds: [], medsHistory: [], body: { weight: [], bodyFat: [], muscleMass: [], muscleRate: [], skeletalMuscle: [], visceralFat: [], subcutFat: [], bmr: [], bodyWater: [], boneMass: [], bodyAge: [], bmi: [] }, measurements: { bicep: [], forearm: [], calf: [], quad: [], chest: [], waist: [], shoulders: [] }, bloods: [], exercises: { sunday: [], monday: [], friday: [] } }; await saveData(nd); setActiveTab(key); setSection("overview"); setShowAddPerson(false); setNewPersonName(""); setFormMsg("✓ " + newPersonName.trim() + " added"); setTimeout(() => setFormMsg(""), 3000); }} style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
          <button onClick={() => setShowAddPerson(false)} style={{ padding: "8px 10px", background: "transparent", color: "#64748b", border: "1px solid #475569", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
        </div>)}
      </div>
      <div style={{ display: "flex", gap: 0, padding: "0 4px", background: "#fff", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
        {SECS.map(s => (<button key={s.id} onClick={() => { setSection(s.id); setShowOnboarding(false); setSetupTab("profile"); setFbExpanded(false); setEatFbExpanded(false); setHomeFbExpanded(false); setHealthFbExpanded(false); setLogEx(null); setSelectedEx(null); setBodyView("data"); setShowBodyForm(false); setBodyMetricOpen(null); setMeasMetricOpen(null); setMeasLogKey(null); setEditMeasKey(null); setAddMeasOpen(false); setWarmUpOpen(false); setCoolDownOpen(false); setShowRecentJournal(false); setShowFullJournal(false); setHealthView("general"); }} style={{ padding: "10px 8px", border: "none", borderBottom: section === s.id ? "2.5px solid " + accent : "2.5px solid transparent", background: "none", fontSize: 11, fontWeight: section === s.id ? 700 : 500, color: section === s.id ? accent : "#64748b", cursor: "pointer", whiteSpace: "nowrap" }}>{s.l}</button>))}
      </div>
      {formMsg && <div style={{ margin: "8px 16px 0", padding: 10, borderRadius: 8, background: formMsg.startsWith("✓") ? "#e0f2fe" : "#fee2e2", color: formMsg.startsWith("✓") ? "#0c4a6e" : "#991b1b", fontSize: 12, fontWeight: 600 }}>{formMsg}</div>}

      <div style={{ padding: 16 }}>
        {/* HOME */}
        {section === "overview" && (<ErrorBoundary name="Home"><HomeSection ctx={{ accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, assessment, assessmentExpanded, btnMT, calcAge, checkCompanionEnergy, companionEnergy, customBreakfasts, customDesserts, customDrinks, customLunches, customMeals, customSnacks, dailyMood, data, energyLoading, feedbackHistory, feedbackLoading, feedbackResults, genPlanLoading, generateFeedback, generatedTargets, getCrossSectionCtx, homeFbExpanded, isJC, journalEntries, journalText, meals, onboardInputs, p, profileInputs, renderThread, saveData, setAssessment, setAssessmentExpanded, setDailyMood, setEatDay, setExerciseDay, setFormMsg, setGenPlanLoading, setGeneratedTargets, setHomeFbExpanded, setJournalEntries, setJournalText, setOnboardInputs, setProfileInputs, setSection, setSetupDirty, setSetupTab, setShowFbHistory, setShowFullJournal, setShowMyDay, setShowOnboarding, setShowProfile, setShowRecentJournal, setUserMood, setupDirty, setupTab, showFbHistory, showFullJournal, showMyDay, showOnboarding, showProfile, showRecentJournal, updateHomeFb, userMood }} /></ErrorBoundary>)}

        {/* BODY */}
        {section === "body" && (<ErrorBoundary name="Body"><BodySection ctx={{ accent, accentBorder, accentLight, accentMid, activeTab, addMeasName, addMeasOpen, bodyFbAll, bodyFbExpanded, bodyFbLoading, bodyFeedback, bodyInputs, bodyMetricOpen, bodyMetricShowAll, bodyView, btnST, data, editMeasKey, editMeasName, getCrossSectionCtx, getOnboardingCtx, idealSt, isJC, measFbAll, measFbExpanded2, measFbLoading, measFeedback, measLogInputs, measLogKey, measMetricOpen, measMetricShowAll, p, renderThread, saveBodyComp, saveData, setAddMeasName, setAddMeasOpen, setBodyFbExpanded, setBodyFbLoading, setBodyFeedback, setBodyInputs, setBodyMetricOpen, setBodyMetricShowAll, setBodyView, setEditMeasKey, setEditMeasName, setFormMsg, setMeasFbExpanded2, setMeasFbLoading, setMeasFeedback, setMeasLogInputs, setMeasLogKey, setMeasMetricOpen, setMeasMetricShowAll, setShowBodyForm, showBodyForm, updateBodyFb, updateMeasFb, userMood, weekLabel, wt, wtDelta, wtSign, wtStr }} /></ErrorBoundary>)}

        {/* WEIGHTS */}
        {section === "weights" && <ErrorBoundary name="Exercise"><ExerciseSection ctx={{ accent, accentBorder, accentLight, accentMid, activeTab, addExConfirm, addExLoading, addExOpen, addExSearch, btnST, coolDownOpen, customExercises, data, dayView, decisionsExpanded, editExercise, editPrev, exInfoOpen, exerciseDay, fbExpanded, getCrossSectionCtx, getOnboardingCtx, isJC, loadUserSettings, logComment, logEx, logFormRef, logFullRange, logGoodForm, logOverride, logSets, logWeek, newExName, openLogForm, p, prevComment, renderThread, saveData, saveLog, selectedEx, sessionFbLoading, sessionFeedback, sessionGuideLoading, setActiveTab, setAddExConfirm, setAddExLoading, setAddExOpen, setAddExSearch, setCoolDownOpen, setCustomExercises, setDayView, setDecisionsExpanded, setEditExercise, setEditPrev, setExInfoOpen, setExerciseDay, setFbExpanded, setFormMsg, setLogComment, setLogEx, setLogFullRange, setLogGoodForm, setLogOverride, setLogSets, setLogWeek, setNewExName, setNewSectionName, setSelectedEx, setSessionFbLoading, setSessionFeedback, setSessionGuideLoading, setShowNewExForm, setShowNewSection, setStoppedExOpen, setWarmUpOpen, stoppedExOpen, updateSessionFb, userMood, warmUpOpen, weekLabel , logNeedChoice, setLogNeedChoice}} /></ErrorBoundary>}

        {/* MEDS */}

        {/* MEALS */}
        {section === "meals" && <ErrorBoundary name="Eating"><EatingSection ctx={{ accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, addingCategory, addingNew, addingSlotDay, addingSlotKey, addingSource, baseStart, bulkReviewItems, calcRAG, cameraPreview, copyDayOpen, copyDayTargets, copyWeekOpen, copyWeekTargets, customBreakfasts, customDesserts, customDrinks, customLunches, customMeals, customSnacks, data, defScopes, eatDay, eatDayEyeOpen, eatFbExpanded, eatFbLoading, eatFbResults, eatWeekEyeOpen, editDraft, editingItem, formMsg, generateEatFeedback, generateWeekEatFeedback, generating, helpEatCat, helpEatLoading, helpEatResult, helpEatText, isJC, manageListsOpen, mealDefaults, mealTracking, meals, newItemLoading, newItemName, offLoading, offResults, openAddForm, p, pastWeeksMeals, portionLoading, portionOverrides, portionPlanned, portionResult, portionSlot, quickPrepMins, ragRecalcLoading, ragRecalcMsg, recalculateAllRag, renderThread, reviewCategories, reviewSideType, saveMeals, searchOFF, setAddingCategory, setAddingNew, setAddingSlotDay, setAddingSlotKey, setBulkReviewItems, setCameraPreview, setCopyDayOpen, setCopyDayTargets, setCopyWeekOpen, setCopyWeekTargets, setCustomBreakfasts, setCustomDesserts, setCustomDrinks, setCustomLunches, setCustomMeals, setCustomSnacks, setDefScopes, setEatDay, setEatDayChartOpen, setEatDayEyeOpen, setEatFbExpanded, setEatWeekEyeOpen, setEditDraft, setEditingItem, setFormMsg, setGenerating, setHelpEatCat, setHelpEatLoading, setHelpEatResult, setHelpEatText, setManageListsOpen, setMealDefaults, setMealTracking, setMeals, setNewItemLoading, setNewItemName, setOffResults, setOffSearchTerm, setPortionLoading, setPortionOverrides, setPortionPlanned, setPortionResult, setPortionSlot, setQuickPrepMins, setRagRecalcMsg, setReviewCategories, setReviewSideType, setSaving, setWeekOff, updateEatDayFb, updateEatWeekFb, weekLabel, weekOff, weekStart }} /></ErrorBoundary>}

        {section === "shop" && (<ErrorBoundary name="Shop"><ShopSection ctx={{ accentBorder, accentBtnBorder, accentBtnLight, accentLight, activeTab, customBreakfasts, customDesserts, customDrinks, customLunches, customMeals, customSnacks, data, editHealthText, editingHealthLog, foodCheckerCategory, foodCheckerLoading, foodCheckerPreview, foodCheckerText, generatedShop, planned, setCustomBreakfasts, setCustomLunches, setCustomMeals, setCustomSnacks, setEditHealthText, setEditingHealthLog, setFoodCheckerCategory, setFoodCheckerLoading, setFoodCheckerPreview, setFoodCheckerText, setFormMsg, setGeneratedShop, setShopDefaults, setShopLoading, setSupermarket, setWeekOff, shopDefaults, shopList, shopLoading, supermarket, weekLabel, weekStart }} /></ErrorBoundary>)}

        {/* TARGETS */}
        {/* ADMIN */}
        
        {/* HEALTH */}
        {section === "bloods" && <ErrorBoundary name="Health"><HealthSection ctx={{ accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, bloodInputs, customBloodTests, customMedNames, data, editHealthText, editMedIdx, editingHealthLog, getCrossSectionCtx, getOnboardingCtx, healthComment, healthFb, healthFbAll, healthFbExpanded, healthFbLoading, healthView, isJC, medInputs, p, saveData, setBloodInputs, setCustomMedNames, setEditHealthText, setEditMedIdx, setEditingHealthLog, setFormMsg, setHealthComment, setHealthFb, setHealthFbExpanded, setHealthFbLoading, setHealthView, setMedInputs, setShowBloodForm, setShowBloodResults, setShowMedForm, setVitalsInput, setWeekOff, showBloodForm, showBloodResults, showMedForm, userMood, vitalsInput, weekLabel }} /></ErrorBoundary>}

{section === "admin" && (<ErrorBoundary name="Settings"><SettingsSection ctx={{ accentBtnLight, activeTab, companionEnergy, connectGoogle, customMeasTypes, debugLog, debugMode, googleConnected, isAdmin, isJC, measInputs, setCustomMeasTypes, setDebugLog, setDebugMode, setFormMsg, setGoogleConnected, setGoogleToken, setMeasInputs, setUserColour, syncGoogleHealth, syncLoading, userColour , setSection}} /></ErrorBoundary>)}

{section === "data" && isAdmin && (<ErrorBoundary name="Data"><DataSection ctx={{ accent, accentBorder, accentLight, data, dataExpandEx, saveData, setDataExpandEx, setFormMsg, setSection }} /></ErrorBoundary>)}

      </div>

      {/* Feedback Button and Form */}
      <ErrorBoundary name="FeedbackForm"><FeedbackForm ctx={{ activeTab, feedbackOpen, feedbackSending, feedbackSent, feedbackText, feedbackType, setFeedbackOpen, setFeedbackSending, setFeedbackSent, setFeedbackText, setFeedbackType }} /></ErrorBoundary>

      {/* Legal links row */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "6px 16px 2px" }}>
        <button onClick={function(){ setShowPrivacy(true); }} style={{ background: "none", border: "none", fontSize: 9, color: "#94a3b8", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Privacy Policy</button>
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, padding: "12px 16px 4px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>Lifecare Companion™ · Created by Companion Apps Studio™</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>© Jan-Christian Zaluski 2026</div></div>

      {/* Privacy Policy overlay */}
      <ErrorBoundary name="PrivacyPolicy"><PrivacyPolicy ctx={{ accent, setShowPrivacy, showPrivacy }} /></ErrorBoundary>
      <div style={{ textAlign: "center", fontSize: 9, color: "#cbd5e1", paddingBottom: 12 }}>{APP_VERSION}
      </div>

      {/* Floating Ask a Question button */}
      
      {!qaOpen && !helpOpen && <button onClick={() => setQaOpen(true)} style={{ position: "fixed", bottom: 24, right: 20, width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(30,58,95,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} title="Chat with your Companion" aria-label="Chat with your Companion"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.7-.8L3 21l1.9-5.1A8.3 8.3 0 0 1 3.5 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/><circle cx="8.5" cy="11.5" r="0.6" fill="#fff"/><circle cx="12" cy="11.5" r="0.6" fill="#fff"/><circle cx="15.5" cy="11.5" r="0.6" fill="#fff"/></svg></button>}

      {/* Ask a Question overlay panel */}
      <ErrorBoundary name="HelpPanel"><HelpPanel ctx={{ accentBorder, accentChatUser, activeTab, askHelp, helpHistory, helpLoading, helpMsg, helpOpen, setHelpOpen, setShowHelpHistory, showHelpHistory }} /></ErrorBoundary>
      <ErrorBoundary name="ChatPanel"><ChatPanel ctx={{ accentBorder, accentChatUser, activeTab, askQuestion, qaHistory, qaLoading, qaMsg, qaOpen, setQaOpen, setShowQaHistory, showQaHistory }} /></ErrorBoundary>

      {/* Global review overlay — for day view add forms when manage lists is closed */}
      <ErrorBoundary name="ReviewItemOverlay"><ReviewItemOverlay ctx={{ accentBtnBorder, accentBtnLight, cameraPreview, formMsg, manageListsOpen, reviewCategories, reviewSideType, section, setAddingSlotDay, setAddingSlotKey, setCameraPreview, setFormMsg, setReviewCategories, setReviewSideType }} /></ErrorBoundary>

    </div>
  );
}

export default Dashboard;
