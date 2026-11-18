import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/auth";

// Firebase Config (unchanged from the legacy index.html)
firebase.initializeApp({
  apiKey: "AIzaSyDnNHlqyEg3IVxYo9M6Z_pfn5ABMp7Jbt4",
  authDomain: "life-care-app-64d04.firebaseapp.com",
  databaseURL: "https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "life-care-app-64d04",
  storageBucket: "life-care-app-64d04.firebasestorage.app",
  messagingSenderId: "464885753789",
  appId: "1:464885753789:web:09e82dc4b61f39577054d4"
});

// Dev server and tests only: use the local Firebase emulator, never live data.
// import.meta.env.DEV is false in every build, so this is removed from production.
// v2.6.0: Google sign-in. Users stay signed in on the device (local persistence, the default).
export const auth = firebase.auth();

/* v2.26.0: App Check (web: reCAPTCHA Enterprise). Off until JC creates the site key (GO_LIVE_CHECKLIST C) and the
   build gets VITE_APPCHECK_SITE_KEY; the server only ENFORCES it when ENFORCE_APP_CHECK=true. The Android app's Play
   Integrity provider needs a native plugin (open item), so enforcement waits until that is in place too. */
if (!import.meta.env.DEV && import.meta.env.VITE_APPCHECK_SITE_KEY) {
  import("firebase/compat/app-check").then(function() {
    try { firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(import.meta.env.VITE_APPCHECK_SITE_KEY), true); } catch (e) { /* not blocking: the server decides */ }
  });
}

if (import.meta.env.DEV) {
  firebase.database().useEmulator("127.0.0.1", 9000);
  auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
  // Tests sign in as a fake emulator user (dev server only; removed from builds).
  window.__lcTestSignIn = (email, password) => auth.signInWithEmailAndPassword(email, password).then(() => true);
}

// Where the app's data lives in Firebase. Set per environment by the deploy workflow:
// "data" for prod and beta, "data_build" for build. Defaults to "data".
export const SHARED_ROOT = import.meta.env.VITE_DATA_ROOT || "data";
/* v2.25.0 (Step 5, flag useAccounts): a LIVE binding — the shared joint account keeps SHARED_ROOT; an individual account
   reads and writes only its own store, apps/lifecare/users/{uid}/store (lib/accounts.js switches it at sign-in, before
   any data is read). Every module that imports DATA_ROOT sees the switch. */
export let DATA_ROOT = SHARED_ROOT;
export function setDataRoot(root) { DATA_ROOT = root || SHARED_ROOT; }

// Global API key holder
window._anthropicKey = "";

export default firebase;
