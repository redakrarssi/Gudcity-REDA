Vcarda iOS App — Project Setup Guide

This folder contains a ready-to-use scaffold for a native iOS app that integrates the Vcarda website using WKWebView, follows MVVM with a Repository layer, and includes Core Data scaffolding for offline caching.

Prerequisites
- macOS with Xcode (latest stable)
- iOS Deployment Target: 14.0+
- Swift 5+

Quick Start (Xcode UI)
1) Create a new project in Xcode
   - Template: App (iOS)
   - Interface: UIKit
   - Lifecycle: UIKit App Delegate
   - Language: Swift
   - Product Name: Vcarda
   - Bundle Identifier: com.yourorg.vcarda
   - Deployment Target: iOS 14.0+

2) Add capabilities
   - Signing & Capabilities → + Capability → Push Notifications
   - Signing & Capabilities → + Capability → Background Modes → check "Background fetch" (and "Remote notifications" if you use silent push)
   - Signing & Capabilities → + Capability → Associated Domains → add: applinks:YOUR_VCARDA_DOMAIN

3) Add source files from this repo
   - Drag the following into your Xcode project (ensure "Copy items if needed" is checked):
     - Vcarda/AppDelegate.swift
     - Vcarda/SceneDelegate.swift
     - Vcarda/Config/AppConfig.swift
     - Vcarda/Web/WebViewController.swift
     - Vcarda/Persistence/CoreDataStack.swift
     - Vcarda/Networking/ApiClient.swift
     - Vcarda/Networking/CookieBridge.swift
     - Vcarda/Background/BackgroundTasks.swift
     - Vcarda/Realtime/SocketClient.swift
     - Vcarda/ViewModels/AppViewModel.swift
     - Vcarda/Repositories/CardRepository.swift

4) Configure Info.plist and entitlements
   - Use your existing target Info.plist and add:
     - UIBackgroundModes: [ fetch, processing ]
     - NSAppTransportSecurity → NSAllowsArbitraryLoads: false (default is fine)
   - Optional sample files provided here for reference:
     - Vcarda/Resources/Sample-Info.plist (copy fields into your target's Info if needed)
     - Vcarda/Resources/Vcarda.entitlements (attach in Signing & Capabilities if you manage entitlements via file)
   - Add Background Tasks identifier to Info (iOS 13+):
     - Permitted background task scheduler identifiers: [ "com.yourorg.vcarda.refresh" ]

5) Configure domain and Universal Links
   - Set `AppConfig.domain` in `Vcarda/Config/AppConfig.swift` to your real domain (e.g., www.vcarda.com)
   - Associated Domains: add `applinks:YOUR_VCARDA_DOMAIN`
   - Host the AASA file at: https://YOUR_VCARDA_DOMAIN/.well-known/apple-app-site-association

     Example AASA JSON:
     {
       "applinks": {
         "apps": [],
         "details": [
           {
             "appID": "TEAMID.com.yourorg.vcarda",
             "paths": ["/cards/*", "/rewards/*", "/dashboard/*"]
           }
         ]
       }
     }

   - MIME type must be `application/json` (no extension). No BOM, no comments.
   - After deployment, validate with: `curl -I https://YOUR_VCARDA_DOMAIN/.well-known/apple-app-site-association`

6) Push notifications (optional now, recommended later)
   - Add `GoogleService-Info.plist` to the Xcode project root if using Firebase
   - Enable Push Notifications capability
   - AppDelegate includes compile guards to call Firebase only if it is added

Firebase Messaging via Swift Package Manager
1) In Xcode: File → Add Packages…
2) Enter package URL: https://github.com/firebase/firebase-ios-sdk
3) Dependency Rule: Up to Next Major Version
4) Add these products to your target:
   - FirebaseAnalytics
   - FirebaseMessaging
   - FirebaseCore
5) Drag `GoogleService-Info.plist` into the app target (select "Copy items if needed")
6) Clean build folder and run. On first launch, accept notification permission.

Notes:
- `AppDelegate` sets `Messaging.messaging().delegate = self` and assigns `apnsToken` on registration.
- If you prefer manual setup, you can call `FirebaseMessagingHelper.configure()` instead of configuring in `didFinishLaunching`.

7) Run
   - Select a simulator or device and run
   - The app launches `WebViewController` and loads https://YOUR_VCARDA_DOMAIN

8) Tests
  - Unit Tests target: add files from `ios/Tests/` (e.g., `AppViewModelTests.swift`, `URLProtocolStub.swift`)
  - UI Tests target: add files from `ios/UITests/` (e.g., `VcardaUITests.swift`)
  - Integration tests use `URLProtocolStub` and `CookieBridge.sessionFactory` to stub `URLSession`

