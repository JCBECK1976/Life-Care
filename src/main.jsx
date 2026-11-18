import { installNativeBackButton } from "./lib/native.js";
import { installFieldHelpers } from "./lib/a11y.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AuthGate from "./components/AuthGate.jsx";
import { startPlan } from "./lib/myPlan.js";
import { loadRemoteFlags } from "./lib/platform.js";
import firebase from "./lib/firebase.js";
import { PlanGateHost, PreviewBar } from "./components/PlanGate.jsx";
import Onboarding from "./components/Onboarding.jsx";
import InviteScreen from "./components/InviteScreen.jsx";
import { captureInvite } from "./lib/accounts.js";

installFieldHelpers();   // v2.20.0: numeric keypad, select-all on focus, haptic tap
installNativeBackButton();   // v2.21.0: Android Back closes dialogs
/* v2.27.0: read the go-live switches first (max 3 s), then start */
loadRemoteFlags(firebase.database()).then(function() {
  captureInvite();   // v2.25.0: ?join= / ?pilot= links survive the sign-in
  startPlan();
  ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary name="App"><AuthGate><Dashboard /><PlanGateHost /><PreviewBar /><InviteScreen /><Onboarding /></AuthGate></ErrorBoundary>);
});

// Installable app: register the network-only service worker (builds only, never the dev server).
if ("serviceWorker" in navigator && !import.meta.env.DEV && !import.meta.env.VITE_NATIVE) {   // v2.21.0: no service worker inside the native app
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL })
      .catch((e) => console.warn("Lifecare Companion: service worker not registered", e));
  });
}
