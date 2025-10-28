# iOS App Development Guide — GudCity Website Integration

This guide enables Swift developers to build a native iOS app that integrates seamlessly with an existing GudCity website while preserving web functionality, adding native enhancements, and maintaining shared authentication and real-time connectivity.

## Executive Summary

- Build a Swift 5+ app using MVVM, URLSession, and Core Data/Realm.
- Integrate the website via WKWebView for full feature parity; add native networking and offline storage.
- Share sessions and CSRF between WKWebView and URLSession; use Keychain for secure tokens.
- Implement Firebase Cloud Messaging (APNs via FCM) and Background Tasks for sync.
- Enforce security: ATS, certificate pinning, Keychain, WKWebView hardening, privacy compliance.
- Ship with testing, performance tuning, and App Store Connect deployment.

## Table of Contents

1. Project Overview
2. Development Setup
3. Architecture Guide
4. Integration Strategy (Website Connectivity)
5. Core Features
6. Security Implementation
7. Testing Strategy
8. Performance Optimization
9. Deployment Process (App Store)
10. Maintenance Guidelines
11. Code Examples
12. Best Practices
13. Resources & References
14. Troubleshooting & FAQ

## 1) Project Overview

Objectives:
- Preserve all website features via WKWebView where appropriate
- Add native capabilities for performance-critical paths and offline-first behavior
- Maintain shared sessions, cookies, and CSRF tokens across web and native
- Provide push notifications, background refresh, and deep linking

## 2) Development Setup

Prerequisites:
- Xcode (latest stable)
- Swift 5+
- iOS target iOS 14+ recommended
- CocoaPods or Swift Package Manager
- Firebase project for Messaging

Key packages (SPM or CocoaPods):
- Firebase Messaging
- Realm or Core Data (choose one)

## 3) Architecture Guide

Recommended pattern: MVVM + Repository with clear separation:
- Presentation: UIKit/SwiftUI views + ViewModels
- Domain: use-cases, pure Swift
- Data: URLSession services, storage (Core Data/Realm), WebSocket

Use typed models, Result types, and centralized error handling.

## 4) Integration Strategy (Website Connectivity)

### 4.1 WKWebView Integration

```swift
final class WebViewController: UIViewController, WKNavigationDelegate {
  private lazy var webView: WKWebView = {
    let prefs = WKWebpagePreferences()
    prefs.allowsContentJavaScript = true // only if site requires

    let config = WKWebViewConfiguration()
    config.defaultWebpagePreferences = prefs
    config.limitsNavigationsToAppBoundDomains = false

    return WKWebView(frame: .zero, configuration: config)
  }()

  override func viewDidLoad() {
    super.viewDidLoad()
    webView.navigationDelegate = self
    view = webView
    let url = URL(string: "https://your-domain.example")!
    webView.load(URLRequest(url: url))
  }
}
```

WKWebView security:
- Prevent arbitrary file access; avoid universal access from file URLs
- Set a custom user agent suffix for telemetry
- Evaluate JavaScript only when needed; never inject secrets

### 4.2 Shared Sessions, Cookies, CSRF

If the web uses HttpOnly cookies and a double-submit CSRF cookie:
- Use `WKHTTPCookieStore` to read cookies from the web context
- Ensure `HTTPCookieStorage.shared` is used by your `URLSessionConfiguration`

```swift
func fetchCsrfToken(for host: String, completion: @escaping (String?) -> Void) {
  let store = WKWebsiteDataStore.default().httpCookieStore
  store.getAllCookies { cookies in
    let token = cookies.first(where: { $0.name == "csrf_token" && $0.domain.contains(host) })?.value
    completion(token)
  }
}

func authorizedSession(csrf: String?) -> URLSession {
  let config = URLSessionConfiguration.default
  config.httpCookieStorage = HTTPCookieStorage.shared
  config.httpAdditionalHeaders = {
    var headers: [AnyHashable: Any] = [:]
    if let csrf = csrf { headers["x-csrf-token"] = csrf }
    return headers
  }()
  return URLSession(configuration: config)
}
```

For JWT-based APIs, store tokens in Keychain and add `Authorization: Bearer` in a request adapter.

### 4.3 Real-time Connectivity

