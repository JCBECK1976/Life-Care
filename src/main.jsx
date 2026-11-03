import React from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary name="App"><Dashboard /></ErrorBoundary>);
