import firebase from "firebase/compat/app";
import "firebase/compat/database";

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
if (import.meta.env.DEV) {
  firebase.database().useEmulator("127.0.0.1", 9000);
}

// Where the app's data lives in Firebase. Set per environment by the deploy workflow:
// "data" for prod and beta, "data_build" for build. Defaults to "data".
export const DATA_ROOT = import.meta.env.VITE_DATA_ROOT || "data";

// Global API key holder
window._anthropicKey = "";

export default firebase;
