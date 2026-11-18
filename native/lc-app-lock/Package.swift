// swift-tools-version: 5.9
// v2.33.0: the optional app lock for the iPhone app — the same plugin name as Android ("LcAppLock").
import PackageDescription

let package = Package(
    name: "LcAppLock",
    platforms: [.iOS(.v15)],
    products: [.library(name: "LcAppLock", targets: ["LcAppLockPlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "LcAppLockPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/LcAppLockPlugin")
    ]
)
