import Foundation

enum Routes {
    static let pathPrefixes: [String] = [
        "/cards",
        "/rewards",
        "/dashboard",
        "/login",
        "/profile",
        "/programs",
        "/notifications",
        "/settings"
    ]

    static func isVcardaUrl(_ url: URL) -> Bool {
        guard let host = url.host else { return false }
        guard host.contains(AppConfig.domain) else { return false }
        let path = url.path
        return pathPrefixes.contains { path.hasPrefix($0) } || path == "/" || path.isEmpty
    }
}


