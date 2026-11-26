// v2.21.0 (N1, Android via Google Play internal testing): the web app runs inside a Capacitor shell.
// Everything here is a no-op on the web. Plugins are loaded only inside the native app.
import { Capacitor } from "@capacitor/core";

/** v2.29.0: "ios" | "android" | "web" */
export function platform() { try { return Capacitor.getPlatform(); } catch (e) { return "web"; } }
export function isNative() { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } }

// Google blocks its sign-in page inside app WebViews, so the native app signs in with Android's own Google account picker
// (Credential Manager) and hands the ID token to Firebase. Needs the app's SHA-1 fingerprints in Firebase (J steps).
var ready = null;
async function social() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  /* v2.29.0: on iPhone Google also needs the iOS client ID (J15); Apple sign-in is native there (no extra settings). */
  if (!ready) ready = SocialLogin.initialize(Object.assign({ google: { webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID, iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || undefined, mode: "online" } }, platform() === "ios" ? { apple: {} } : {}));
  await ready;
  return SocialLogin;
}
export async function nativeGoogleSignIn(firebase, auth) {
  const SocialLogin = await social();
  const r = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
  const idToken = r && r.result && (r.result.idToken || (r.result.credential && r.result.credential.idToken));
  if (!idToken) throw new Error("Google didn't return a sign-in token");
  return auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(idToken));
}
export async function nativeSignOut() { if (!isNative()) return; try { const SocialLogin = await social(); await SocialLogin.logout({ provider: "google" }); } catch (e) { /* already signed out */ } }

// The Android Back button closes an open dialog or sheet (as Esc does on a keyboard); otherwise it leaves the app.
export async function installNativeBackButton() {
  if (!isNative()) return;
  const { App } = await import("@capacitor/app");
  App.addListener("backButton", function() {
    if (document.querySelector('[role="dialog"], [data-testid="picker-sheet"]')) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else { App.minimizeApp(); }
  });
}

/** v2.30.1 (FINAL DROP Part 6): the app follows the phone's text size (Settings → Display → Font size on Android,
 *  Larger Text on iPhone), up to 200%; the layouts reflow (tested at double-size text, 360 px wide). */
export async function followPhoneTextSize(deps) {
  if (!(deps && deps.native) && !isNative()) return null;
  try {
    var TZ = (deps && deps.plugin) || (await import("@capacitor/text-zoom")).TextZoom;
    var pref = await TZ.getPreferred();
    var v = Math.max(1, Math.min(2, Number(pref && pref.value) || 1));
    await TZ.set({ value: v });
    return v;
  } catch (e) { return null; }
}
/** v2.34.0: the text size is read again whenever the app comes back to the front, so changing it in the phone's
 *  settings (Android Font size, iPhone Larger Text / Dynamic Type) takes effect without restarting the app. */
export function watchPhoneTextSize(deps) {
  if (!(deps && deps.native) && !isNative()) return function() {};
  var again = function() { if (document.visibilityState !== "hidden") followPhoneTextSize(deps); };
  document.addEventListener("resume", again);            // Capacitor: back from the background
  document.addEventListener("visibilitychange", again);
  return function() { document.removeEventListener("resume", again); document.removeEventListener("visibilitychange", again); };
}
