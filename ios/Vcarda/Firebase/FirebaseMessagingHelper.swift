#if canImport(Firebase)
import Foundation
import Firebase
import FirebaseMessaging

enum FirebaseMessagingHelper {
    static func configure() {
        FirebaseApp.configure()
        Messaging.messaging().isAutoInitEnabled = true
    }
}
#endif


