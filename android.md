# Android App Development Guide — GudCity Website Integration

This guide enables Android developers to build a native app (Kotlin/Java) that seamlessly integrates with an existing GudCity web experience while preserving all website features, adding native enhancements, ensuring secure authentication, and delivering reliable offline and real-time behavior.

## Executive Summary

- Build a native Android app using MVVM, Jetpack components, and Retrofit/Room/WorkManager.
- Integrate the website via WebView for full feature parity; augment with native networking and local storage.
- Share sessions and CSRF between WebView and Retrofit; support JWT or cookie-based auth.
- Implement push notifications (Firebase Cloud Messaging) and background sync (WorkManager).
- Enforce strong security: encrypted storage, TLS + certificate pinning, WebView hardening.
- Ship with testing, performance tuning, and Play Console deployment.

## Table of Contents

1. Project Overview
2. Development Setup
3. Architecture Guide
4. Integration Strategy (Website Connectivity)
5. Core Features
6. Security Implementation
7. Testing Strategy
8. Performance Optimization
9. Deployment Process (Google Play)
10. Maintenance Guidelines
11. Code Examples
12. Best Practices
13. Resources & References
14. Troubleshooting & FAQ

## 1) Project Overview

Goal: Deliver a native Android application that:
- Preserves 100% of website functionality via WebView when needed
- Offers native APIs for performance-critical paths (auth, notifications, offline)
- Shares auth sessions between web and native
- Supports real-time updates (WebSocket/FCM) and offline-first data
- Meets security, performance, and accessibility standards

## 2) Development Setup

Prerequisites:
- Android Studio (latest stable)
- JDK 17+
- Android SDK: targetSdk latest stable, minSdk 24+ recommended
- Firebase project (for FCM)

Suggested Gradle dependencies:

```kotlin
// build.gradle (app) — key libraries
dependencies {
  // Kotlin + coroutines
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

  // Jetpack
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")
  implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.4")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
  implementation("androidx.navigation:navigation-fragment-ktx:2.7.7")
  implementation("androidx.navigation:navigation-ui-ktx:2.7.7")

  // Networking
  implementation("com.squareup.retrofit2:retrofit:2.11.0")
  implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

  // Persistence & background
  implementation("androidx.room:room-runtime:2.6.1")
  kapt("androidx.room:room-compiler:2.6.1")
  implementation("androidx.room:room-ktx:2.6.1")
  implementation("androidx.work:work-runtime-ktx:2.9.1")

  // Encryption
  implementation("androidx.security:security-crypto:1.1.0-alpha06")

  // Firebase Messaging
  implementation(platform("com.google.firebase:firebase-bom:33.2.0"))
  implementation("com.google.firebase:firebase-messaging-ktx")
}
```

Project configuration:
- Enable ViewBinding or Jetpack Compose (optional) for UI
- Configure `proguard-rules.pro`/R8 for release
- Add `google-services.json` for FCM

## 3) Architecture Guide

Recommended pattern: MVVM + Repository with three layers:
- Presentation (Activities/Fragments/ViewModels)
- Domain (use-cases, pure Kotlin)
- Data (Retrofit services, Room DAOs, WebSocket client)

Key modules:
- `AuthRepository` for tokens/cookies session sharing
- `SyncRepository` for background refresh & conflict resolution
- `NotificationRepository` for FCM + in-app routing

Use sealed results and explicit error types. Avoid business logic in Activities.

## 4) Integration Strategy (Website Connectivity)

### 4.1 WebView Integration

```kotlin
class WebViewFragment : Fragment() {
  private lateinit var webView: WebView

  override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
    val view = inflater.inflate(R.layout.fragment_webview, container, false)
    webView = view.findViewById(R.id.webView)
    return view
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    val settings = webView.settings
    settings.javaScriptEnabled = true // enable only if site requires
    settings.domStorageEnabled = true
    settings.userAgentString = settings.userAgentString + " GudCityAndroidApp"
    settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean = false
    }

    // Load the website root or an authenticated URL
    webView.loadUrl("https://your-domain.example")
  }
}
```

WebView security:
- Disable file access unless needed: `settings.allowFileAccess = false`
- Prevent universal access from file URLs
- Enable Safe Browsing: `WebView.enableSafeBrowsing(context, true)`

### 4.2 Shared Sessions, Cookies, CSRF

