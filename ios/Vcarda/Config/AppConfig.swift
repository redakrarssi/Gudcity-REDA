import Foundation

enum AppConfig {
    private static var envString: String {
        (Bundle.main.object(forInfoDictionaryKey: "VCARDA_ENVIRONMENT") as? String)?.lowercased() ?? "prod"
    }

    static var environment: String { envString }

    static var domain: String {
        switch envString {
        case "dev":
            return (Bundle.main.object(forInfoDictionaryKey: "VCARDA_DOMAIN_DEV") as? String) ?? "dev.YOUR_VCARDA_DOMAIN"
        case "staging":
            return (Bundle.main.object(forInfoDictionaryKey: "VCARDA_DOMAIN_STAGING") as? String) ?? "staging.YOUR_VCARDA_DOMAIN"
        default:
            return (Bundle.main.object(forInfoDictionaryKey: "VCARDA_DOMAIN_PROD") as? String) ?? "YOUR_VCARDA_DOMAIN"
        }
    }

    static var baseURL: URL { URL(string: "https://\(domain)")! }

    static var isPushEnabled: Bool {
        if let v = Bundle.main.object(forInfoDictionaryKey: "VCARDA_PUSH_ENABLED") as? Bool { return v }
        return envString == "prod"
    }

    static var isAnalyticsEnabledByDefault: Bool {
        if let v = Bundle.main.object(forInfoDictionaryKey: "VCARDA_ANALYTICS_DEFAULT") as? Bool { return v }
        return envString == "prod"
    }
}


