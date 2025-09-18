import UIKit
import UserNotifications
import BackgroundTasks
#if canImport(Firebase)
import Firebase
import FirebaseMessaging
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if AppConfig.isPushEnabled {
            configureNotifications(application: application)
        }
        registerBackgroundTasks()
        scheduleAppRefresh()
        #if canImport(Firebase)
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        #endif
        if AppConfig.isAnalyticsEnabledByDefault {
            AnalyticsService.configureIfAllowed()
        }
        CookieBridge.startCookieSyncObserving()
        return true
    }

    private func configureNotifications(application: UIApplication) {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
        application.registerForRemoteNotifications()
    }

    // MARK: Background Tasks
    private func registerBackgroundTasks() {
        if #available(iOS 13.0, *) {
            BackgroundTasksHelper.register()
        }
    }

    private func scheduleAppRefresh() {
        if #available(iOS 13.0, *) {
            BackgroundTasksHelper.scheduleRefresh()
        }
    }

    // MARK: Push Token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if canImport(Firebase)
        Messaging.messaging().apnsToken = deviceToken
        #endif
    }
}

#if canImport(Firebase)
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        // TODO: send fcmToken to your backend for the authenticated user
        print("FCM token: \(fcmToken ?? "nil")")
    }
}
#endif


