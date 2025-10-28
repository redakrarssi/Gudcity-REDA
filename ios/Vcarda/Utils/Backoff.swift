import Foundation

final class BackoffScheduler {
    private(set) var attempts: Int = 0

    func nextDelay() -> TimeInterval {
        attempts += 1
        let capped = min(Double(attempts), 6.0)
        let base = pow(2.0, capped)
        let jitter = Double.random(in: 0...0.5)
        return min(60.0, base + jitter)
    }

    func reset() {
        attempts = 0
    }
}


