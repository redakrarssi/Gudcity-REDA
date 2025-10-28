import XCTest
@testable import Vcarda

final class SceneRoutingTests: XCTestCase {
    func testSceneContinueUserActivityRoutesAllowedLink() {
        let scene = SceneDelegate()
        let activity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
        let url = URL(string: "https://\(AppConfig.domain)/cards/123")!
        activity.webpageURL = url

        // Spy on notifications
        let exp = expectation(description: "route")
        let observer = NotificationCenter.default.addObserver(forName: UniversalLinkHandler.notificationName, object: nil, queue: .main) { note in
            let routed = note.userInfo?["url"] as? URL
            XCTAssertEqual(routed, url)
            exp.fulfill()
        }

        scene.scene(UIApplication.shared.connectedScenes.first!, continue: activity)
        wait(for: [exp], timeout: 1)
        NotificationCenter.default.removeObserver(observer)
    }
}


