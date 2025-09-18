import Foundation

enum UniversalLinkHandler {
    static let notificationName = Notification.Name("VcardaUniversalLinkOpen")

    static func route(url: URL) {
        // Align with Android link routes using shared Routes prefixes
        if Routes.isVcardaUrl(url) {
            NotificationCenter.default.post(name: notificationName, object: nil, userInfo: ["url": url])
        }
    }
}


