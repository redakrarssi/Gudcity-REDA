import Foundation
import WebKit

final class SafeScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private let allowedHost: String
    private let onAnalytics: (String, [String: String]) -> Void

    init(allowedHost: String, onAnalytics: @escaping (String, [String: String]) -> Void) {
        self.allowedHost = allowedHost
        self.onAnalytics = onAnalytics
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "vcardaSafe" else { return }
        // Origin check
        let originHost = message.frameInfo.securityOrigin.host
        guard originHost.contains(allowedHost) else { return }

        // Validate payload
        guard let body = message.body as? [String: Any] else { return }
        guard let type = body["type"] as? String, type == "analytics" else { return }
        guard let eventName = body["event"] as? String, Self.isValidEventName(eventName) else { return }

        let rawParams = body["params"] as? [String: Any] ?? [:]
        var params: [String: String] = [:]
        for (k, v) in rawParams {
            // String-only params, size-limited, forbid sensitive keys
            guard Self.isSafeKey(k), let sv = v as? String, sv.count <= 128 else { continue }
            params[k] = sv
            if params.count >= 10 { break }
        }

        onAnalytics(eventName, params)
    }

    private static func isSafeKey(_ key: String) -> Bool {
        let lower = key.lowercased()
        if ["token", "secret", "password", "auth", "authorization", "csrf", "cookie"].contains(where: { lower.contains($0) }) {
            return false
        }
        return key.count <= 40
    }

    private static func isValidEventName(_ name: String) -> Bool {
        if name.count > 50 { return false }
        let regex = try! NSRegularExpression(pattern: "^[A-Za-z0-9_.-]+$")
        return regex.firstMatch(in: name, range: NSRange(location: 0, length: name.utf16.count)) != nil
    }
}


