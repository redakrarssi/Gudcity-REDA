import Foundation

enum ApiError: Error, LocalizedError {
    case network(String)
    case decoding(String)
    case server(status: Int, body: String)

    var errorDescription: String? {
        switch self {
        case .network(let msg): return msg
        case .decoding(let msg): return msg
        case .server(let status, let body): return "Server error (\(status)): \(body)"
        }
    }
}

final class ApiClient: NSObject, URLSessionDelegate {
    static let shared = ApiClient()

    // MARK: Raw helpers
    func get(path: String, completion: @escaping (Result<Data, Error>) -> Void) {
        let url = AppConfig.baseURL.appendingPathComponent(path)
        CookieBridge.syncCookiesToSharedStorage {
            CookieBridge.fetchCsrfToken(for: AppConfig.domain) { csrf in
                let session = CookieBridge.authorizedSession(csrf: csrf, delegate: self)
                // Mirror Android semantics: include Bearer header if token exists
                var request = URLRequest(url: url)
                if let auth = Keychain.authorizationHeader() {
                    for (k, v) in auth { request.setValue(v, forHTTPHeaderField: k) }
                }
                let start = Date()
                session.dataTask(with: request) { data, response, error in
                    if let error = error { completion(.failure(ApiError.network(error.localizedDescription))); return }
                    if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                        let body = String(data: data ?? Data(), encoding: .utf8) ?? ""
                        AppLogger.logNetworkFailure(path: path, status: http.statusCode, message: body)
                        completion(.failure(ApiError.server(status: http.statusCode, body: body)))
                        return
                    }
                    let elapsed = Int(Date().timeIntervalSince(start) * 1000)
                    AppLogger.logNetworkSuccess(path: path, elapsedMs: elapsed)
                    completion(.success(data ?? Data()))
                }.resume()
            }
        }
    }

    func post(path: String, jsonBody: [String: Any], completion: @escaping (Result<Data, Error>) -> Void) {
        let url = AppConfig.baseURL.appendingPathComponent(path)
        CookieBridge.syncCookiesToSharedStorage {
            CookieBridge.fetchCsrfToken(for: AppConfig.domain) { csrf in
                var req = URLRequest(url: url)
                req.httpMethod = "POST"
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let auth = Keychain.authorizationHeader() {
                    for (k, v) in auth { req.setValue(v, forHTTPHeaderField: k) }
                }
                if let body = try? JSONSerialization.data(withJSONObject: jsonBody) { req.httpBody = body }
                let session = CookieBridge.authorizedSession(csrf: csrf, delegate: self)
                let start = Date()
                session.dataTask(with: req) { data, response, error in
                    if let error = error { completion(.failure(ApiError.network(error.localizedDescription))); return }
                    if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                        let body = String(data: data ?? Data(), encoding: .utf8) ?? ""
                        AppLogger.logNetworkFailure(path: path, status: http.statusCode, message: body)
                        completion(.failure(ApiError.server(status: http.statusCode, body: body)))
                        return
                    }
                    let elapsed = Int(Date().timeIntervalSince(start) * 1000)
                    AppLogger.logNetworkSuccess(path: path, elapsedMs: elapsed)
                    completion(.success(data ?? Data()))
                }.resume()
            }
        }
    }

    // MARK: Typed helpers
    func getJSON<T: Decodable>(path: String, as type: T.Type, completion: @escaping (Result<T, Error>) -> Void) {
        get(path: path) { result in
            switch result {
            case .failure(let error): completion(.failure(error))
            case .success(let data):
                do { let decoded = try JSONDecoder().decode(T.self, from: data); completion(.success(decoded)) }
                catch { completion(.failure(ApiError.decoding(error.localizedDescription))) }
            }
        }
    }

    func postJSON<T: Decodable>(path: String, body: [String: Any], as type: T.Type, completion: @escaping (Result<T, Error>) -> Void) {
        post(path: path, jsonBody: body) { result in
            switch result {
            case .failure(let error): completion(.failure(error))
            case .success(let data):
                do { let decoded = try JSONDecoder().decode(T.self, from: data); completion(.success(decoded)) }
                catch { completion(.failure(ApiError.decoding(error.localizedDescription))) }
            }
        }
    }
}


