import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = UINavigationController(rootViewController: WebViewController())
        self.window = window
        if ProcessInfo.processInfo.environment["UITEST_DARK_MODE"] == "1" {
            window.overrideUserInterfaceStyle = .dark
        } else {
            window.overrideUserInterfaceStyle = .unspecified
        }
        window.makeKeyAndVisible()
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else { return }
        UniversalLinkHandler.route(url: url)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        BiometricLock.shared.protectWindow(window)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        BiometricLock.shared.authenticateIfNeeded { success in
            if success {
                BiometricLock.shared.unprotectWindow()
            }
        }
    }
}


