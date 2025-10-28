import Foundation
import Security

enum Keychain {
    static func save(token: String, account: String = "auth_token") {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: account,
                                    kSecValueData as String: data,
                                    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(account: String = "auth_token") -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: account,
                                    kSecReturnData as String: true,
                                    kSecMatchLimit as String: kSecMatchLimitOne]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func delete(account: String = "auth_token") -> Bool {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: account]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }

    static func exists(account: String = "auth_token") -> Bool {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: account,
                                    kSecReturnData as String: false,
                                    kSecMatchLimit as String: kSecMatchLimitOne]
        return SecItemCopyMatching(query as CFDictionary, nil) == errSecSuccess
    }

    static func authorizationHeader(account: String = "auth_token") -> [String: String]? {
        guard let token = load(account: account), !token.isEmpty else { return nil }
        return ["Authorization": "Bearer \(token)"]
    }
}

enum Logout {
    static func perform(completion: @escaping () -> Void) {
        // Clear Keychain token
        _ = Keychain.delete()
        // Clear cookies (WebView + shared)
        CookieBridge.clearAllCookies {
            // Clear cached Core Data blobs
            // For simplicity, wipe the CachedResponse entity
            let context = CoreDataStack.shared.context
            let fetch = NSFetchRequest<NSManagedObject>(entityName: "CachedResponse")
            if let objects = try? context.fetch(fetch) {
                objects.forEach { context.delete($0) }
                CoreDataStack.shared.saveContext()
            }
            completion()
        }
    }
}