If the website uses HttpOnly session cookies and a double-submit CSRF cookie (as in GudCity web):
- Use `android.webkit.CookieManager` to read cookies from the WebView domain
- Propagate `Cookie` header and `x-csrf-token` to Retrofit requests

```kotlin
object CsrfProvider {
  fun readCsrfTokenFor(url: String): String? {
    val cookieString = android.webkit.CookieManager.getInstance().getCookie(url) ?: return null
    return cookieString.split(';')
      .map { it.trim() }
      .firstOrNull { it.startsWith("csrf_token=") }
      ?.substringAfter("=")
  }
}

class SessionCookieInterceptor(private val baseUrl: String) : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response {
    val original = chain.request()
    val cookieString = android.webkit.CookieManager.getInstance().getCookie(baseUrl)
    val csrf = CsrfProvider.readCsrfTokenFor(baseUrl)
    val request = original.newBuilder()
      .apply {
        if (!cookieString.isNullOrBlank()) header("Cookie", cookieString)
        if (!csrf.isNullOrBlank()) header("x-csrf-token", csrf)
      }
      .build()
    return chain.proceed(request)
  }
}

val okHttpClient = OkHttpClient.Builder()
  .addInterceptor(SessionCookieInterceptor("https://your-domain.example"))
  .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
  .build()
```

For JWT-style APIs, store tokens in `EncryptedSharedPreferences` and inject `Authorization: Bearer` headers.

### 4.3 Real-time Connectivity

- Prefer WebSocket for in-app real-time events; fallback to FCM for push

```kotlin
val client = OkHttpClient()
val request = Request.Builder().url("wss://your-domain.example/ws").build()
val ws = client.newWebSocket(request, object : WebSocketListener() {
  override fun onMessage(webSocket: WebSocket, text: String) {
    // update UI via ViewModel
  }
})
```

## 5) Core Features

- API integration via Retrofit + Moshi
- Auth: cookie or JWT; CSRF propagation
- Push notifications via FCM
- Offline cache via Room; background sync with WorkManager
- Deep links and app links for web-native transitions

Feature mapping:

| Website Feature | Native Enhancement |
| --- | --- |
| Auth session | Encrypted storage + biometrics gate (optional) |
| Real-time notifications | FCM display + in-app routing |
| QR/points, rewards | Local cache, optimistic UI, background repair |
| Admin/business dashboards | WebView with native chrome, pull-to-refresh |

### Deep Linking and App Links

Enable app links so website URLs open in-app and route to the proper screen.

```xml
<!-- AndroidManifest.xml -->
<application>
  <activity android:name=".MainActivity">
    <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="https"
            android:host="your-domain.example"
            android:pathPrefix="/cards" />
    </intent-filter>
  </activity>
</application>
```

In code, parse the deep link and navigate via the `NavController` to the correct destination.

## Accessibility & Material Design Compliance

- Use Material 3 theming; follow typography and spacing guidelines
- Provide `contentDescription` for images and meaningful labels for controls
- Support Dynamic Type: use `sp` for text and respect `fontScale`
- Sufficient color contrast (WCAG AA) and focus indicators for TalkBack
- Larger touch targets (48dp) and clear state changes
- Test with Accessibility Scanner and TalkBack

## 6) Security Implementation

### 6.1 Data at Rest
- `EncryptedSharedPreferences` for tokens/session hints
- Room database encryption (use SQLCipher if required by policy)

### 6.2 Data in Transit
- Enforce HTTPS; disable cleartext traffic in `Network Security Config`
- Certificate pinning (OkHttp):

```kotlin
val pinner = CertificatePinner.Builder()
  .add("your-domain.example", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
  .build()

val secureClient = okHttpClient.newBuilder()
  .certificatePinner(pinner)
  .build()
```

### 6.3 WebView Hardening
- `mixedContentMode = NEVER_ALLOW`
- Disable file and content access unless essential
- Use `@JavascriptInterface` only on isolated objects; never expose secrets

### 6.4 Input Validation & Safe APIs
- Validate all inputs; prefer server-side checks too
- Follow CSRF and session rules from the website; always pass `x-csrf-token` with cookies for write operations

## 7) Testing Strategy

- Unit tests: ViewModels, repositories (JUnit, Mockito/Kotlinx Coroutines Test)
- Instrumentation: Espresso for flows including WebView login
- Integration: Retrofit + MockWebServer; Room with in-memory DB
- End-to-end: Internal app distribution with test backend/staging

