package com.companionappsstudio.lifecare;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.agesignals.AgeSignalsManager;
import com.google.android.play.agesignals.AgeSignalsManagerFactory;
import com.google.android.play.agesignals.AgeSignalsRequest;
import com.google.android.play.agesignals.AgeSignalsResult;

/**
 * v2.35.0: the store's age signal at onboarding (lib/ageSignal.js). Google Play Age Signals API: Play says whether the
 * account's user is in an age range (where the law makes Play share it, e.g. some US states). We only read the range
 * and never store it. Anything that isn't a clear answer (no Play, not shared, an error) = "unknown".
 */
@CapacitorPlugin(name = "LcAgeSignal")
public class LcAgeSignalPlugin extends Plugin {
    @PluginMethod
    public void check(PluginCall call) {
        try {
            AgeSignalsManager m = AgeSignalsManagerFactory.create(getContext());
            m.checkAgeSignals(AgeSignalsRequest.builder().build())
                .addOnSuccessListener((AgeSignalsResult r) -> {
                    JSObject o = new JSObject();
                    o.put("available", true);
                    o.put("source", "play");
                    Integer lo = r.ageLower(), hi = r.ageUpper();
                    o.put("shared", lo != null || hi != null);
                    if (lo != null) o.put("lower", lo.intValue());
                    if (hi != null) o.put("upper", hi.intValue());
                    call.resolve(o);
                })
                .addOnFailureListener((Exception e) -> {
                    JSObject o = new JSObject(); o.put("available", false); o.put("source", "play"); o.put("reason", String.valueOf(e.getMessage())); call.resolve(o);
                });
        } catch (Exception e) {
            JSObject o = new JSObject(); o.put("available", false); o.put("reason", String.valueOf(e.getMessage())); call.resolve(o);
        }
    }
}
