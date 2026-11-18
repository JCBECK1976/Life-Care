// swift-tools-version: 5.9
// v2.29.0: Firebase App Check (App Attest) for the iPhone app — the same plugin name as Android ("LcAppCheck").
import PackageDescription

let package = Package(
    name: "LcAppCheck",
    platforms: [.iOS(.v15)],
    products: [.library(name: "LcAppCheck", targets: ["LcAppCheckPlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", exact: "13.1.1")
    ],
    targets: [
        .target(
            name: "LcAppCheckPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAppCheck", package: "firebase-ios-sdk")
            ],
            path: "ios/Sources/LcAppCheckPlugin")
    ]
)
