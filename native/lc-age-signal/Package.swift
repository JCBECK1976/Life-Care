// swift-tools-version: 5.9
// v2.35.0: the store age signal for the iPhone app (Declared Age Range) — the same plugin name as Android ("LcAgeSignal").
import PackageDescription

let package = Package(
    name: "LcAgeSignal",
    platforms: [.iOS(.v15)],
    products: [.library(name: "LcAgeSignal", targets: ["LcAgeSignalPlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "LcAgeSignalPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/LcAgeSignalPlugin")
    ]
)
