import Foundation
#if canImport(Firebase)
import FirebaseAnalytics
import FirebaseCrashlytics
#endif

enum AnalyticsService {
    static func configureIfAllowed() {
        #if canImport(Firebase)
        if PrivacySettings.analyticsEnabled {
            // FirebaseApp.configure() is already called in AppDelegate when available
        }
        if PrivacySettings.crashReportingEnabled {
            Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
        } else {
            Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(false)
        }
        #endif
    }

    static func logScreen(_ name: String) {
        guard PrivacySettings.analyticsEnabled else { return }
        #if canImport(Firebase)
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [AnalyticsParameterScreenName: sanitized(name)])
        #endif
    }

    static func logAction(_ name: String, parameters: [String: String] = [:]) {
        guard PrivacySettings.analyticsEnabled else { return }
        #if canImport(Firebase)
        var params: [String: Any] = [:]
        parameters.forEach { k, v in params[sanitized(k)] = sanitized(v) }
        Analytics.logEvent(sanitized(name), parameters: params)
        #endif
    }

    static func recordNonFatal(_ message: String) {
        guard PrivacySettings.crashReportingEnabled else { return }
        #if canImport(Firebase)
        Crashlytics.crashlytics().log(sanitized(message))
        #endif
    }

    private static func sanitized(_ text: String) -> String {
        // Redact emails, numbers longer than 4, and anything resembling IDs
        let redactedEmails = text.replacingOccurrences(of: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", with: "[redacted-email]", options: [.regularExpression, .caseInsensitive])
        let redactedNumbers = redactedEmails.replacingOccurrences(of: "[0-9]{5,}", with: "[redacted-number]", options: [.regularExpression])
        return redactedNumbers
    }
}


