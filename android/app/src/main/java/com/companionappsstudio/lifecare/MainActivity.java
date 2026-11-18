package com.companionappsstudio.lifecare;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LcAppCheckPlugin.class);   // v2.28.2: App Check (Play Integrity)
        registerPlugin(LcAppLockPlugin.class);    // v2.33.0: the optional app lock
        super.onCreate(savedInstanceState);
    }
}