```swift
final class SocketClient: NSObject {
  private var task: URLSessionWebSocketTask?

  func connect() {
    let url = URL(string: "wss://your-domain.example/ws")!
    let session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
    task = session.webSocketTask(with: url)
    task?.resume()
    receive()
  }

  private func receive() {
    task?.receive { [weak self] result in
      switch result {
      case .failure:
        // retry with backoff
        break
      case .success(let message):
        if case let .string(text) = message { /* update ViewModel */ }
        self?.receive()
      }
    }
  }
}

extension SocketClient: URLSessionDelegate {}
```

## 5) Core Features

- URLSession networking with shared cookies/CSRF
- Keychain-backed authentication
- FCM push notifications (APNs)
- Offline storage (Core Data or Realm) and background sync (BGTaskScheduler)
- Universal Links and deep linking between web and native

| Website Feature | Native Enhancement |
| --- | --- |
| Auth session | Keychain + biometric unlock (optional) |
| Real-time updates | Push + URLSessionWebSocketTask |
| Points/rewards | Local cache, optimistic updates, repair jobs |
| Dashboards | WKWebView with native pull-to-refresh |

### Universal Links and Deep Linking

Associate website URLs with the app to route users into native screens.

1) Add Associated Domains capability: `applinks:your-domain.example`

2) Host `apple-app-site-association` at `https://your-domain.example/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.your.bundleid",
        "paths": ["/cards/*", "/rewards/*", "/dashboard/*"]
      }
    ]
  }
}
```

3) Handle links in `SceneDelegate`:

```swift
func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
  guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
        let url = userActivity.webpageURL else { return }
  // route to screen based on url.path
}
```

## Accessibility & Human Interface Guidelines

- Follow iOS HIG for layout, spacing, and interactions
- Dynamic Type: support scalable fonts and `adjustsFontForContentSizeCategory`
- VoiceOver: meaningful labels, traits, and rotor navigation
- Color: maintain contrast; support Dark Mode and reduced transparency
- Motion: respect Reduce Motion and Provide alternatives to animations
- Test with Accessibility Inspector and VoiceOver

## 6) Security Implementation

### 6.1 Data at Rest
- Keychain for tokens
- Sensitive flags set on backgrounding (hide sensitive screens)

```swift
import Security

enum Keychain {
  static func save(token: String, account: String = "auth_token") {
    let data = token.data(using: .utf8)!
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrAccount as String: account,
                                kSecValueData as String: data,
                                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock]
    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
  }

  static func load(account: String = "auth_token") -> String? {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrAccount as String: account,
                                kSecReturnData as String: true,
                                kSecMatchLimit as String: kSecMatchLimitOne]
    var result: AnyObject?
    SecItemCopyMatching(query as CFDictionary, &result)
    guard let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }
}
```

### 6.2 Data in Transit
- ATS (App Transport Security) with HTTPS-only
- Certificate pinning via `URLSessionDelegate` challenge handling:

```swift
extension YourApiClient: URLSessionDelegate {
  func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    guard let serverTrust = challenge.protectionSpace.serverTrust else {
      completionHandler(.cancelAuthenticationChallenge, nil); return
    }
    // Evaluate trust and compare pinned keys/certs (omitted for brevity)
    completionHandler(.useCredential, URLCredential(trust: serverTrust))
  }
}
```

### 6.3 WKWebView Hardening
- Disable `allowsInlineMediaPlayback` unless needed
- Use `WKContentRuleList` to block mixed content where possible
- Avoid `window.webkit.messageHandlers` for secrets

### 6.4 Privacy & Compliance
- Data minimization, no PII in logs
- App Tracking Transparency if tracking
- CSRF header for state-changing calls when using cookies

## 7) Testing Strategy

- Unit tests: ViewModels, repositories (XCTest)
- UI tests: XCUITest; include login and WKWebView flows
- Integration tests: URLProtocol stubs for URLSession; Core Data in-memory store

```swift
final class AuthRepositoryTests: XCTestCase { /* ... */ }
```

## 8) Performance Optimization

- Network: cache policies, gzip, reduce chattiness
- Storage: batch writes, background contexts (Core Data)
- UI: Instruments (Time Profiler, Leaks), prefetching
- Battery: BackgroundTask minimal work, defer heavy sync

