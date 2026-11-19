// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3"),
        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorFilesystem", path: "../../../node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorShare", path: "../../../node_modules/@capacitor/share"),
        .package(name: "CapacitorTextZoom", path: "../../../node_modules/@capacitor/text-zoom"),
        .package(name: "CapgoCapacitorHealth", path: "../../../node_modules/@capgo/capacitor-health"),
        .package(name: "CapgoCapacitorSocialLogin", path: "../../../node_modules/@capgo/capacitor-social-login"),
        .package(name: "CapgoNativePurchases", path: "../../../node_modules/@capgo/native-purchases"),
        .package(name: "LcAppCheck", path: "../../../native/lc-app-check"),
        .package(name: "LcAppLock", path: "../../../native/lc-app-lock"),
        .package(name: "LcAgeSignal", path: "../../../native/lc-age-signal")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorTextZoom", package: "CapacitorTextZoom"),
                .product(name: "CapgoCapacitorHealth", package: "CapgoCapacitorHealth"),
                .product(name: "CapgoCapacitorSocialLogin", package: "CapgoCapacitorSocialLogin"),
                .product(name: "CapgoNativePurchases", package: "CapgoNativePurchases"),
                .product(name: "LcAppCheck", package: "LcAppCheck"),
                .product(name: "LcAppLock", package: "LcAppLock"),
                .product(name: "LcAgeSignal", package: "LcAgeSignal")
            ]
        )
    ]
)