Branding & Accessibility
- App Icons: place PNGs in `ios/Vcarda/Resources/Assets.xcassets/AppIcon.appiconset/` matching `Contents.json` filenames
- Launch Screen: `ios/Vcarda/Resources/LaunchScreen.storyboard` uses `AppLogo` centered on system background
- Contrast: verify launch/logo and in-app colors meet WCAG AA in light and dark mode
- Localization: add localized app name and accessibility labels if your site targets multiple languages

Release & TestFlight
1) Signing
   - Xcode → Targets → Signing & Capabilities
   - Select your team, set bundle ID (`com.yourorg.vcarda`), enable automatic signing
   - Ensure Push Notifications, Background Modes, Associated Domains are present

2) Archive
   - Product → Scheme → Any iOS Device (arm64)
   - Product → Archive
   - Organizer → Distribute App → App Store Connect → Upload

3) App Store Connect setup
   - Create the app record (bundle ID must match)
   - Fill App Information, Pricing & Availability
   - Prepare TestFlight: add internal testers
   - Answer Privacy questionnaire (data collection categories)
   - Add screenshots (6.7", 5.5"), description, keywords, support URL
   - Add Review Notes (demo account if login required)

4) After upload
   - Wait for processing, then enable TestFlight testers
   - Submit for review when ready

CI/CD (optional)
- Xcode Cloud: set up build & test workflow on main; add a distribution workflow for TestFlight
- GitHub Actions: use a macOS runner to build, test, and optionally deliver with fastlane

Fastlane (optional)
- Use Bundler (`Gemfile`) and `Fastfile` lanes:
  - `lane :test` → run unit and UI tests
  - `lane :beta` → gym (build IPA) + pilot (upload to TestFlight)
- Use App Store Connect API Key env vars: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT`

Architecture Notes (from iphone.md)
- MVVM + Repository
  - Views: UIKit view controllers (e.g., `WebViewController`)
  - ViewModels: state and logic
  - Repositories: networking + persistence (Core Data)
- Security
  - ATS enforced (HTTPS only). Do not add NSAllowsArbitraryLoads.
  - Keychain for secrets/tokens (add later if you introduce JWTs)
  - Certificate pinning in `ApiClient+Pinning.swift` — add SPKI SHA256 base64 pins for your domain and a backup pin. Supports key rotation by listing multiple pins. Rollout steps:
    1) Collect SPKI pins for current and next certificates
    2) Add both to `pinsByHostSuffix` for your domain
    3) Release app update before rotating the server certificate
    4) After rotation and adoption, you can remove old pins in a later release
- Background
  - `BackgroundTasks` scaffold included for app refresh; identifier `com.yourorg.vcarda.refresh`
  - Lightweight sync caches `/api/cards` JSON into Core Data `CachedResponse`
- Real-time & Push
  - WebSocket client scaffold included
  - Push notifications via APNs/FCM when configured
  - Cross-platform parity: routes in `Routes.swift`, cookie/CSRF and optional JWT via Keychain, consistent error semantics
  - Crash/Analytics: privacy-controlled Crashlytics and Analytics (disabled in DEBUG; redacts PII)

Performance profiling (Instruments)
- Use Time Profiler for app startup; measure `application(_:didFinishLaunching:)` and first WebView load
- Use Network and Allocations instruments while navigating key flows
- Inspect WebView load via `WKNavigationDelegate` timings and Network logs

Network/cache tuning
- `URLSessionConfiguration`: `.useProtocolCachePolicy`, shared `URLCache`, `waitsForConnectivity = true`
- Prefer compressed images (WebP/AVIF on web side), responsive sizes, and server caching headers

App size trimming
- Enable Dead Code Stripping and Whole-Module Optimization for Release
- Remove unused assets and optional dependencies; keep SPM deps minimal

What to change
- Replace `YOUR_VCARDA_DOMAIN` in `AppConfig.swift` and entitlements
- Update Associated Domains to match your domain
- Add Firebase only if needed; otherwise the app builds without it

Environments (Dev/Staging/Prod)
- Create three build configurations and set Info.plist values per config:
  - `VCARDA_ENVIRONMENT`: dev | staging | prod
  - `VCARDA_DOMAIN_DEV`, `VCARDA_DOMAIN_STAGING`, `VCARDA_DOMAIN_PROD`
  - `VCARDA_PUSH_ENABLED` (Bool), `VCARDA_ANALYTICS_DEFAULT` (Bool)
- Use separate bundle IDs and app icons per configuration (e.g., `com.yourorg.vcarda.dev`, `staging`, `prod`)


