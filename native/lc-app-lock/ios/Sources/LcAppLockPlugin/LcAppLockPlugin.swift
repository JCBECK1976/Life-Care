import Foundation
import Capacitor
import LocalAuthentication

/// v2.33.0: the optional app lock (lib/appLock.js). The phone's own prompt — Face ID / Touch ID, or the passcode.
/// We never see or store any of these; the phone only says yes or no.
@objc(LcAppLockPlugin)
public class LcAppLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LcAppLockPlugin"
    public let jsName = "LcAppLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err)   // biometrics OR the passcode
        _ = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        let kind: String
        switch ctx.biometryType {
        case .faceID: kind = "face"
        case .touchID: kind = "fingerprint"
        default: kind = "none"
        }
        call.resolve(["available": ok, "biometry": kind, "reason": ok ? "" : "no-screen-lock"])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Lifecare Companion"
        let ctx = LAContext()
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
            call.resolve(["ok": ok, "error": error?.localizedDescription ?? ""])
        }
    }
}
