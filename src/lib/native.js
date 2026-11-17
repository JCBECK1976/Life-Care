// v2.21.0 (N1, Android via Google Play internal testing): the web app runs inside a Capacitor shell.
// Everything here is a no-op on the web. Plugins are loaded only inside the native app.
import { Capacitor } from "@capacitor/core";

export function isNative() { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } }

// Google blocks its sign-in page inside app WebViews, so the native app signs in with Android's own Google account picker
// (Credential Manager) and hands the ID token to Firebase. Needs the app's SHA-1 fingerprints in Firebase (J steps).
var ready = null;
async function social() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  if (!ready) ready = SocialLogin.initialize({ google: { webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID, mode: "online" } });
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
