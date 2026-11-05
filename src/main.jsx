import React from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AuthGate from "./components/AuthGate.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary name="App"><AuthGate><Dashboard /></AuthGate></ErrorBoundary>);

// Installable app: register the network-only service worker (builds only, never the dev server).
if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL })
      .catch((e) => console.warn("Lifecare Companion: service worker not registered", e));
  });
}
