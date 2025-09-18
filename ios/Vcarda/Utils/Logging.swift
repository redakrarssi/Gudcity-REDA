import Foundation
import os

enum AppLogger {
    static let subsystem = Bundle.main.bundleIdentifier ?? "com.yourorg.vcarda"

    static let network = Logger(subsystem: subsystem, category: "network")
    static let auth = Logger(subsystem: subsystem, category: "auth")
    static let sync = Logger(subsystem: subsystem, category: "sync")

    private static func shouldSample(probability: Double) -> Bool {
        guard probability >= 1 else { return Double.random(in: 0...1) < max(0.0, probability) }
        return true
    }

    static func redact(_ text: String) -> String {
        let redactedEmails = text.replacingOccurrences(of: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", with: "[redacted]", options: [.regularExpression, .caseInsensitive])
        return redactedEmails.replacingOccurrences(of: "[0-9]{5,}", with: "[redacted]", options: [.regularExpression])
    }

    // MARK: Network metrics
    static func logNetworkFailure(path: String, status: Int?, message: String, sample: Double = 0.1) {
        guard shouldSample(probability: sample) else { return }
        let s = status.map(String.init) ?? "nil"
        network.error("failure path=\(redact(path)) status=\(s, privacy: .public) msg=\(redact(message), privacy: .public)")
    }

    static func logNetworkSuccess(path: String, elapsedMs: Int, sample: Double = 0.05) {
        guard shouldSample(probability: sample) else { return }
        network.notice("success path=\(redact(path), privacy: .public) ms=\(elapsedMs, privacy: .public)")
    }

    // MARK: Sync/Realtime metrics
    static func logSyncRetry(operation: String, attempt: Int, delaySec: Double, sample: Double = 1.0) {
        guard shouldSample(probability: sample) else { return }
        sync.notice("retry op=\(operation, privacy: .public) attempt=\(attempt, privacy: .public) delay=\(Int(delaySec), privacy: .public)s")
    }

    static func logSyncResult(operation: String, success: Bool, sample: Double = 0.2) {
        guard shouldSample(probability: sample) else { return }
        if success { sync.notice("success op=\(operation, privacy: .public)") }
        else { sync.error("failure op=\(operation, privacy: .public)") }
    }
}


