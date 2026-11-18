package com.companionappsstudio.lifecare;

import android.os.Build;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * v2.33.0: the optional app lock (lib/appLock.js). The phone's own prompt — fingerprint or face (BiometricPrompt),
 * or the phone's PIN / pattern / password. We never see or store any of these; the phone only says yes or no.
 */
@CapacitorPlugin(name = "LcAppLock")
public class LcAppLockPlugin extends Plugin {
    private static int authenticators() {
        // Android 11+: biometrics OR the device credential. Older phones: the credential via the legacy flag (below).
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
            ? BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL
            : BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager bm = BiometricManager.from(getContext());
        boolean bio = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
        android.app.KeyguardManager km = (android.app.KeyguardManager) getContext().getSystemService(android.content.Context.KEYGUARD_SERVICE);
        boolean secure = km != null && km.isDeviceSecure();
        JSObject r = new JSObject();
        r.put("available", bio || secure);
        r.put("biometry", bio ? "fingerprint" : "none");   // Android doesn't say which kind; the prompt shows the right one
        r.put("reason", (bio || secure) ? "" : "no-screen-lock");
        call.resolve(r);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String reason = call.getString("reason", "Unlock Lifecare Companion");
        getActivity().runOnUiThread(() -> {
            FragmentActivity act = (FragmentActivity) getActivity();
            BiometricPrompt prompt = new BiometricPrompt(act, ContextCompat.getMainExecutor(act), new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    JSObject r = new JSObject(); r.put("ok", true); call.resolve(r);
                }
                @Override public void onAuthenticationError(int code, CharSequence msg) {
                    JSObject r = new JSObject(); r.put("ok", false); r.put("error", String.valueOf(msg)); call.resolve(r);
                }
                // onAuthenticationFailed = one wrong finger; the prompt stays open and lets the person try again.
            });
            BiometricPrompt.PromptInfo.Builder b = new BiometricPrompt.PromptInfo.Builder().setTitle("Lifecare Companion").setSubtitle(reason);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) b.setAllowedAuthenticators(authenticators());
            else b.setDeviceCredentialAllowed(true);   // Android 8–10: fingerprint or the phone's PIN
            prompt.authenticate(b.build());
        });
    }
}
