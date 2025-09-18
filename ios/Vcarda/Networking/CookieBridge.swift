import Foundation
import WebKit

enum CookieBridge {
    // Testing hook: override to provide custom URLSession creation (e.g., with URLProtocol stubs)
    static var sessionFactory: ((URLSessionConfiguration, URLSessionDelegate?) -> URLSession)?

    private static var observer: CookieObserver?
    /// Copies cookies from WKWebView cookie store to HTTPCookieStorage.shared
    /// so URLSession requests include the same cookies as the WebView context.
    static func syncCookiesToSharedStorage(completion: @escaping () -> Void) {
        let store = WKWebsiteDataStore.default().httpCookieStore
        store.getAllCookies { cookies in
            let shared = HTTPCookieStorage.shared
            cookies.forEach { shared.setCookie($0) }
            completion()
        }
    }

    static func fetchCsrfToken(for host: String, completion: @escaping (String?) -> Void) {
        let store = WKWebsiteDataStore.default().httpCookieStore
        store.getAllCookies { cookies in
            let token = cookies.first { $0.name == "csrf_token" && $0.domain.contains(host) }?.value
            completion(token)
        }
    }

    static func authorizedSession(csrf: String?, delegate: URLSessionDelegate? = nil) -> URLSession {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = HTTPCookieStorage.shared
        config.requestCachePolicy = .useProtocolCachePolicy
        config.urlCache = URLCache.shared
        config.waitsForConnectivity = true
        config.httpMaximumConnectionsPerHost = 6
        if let csrf { config.httpAdditionalHeaders = ["x-csrf-token": csrf] }
        if let factory = sessionFactory {
            return factory(config, delegate)
        }
        return URLSession(configuration: config, delegate: delegate, delegateQueue: .main)
    }

    // MARK: Observing & Clearing
    static func startCookieSyncObserving() {
        let store = WKWebsiteDataStore.default().httpCookieStore
        if observer == nil {
            observer = CookieObserver()
        }
        if let obs = observer {
            store.add(obs)
        }
        // Initial sync on startup
        syncCookiesToSharedStorage(completion: {})
    }

    static func stopCookieSyncObserving() {
        if let obs = observer {
            WKWebsiteDataStore.default().httpCookieStore.removeObserver(obs)
        }
        observer = nil
    }

    static func clearAllCookies(completion: @escaping () -> Void) {
        let store = WKWebsiteDataStore.default().httpCookieStore
        store.getAllCookies { cookies in
            let group = DispatchGroup()
            cookies.forEach { cookie in
                group.enter()
                store.delete(cookie) { group.leave() }
            }
            group.notify(queue: .main) {
                // Also clear shared storage
                HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
                completion()
            }
        }
    }
}

final class CookieObserver: NSObject, WKHTTPCookieStoreObserver {
    func cookiesDidChange(in cookieStore: WKHTTPCookieStore) {
        CookieBridge.syncCookiesToSharedStorage(completion: {})
    }
}


