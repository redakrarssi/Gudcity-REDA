import Foundation

enum PrivacySettings {
    private static let analyticsKey = "privacy.analytics.enabled"
    private static let crashKey = "privacy.crash.enabled"
    private static let bioKey = "privacy.biometric.enabled"
    private static let trackingKey = "privacy.tracking.enabled"

    static var analyticsEnabled: Bool {
        get {
            #if DEBUG
            return false
            #else
            return UserDefaults.standard.object(forKey: analyticsKey) as? Bool ?? false
            #endif
        }
        set { UserDefaults.standard.set(newValue, forKey: analyticsKey) }
    }

    static var crashReportingEnabled: Bool {
        get {
            #if DEBUG
            return false
            #else
            return UserDefaults.standard.object(forKey: crashKey) as? Bool ?? false
            #endif
        }
        set { UserDefaults.standard.set(newValue, forKey: crashKey) }
    }

    static var biometricLockEnabled: Bool {
        get { UserDefaults.standard.object(forKey: bioKey) as? Bool ?? false }
        set { UserDefaults.standard.set(newValue, forKey: bioKey) }
    }

    static var trackingEnabled: Bool {
        get { UserDefaults.standard.object(forKey: trackingKey) as? Bool ?? false }
        set { UserDefaults.standard.set(newValue, forKey: trackingKey) }
    }
}


