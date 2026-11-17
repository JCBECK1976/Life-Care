import { installNativeBackButton } from "./lib/native.js";
import { installFieldHelpers } from "./lib/a11y.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AuthGate from "./components/AuthGate.jsx";
import { startPlan } from "./lib/myPlan.js";
import { PlanGateHost, PreviewBar } from "./components/PlanGate.jsx";

installFieldHelpers();   // v2.20.0: numeric keypad, select-all on focus, haptic tap
installNativeBackButton();   // v2.21.0: Android Back closes dialogs
startPlan();   // v2.22.0: the signed-in person's plan (flag useTiers; all on when off)
ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary name="App"><AuthGate><Dashboard /><PlanGateHost /><PreviewBar /></AuthGate></ErrorBoundary>);

// Installable app: register the network-only service worker (builds only, never the dev server).
if ("serviceWorker" in navigator && !import.meta.env.DEV && !import.meta.env.VITE_NATIVE) {   // v2.21.0: no service worker inside the native app
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL })
      .catch((e) => console.warn("Lifecare Companion: service worker not registered", e));
  });
}
