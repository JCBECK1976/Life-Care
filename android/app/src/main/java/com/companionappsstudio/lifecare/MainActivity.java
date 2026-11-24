package com.companionappsstudio.lifecare;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LcAppCheckPlugin.class);   // v2.28.2: App Check (Play Integrity)
        registerPlugin(LcAppLockPlugin.class);    // v2.33.0: the optional app lock
        registerPlugin(LcAgeSignalPlugin.class);  // v2.35.0: the store's age signal at onboarding
        registerPlugin(LcSharePlugin.class);      // v2.44.0: an image shared into the app
        LcSharePlugin.keep(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        LcSharePlugin.keep(intent);
        try {
            PluginHandle h = getBridge().getPlugin("LcShare");
            if (h != null && h.getInstance() instanceof LcSharePlugin) ((LcSharePlugin) h.getInstance()).announce();
        } catch (Exception e) { /* the web app also checks when it next opens */ }
    }
}
