import XCTest
@testable import Vcarda

final class RoutesTests: XCTestCase {
    func testAllowedPaths() {
        let host = AppConfig.domain
        let allowed = ["/", "/cards/123", "/rewards/abc", "/dashboard", "/login", "/profile", "/programs", "/notifications", "/settings/security"]
        for p in allowed {
            let url = URL(string: "https://\(host)\(p)")!
            XCTAssertTrue(Routes.isVcardaUrl(url), "Expected allowed: \(p)")
        }
    }

    func testDisallowedHosts() {
        let url = URL(string: "https://example.com/cards")!
        XCTAssertFalse(Routes.isVcardaUrl(url))
    }
}


