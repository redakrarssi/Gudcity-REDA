import Foundation
import Security
import CryptoKit

extension ApiClient {
    private enum Pinner {
        // Map of host suffix → allowed SPKI SHA256 base64 pins (primary + backups)
        // TODO: Replace placeholders with real pins for your domain and (optionally) intermediate CA keys
        static let pinsByHostSuffix: [String: [String]] = [
            AppConfig.domain: [
                "REPLACE_WITH_BASE64_PIN_1", // primary
                "REPLACE_WITH_BASE64_PIN_2"  // backup
            ]
        ]
    }

    private func spkiSHA256Base64(from trust: SecTrust) -> String? {
        // Evaluate trust first
        var evalError: CFError?
        guard SecTrustEvaluateWithError(trust, &evalError) else { return nil }

        // Prefer leaf (index 0)
        guard let cert = SecTrustGetCertificateAtIndex(trust, 0) else { return nil }

        // Extract public key
        guard let key = SecCertificateCopyKey(cert) ?? SecTrustCopyKey(trust) else { return nil }
        var pkError: Unmanaged<CFError>?
        guard let keyData = SecKeyCopyExternalRepresentation(key, &pkError) as Data? else { return nil }

        // Hash public key bytes (note: many ecosystems use SPKI; this approach pins the public key data)
        let digest = SHA256.hash(data: keyData)
        let hashData = Data(digest)
        return hashData.base64EncodedString()
    }

    private func pinnedHashes(for host: String) -> [String]? {
        for (suffix, pins) in Pinner.pinsByHostSuffix {
            if host.hasSuffix(suffix) { return pins }
        }
        return nil
    }

    private func isServerTrustValid(_ trust: SecTrust, host: String) -> Bool {
        guard let allowedPins = pinnedHashes(for: host), !allowedPins.isEmpty else { return false }
        guard let spki = spkiSHA256Base64(from: trust) else { return false }
        return allowedPins.contains(spki)
    }

    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        let method = challenge.protectionSpace.authenticationMethod
        if method == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            let host = challenge.protectionSpace.host
            if isServerTrustValid(trust, host: host) {
                completionHandler(.useCredential, URLCredential(trust: trust))
                return
            } else {
                completionHandler(.cancelAuthenticationChallenge, nil)
                return
            }
        }
        completionHandler(.performDefaultHandling, nil)
    }
}


