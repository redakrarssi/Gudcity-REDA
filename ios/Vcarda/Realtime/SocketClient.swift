import Foundation
import Network

final class SocketClient: NSObject {
    private var task: URLSessionWebSocketTask?
    private var session: URLSession?
    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "socket.reachability")
    private var reconnectAttempts = 0
    private var isUserInitiatedClose = false

    func connect() {
        isUserInitiatedClose = false
        guard let url = URL(string: "wss://\(AppConfig.domain)/ws") else { return }
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
        self.session = session
        let task = session.webSocketTask(with: url)
        self.task = task
        task.resume()
        receive()
        startReachability()
    }

    private func receive() {
        task?.receive { [weak self] result in
            switch result {
            case .failure:
                self?.scheduleReconnect()
            case .success(let message):
                switch message {
                case .string(_):
                    break
                case .data(_):
                    break
                @unknown default:
                    break
                }
                self?.receive()
            }
        }
    }

    func send(_ text: String) {
        task?.send(.string(text)) { _ in }
    }

    func close() {
        isUserInitiatedClose = true
        task?.cancel(with: .goingAway, reason: nil)
        session?.invalidateAndCancel()
        stopReachability()
    }

    private func scheduleReconnect() {
        guard !isUserInitiatedClose else { return }
        reconnectAttempts += 1
        let delay = min(pow(2.0, Double(reconnectAttempts)), 60.0)
        AppLogger.logSyncRetry(operation: "websocket", attempt: reconnectAttempts, delaySec: delay)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self else { return }
            if self.monitor.currentPath.status == .satisfied {
                self.connect()
                AppLogger.logSyncResult(operation: "websocket", success: true)
            } else {
                self.scheduleReconnect()
            }
        }
    }

    private func startReachability() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            if path.status == .satisfied, self.task == nil || self.task?.state != .running {
                self.reconnectAttempts = 0
                self.connect()
            }
        }
        monitor.start(queue: monitorQueue)
    }

    private func stopReachability() {
        monitor.cancel()
    }
}

extension SocketClient: URLSessionDelegate {}


