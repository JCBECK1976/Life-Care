// The app version. Change APP_VERSION_BASE only: feature/layout = v2.X.0, bug fix = v2.X.Y.
export const APP_VERSION_BASE = "v2.1.1";

// Which environment this build is for, set by the deploy workflow: "build", "beta" or "prod".
export const APP_ENV = import.meta.env.VITE_APP_ENV || "prod";

// Shown in the footer and the feedback email:
// prod v2.1.0 · beta v2.1.0-beta.N · build v2.1.0-build.<short commit>
export const APP_VERSION =
  APP_ENV === "beta" ? APP_VERSION_BASE + "-beta." + (import.meta.env.VITE_BETA_N || "0") :
  APP_ENV === "build" ? APP_VERSION_BASE + "-build." + (import.meta.env.VITE_BUILD_SHA || "local") :
  APP_VERSION_BASE;
