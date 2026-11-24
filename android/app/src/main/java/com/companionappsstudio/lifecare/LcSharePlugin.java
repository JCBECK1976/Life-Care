package com.companionappsstudio.lifecare;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * v2.44.0 (night batch P6b): an image shared into the Android app ("Share → Lifecare Companion"). MainActivity keeps the
 * shared image's address; the web app takes it once (take()), puts it where the installed web app's share target keeps
 * shared images, and shows "What is this?". Nothing is uploaded or stored by this plugin.
 */
@CapacitorPlugin(name = "LcShare")
public class LcSharePlugin extends Plugin {
    static Uri pending = null;
    static String pendingType = null;

    static void keep(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String t = intent.getType();
        if (t == null || !t.startsWith("image/")) return;
        Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u != null) { pending = u; pendingType = t; }
    }

    void announce() { if (pending != null) notifyListeners("shared", new JSObject()); }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject o = new JSObject();
        Uri u = pending; String t = pendingType;
        pending = null; pendingType = null;
        if (u == null) { o.put("found", false); call.resolve(o); return; }
        try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384]; int n;
            while (in != null && (n = in.read(buf)) > 0) { out.write(buf, 0, n); if (out.size() > 15 * 1024 * 1024) break; }
            o.put("found", true);
            o.put("type", t);
            o.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            call.resolve(o);
        } catch (Exception e) {
            o.put("found", false); o.put("reason", String.valueOf(e.getMessage())); call.resolve(o);
        }
    }
}
