package com.companionappsstudio.lifecare;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

/**
 * v2.28.2: Firebase App Check on Android — Play Integrity (release), the debug provider in debug builds.
 * The web app inside the shell asks for a token through this plugin (lib/appCheck.js → App Check "custom provider").
 * It only works once the app is registered in Firebase (google-services.json, GO_LIVE_CHECKLIST C); until then
 * isConfigured() says false and the web app carries on without App Check (the server does not enforce it yet).
 */
@CapacitorPlugin(name = "LcAppCheck")
public class LcAppCheckPlugin extends Plugin {
    private boolean installed = false;

    private boolean ensure() {
        if (installed) return true;
        if (FirebaseApp.getApps(getContext()).isEmpty()) return false;   // no google-services.json yet
        FirebaseAppCheck ac = FirebaseAppCheck.getInstance();
        if (BuildConfig.DEBUG) {
            try {   // debug builds only (the debug provider is a debug-only dependency, so it is loaded by name)
                Class<?> f = Class.forName("com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory");
                ac.installAppCheckProviderFactory((com.google.firebase.appcheck.AppCheckProviderFactory) f.getMethod("getInstance").invoke(null));
            } catch (Exception e) { return false; }
        } else {
            ac.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
        }
        installed = true;
        return true;
    }

    @PluginMethod
    public void isConfigured(PluginCall call) {
        JSObject r = new JSObject();
        r.put("configured", ensure());
        r.put("provider", BuildConfig.DEBUG ? "debug" : "playIntegrity");
        call.resolve(r);
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        if (!ensure()) { call.reject("not-configured"); return; }
        boolean force = Boolean.TRUE.equals(call.getBoolean("forceRefresh", false));
        FirebaseAppCheck.getInstance().getAppCheckToken(force)
            .addOnSuccessListener(t -> { JSObject r = new JSObject(); r.put("token", t.getToken()); r.put("expireTimeMillis", t.getExpireTimeMillis()); call.resolve(r); })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }
}
