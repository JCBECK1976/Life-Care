import Foundation
import Capacitor
import FirebaseCore
import FirebaseAppCheck

/// v2.29.0: Firebase App Check on iPhone — App Attest (Debug builds: the debug provider). The web app inside the shell
/// asks for a token through this plugin (lib/appCheck.js → App Check "custom provider"). It only works once
/// GoogleService-Info.plist is in the app (J15); until then isConfigured says false and nothing changes.
@objc(LcAppCheckPlugin)
public class LcAppCheckPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LcAppCheckPlugin"
    public let jsName = "LcAppCheck"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isConfigured", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]
    private static var ready = false

    private func ensure() -> Bool {
        if LcAppCheckPlugin.ready { return true }
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return false }
        #if DEBUG
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        AppCheck.setAppCheckProviderFactory(LcAttestFactory())
        #endif
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        LcAppCheckPlugin.ready = true
        return true
    }

    @objc func isConfigured(_ call: CAPPluginCall) {
        let ok = ensure()
        #if DEBUG
        call.resolve(["configured": ok, "provider": "debug"])
        #else
        call.resolve(["configured": ok, "provider": "appAttest"])
        #endif
    }

    @objc func getToken(_ call: CAPPluginCall) {
        guard ensure() else { call.reject("not-configured"); return }
        let force = call.getBool("forceRefresh") ?? false
        AppCheck.appCheck().token(forcingRefresh: force) { token, error in
            if let t = token { call.resolve(["token": t.token, "expireTimeMillis": Int(t.expirationDate.timeIntervalSince1970 * 1000)]) }
            else { call.reject(error?.localizedDescription ?? "no token") }
        }
    }
}

/// App Attest (iOS 14+), the provider Apple and Firebase recommend for App Store builds.
class LcAttestFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? { return AppAttestProvider(app: app) }
}
