import Foundation
import Capacitor
#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

/// v2.35.0: the store's age signal at onboarding (lib/ageSignal.js) — Apple's Declared Age Range (iOS 26+). Asks only
/// "18 or over?" (one age gate) and never stores the answer. Older iOS, a declined share or an error = "unknown",
/// and the person confirms their age in the app as before. Needs the Declared Age Range capability (GO_LIVE J).
@objc(LcAgeSignalPlugin)
public class LcAgeSignalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LcAgeSignalPlugin"
    public let jsName = "LcAgeSignal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "check", returnType: CAPPluginReturnPromise)
    ]

    @objc func check(_ call: CAPPluginCall) {
        #if canImport(DeclaredAgeRange)
        if #available(iOS 26.0, *) {
            Task { @MainActor in
                guard let vc = self.bridge?.viewController else { call.resolve(["available": false, "source": "apple", "reason": "no view"]); return }
                do {
                    let response = try await AgeRangeService.shared.requestAgeRange(ageGates: 18, in: vc)
                    switch response {
                    case .declinedSharing:
                        call.resolve(["available": true, "source": "apple", "shared": false])
                    case .sharing(let range):
                        var o: [String: Any] = ["available": true, "source": "apple", "shared": true]
                        if let lo = range.lowerBound { o["lower"] = lo }
                        if let hi = range.upperBound { o["upper"] = hi }
                        call.resolve(o)
                    @unknown default:
                        call.resolve(["available": true, "source": "apple", "shared": false])
                    }
                } catch {
                    call.resolve(["available": false, "source": "apple", "reason": error.localizedDescription])
                }
            }
            return
        }
        #endif
        call.resolve(["available": false, "source": "apple", "reason": "needs iOS 26"])
    }
}