```kotlin
@RunWith(AndroidJUnit4::class)
class AuthRepositoryTest { /* ... */ }
```

## 8) Performance Optimization

- Network: gzip, HTTP caching, request deduplication
- Database: indices, batch writes; Paging3 for lists
- UI: avoid heavy work on main; measure with Android Profiler
- Power: schedule syncs with constraints; exponential backoff in WorkManager
- Memory: enable LeakCanary in debug builds

## 9) Deployment Process (Google Play)

1. Configure `release` signing and `minifyEnabled true` with appropriate keep rules
2. Build Android App Bundle (.aab)
3. Set versionCode/Name; upload to Play Console internal testing
4. Fill Data Safety, Privacy Policy, and App Content
5. Roll out to closed/open tracks; monitor ANRs/crashes

### Build Automation & CI/CD

- Use GitHub Actions or Bitrise to run: `./gradlew test lint assembleDebug`
- On main branch: build signed `.aab`, run instrumented tests on Firebase Test Lab
- Automate Play upload with `gradle-play-publisher` or Fastlane Supply

## 10) Maintenance Guidelines

- Crash reporting and analytics (Firebase Crashlytics/Analytics)
- Feature flags/Remote Config for gradual rollout
- Dependency updates quarterly; security updates ASAP
- Monitor WebSocket/FCM delivery metrics

## 11) Code Examples

### 11.1 Encrypted Preferences for Token Storage

```kotlin
val masterKey = MasterKey.Builder(context)
  .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
  .build()

val prefs = EncryptedSharedPreferences.create(
  context,
  "secure_prefs",
  masterKey,
  EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
  EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

fun saveToken(token: String) = prefs.edit().putString("auth_token", token).apply()
fun getToken(): String? = prefs.getString("auth_token", null)
```

### 11.2 WorkManager Background Sync

```kotlin
class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
  override suspend fun doWork(): Result {
    // pull latest profile/cards, push pending ops
    return Result.success()
  }
}

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
  "periodic_sync",
  ExistingPeriodicWorkPolicy.UPDATE,
  PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .build()
)
```

### 11.3 Retrofit Service Example

```kotlin
interface ApiService {
  @POST("/api/points/award")
  suspend fun awardPoints(@Body body: AwardPointsRequest): AwardPointsResponse
}

data class AwardPointsRequest(val customerId: String, val points: Int)
```

## 12) Best Practices

- Keep feature parity with web; use WebView for complex existing flows
- Prefer native for perf-sensitive tasks; cache aggressively and sync in background
- Never store secrets in WebView JS context
- Log with structured, redacted fields; no PII in logs
- Guard critical flows behind retry and idempotency keys

## 13) Resources & References

- Android developers documentation: [`https://developer.android.com`](https://developer.android.com)
- Retrofit: [`https://square.github.io/retrofit`](https://square.github.io/retrofit)
- Room: [`https://developer.android.com/training/data-storage/room`](https://developer.android.com/training/data-storage/room)
- WorkManager: [`https://developer.android.com/topic/libraries/architecture/workmanager`](https://developer.android.com/topic/libraries/architecture/workmanager)
- FCM: [`https://firebase.google.com/docs/cloud-messaging`](https://firebase.google.com/docs/cloud-messaging)

## 14) Troubleshooting & FAQ

### Cookies/CSRF not applied to API calls
- Ensure domain matches exactly and `CookieManager.getCookie(baseUrl)` returns expected values
- Confirm `x-csrf-token` header present on POST/PUT/PATCH/DELETE
- If using a different auth domain, enable third‑party cookies in WebView: `CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)`

### WebView shows blank/blocked content
- Check `mixedContentMode`; ensure HTTPS resources; validate CSP and user agent handling

### FCM not receiving
- Verify device token registration with backend; confirm notifications permission on Android 13+

### WebSocket disconnects
- Implement exponential backoff; detect network changes; fall back to FCM

---

Cross-platform note: mirror all authentication, error handling, and data models with iOS (see `iphone.md`) to keep behavior consistent across platforms.

### Cross-Platform Consistency Checklist

- Shared models and error codes across Android/iOS
- Consistent session handling (cookies + CSRF or JWT semantics)
- Equivalent deep link routes and URL patterns
- Similar retry, timeout, and idempotency strategies
- Matching accessibility and privacy practices


