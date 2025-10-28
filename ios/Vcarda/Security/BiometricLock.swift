import Foundation
import LocalAuthentication
import UIKit

final class BiometricLock {
    static let shared = BiometricLock()
    private var blurView: UIVisualEffectView?

    func protectWindow(_ window: UIWindow?) {
        guard blurView == nil else { return }
        let blur = UIBlurEffect(style: .systemThinMaterial)
        let view = UIVisualEffectView(effect: blur)
        view.frame = window?.bounds ?? .zero
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window?.addSubview(view)
        blurView = view
    }

    func unprotectWindow() {
        blurView?.removeFromSuperview()
        blurView = nil
    }

    func authenticateIfNeeded(completion: @escaping (Bool) -> Void) {
        guard PrivacySettings.biometricLockEnabled else { completion(true); return }
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock Vcarda") { success, _ in
                DispatchQueue.main.async { completion(success) }
            }
        } else {
            DispatchQueue.main.async { completion(true) }
        }
    }
}


