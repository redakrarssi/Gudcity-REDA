import Foundation

final class URLProtocolStub: URLProtocol {
    struct Stub {
        let data: Data?
        let response: HTTPURLResponse?
        let error: Error?
    }

    static var stubs: [URL: Stub] = [:]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        if let url = request.url, let stub = URLProtocolStub.stubs[url] {
            if let response = stub.response { client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed) }
            if let data = stub.data { client?.urlProtocol(self, didLoad: data) }
            if let error = stub.error { client?.urlProtocol(self, didFailWithError: error) }
        }
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}