## 9) Deployment Process (App Store)

1. Configure signing and capabilities (Push, Background Modes)
2. Archive and distribute via Xcode Organizer to TestFlight
3. App Store Connect: privacy, data collection, screenshots, review notes
4. Phased release; monitor crashes and metrics

### Build Automation & CI/CD

- Use Xcode Cloud or GitHub Actions + fastlane
- Lint, unit/UI test on PR; create TestFlight builds on main branch
- Automate metadata and uploads with `fastlane deliver`

## 10) Maintenance Guidelines

- Crashlytics/Analytics; monitor push delivery and WebSocket reliability
- Feature flags; rollout in stages
- Quarterly dependency updates; immediate security fixes

## 11) Code Examples

### 11.1 Request with Shared Cookies and CSRF

```swift
func performPost(path: String, body: [String: Any], completion: @escaping (Result<Data, Error>) -> Void) {
  fetchCsrfToken(for: "your-domain.example") { csrf in
    var request = URLRequest(url: URL(string: "https://your-domain.example" + path)!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let csrf = csrf { request.setValue(csrf, forHTTPHeaderField: "x-csrf-token") }
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    let session = authorizedSession(csrf: csrf)
    session.dataTask(with: request) { data, response, error in
      if let error = error { completion(.failure(error)); return }
      completion(.success(data ?? Data()))
    }.resume()
  }
}
```

### 11.2 Background App Refresh (BGTaskScheduler)

```swift
// In AppDelegate
BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.your.app.refresh", using: nil) { task in
  scheduleNextRefresh()
  // Perform sync, then
  task.setTaskCompleted(success: true)
}

func scheduleNextRefresh() {
  let request = BGAppRefreshTaskRequest(identifier: "com.your.app.refresh")
  request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
  try? BGTaskScheduler.shared.submit(request)
}
```

### 11.3 Firebase Messaging Setup

```swift
import Firebase
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
    application.registerForRemoteNotifications()
    Messaging.messaging().delegate = self
    return true
  }

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    // send token to backend for this user
  }
}
```

## 12) Best Practices

- Keep behavior aligned with Android; share models and error semantics
- Use Keychain and ATS; never store secrets in WKWebView context
- Prefer native networking for performance-critical paths; keep WebView for complex legacy flows
- Use idempotency keys and retries for write operations

## 13) Resources & References

- Apple Developer: [`https://developer.apple.com`](https://developer.apple.com)
- WKWebView: [`https://developer.apple.com/documentation/webkit/wkwebview`](https://developer.apple.com/documentation/webkit/wkwebview)
- URLSession: [`https://developer.apple.com/documentation/foundation/urlsession`](https://developer.apple.com/documentation/foundation/urlsession)
- Background Tasks: [`https://developer.apple.com/documentation/backgroundtasks`](https://developer.apple.com/documentation/backgroundtasks)
- Firebase Messaging: [`https://firebase.google.com/docs/cloud-messaging`](https://firebase.google.com/docs/cloud-messaging)

## 14) Troubleshooting & FAQ

### Cookies/CSRF not present on requests
- Ensure `WKHTTPCookieStore` cookies are synced to `HTTPCookieStorage.shared` before request
- Confirm `x-csrf-token` header on mutating calls
- If auth domain differs, enable cookie sharing via NSHTTPCookieStorage policies and validate SameSite settings on the server

### WKWebView shows blank/blocked content
- Validate ATS exceptions if any; ensure HTTPS resources and CSP compatibility

### APNs/FCM token not received
- Verify Push capability, APNs key/cert, and Firebase configuration; check bundle identifiers

### WebSocket drops frequently
- Implement backoff, detect network changes, and use push as a fallback channel

---

Cross-platform note: match Android’s error handling, data models, and auth semantics (see `android.md`) to ensure a unified experience across platforms.

### Cross-Platform Consistency Checklist

- Shared models and error codes across Android/iOS
- Consistent session handling (cookies + CSRF or JWT semantics)
- Equivalent universal link routes and URL patterns
- Similar retry, timeout, and idempotency strategies
- Matching accessibility and privacy practices


