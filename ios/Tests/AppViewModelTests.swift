import XCTest
@testable import Vcarda

final class AppViewModelTests: XCTestCase {
    func testRefreshCardsSuccess() {
        let json = """[{"id":"1","customerId":"c1","businessId":"b1","programId":"p1","cardNumber":"GC-1","points":10}]""".data(using: .utf8)!
        let url = AppConfig.baseURL.appendingPathComponent("/api/cards")
        URLProtocolStub.stubs = [url: URLProtocolStub.Stub(data: json, response: HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil), error: nil)]

        CookieBridge.sessionFactory = { config, delegate in
            let cfg = config
            cfg.protocolClasses = [URLProtocolStub.self]
            return URLSession(configuration: cfg, delegate: delegate, delegateQueue: .main)
        }

        let vm = AppViewModel(cards: CardRepository(api: ApiClient()))
        let exp = expectation(description: "cards")
        vm.refreshCards { ok in
            XCTAssertTrue(ok)
            XCTAssertEqual(vm.latestCards.count, 1)
            exp.fulfill()
        }
        wait(for: [exp], timeout: 2)
        CookieBridge.sessionFactory = nil
        URLProtocolStub.stubs = [:]
    }
}


