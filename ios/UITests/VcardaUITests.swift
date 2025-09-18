import XCTest

final class VcardaUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
    }

    func testWebViewLoadsHome() {
        // Basic smoke test: verify WebView exists and loads
        let webView = app.webViews.element(boundBy: 0)
        XCTAssertTrue(webView.waitForExistence(timeout: 10))
    }

    func testCaptureScreenshotsLightAndDark() {
        let webView = app.webViews.element(boundBy: 0)
        XCTAssertTrue(webView.waitForExistence(timeout: 10))

        // Light mode screenshot
        let lightShot = XCUIScreen.main.screenshot()
        let lightAttachment = XCTAttachment(screenshot: lightShot)
        lightAttachment.lifetime = .keepAlways
        lightAttachment.name = "Home-Light-en"
        add(lightAttachment)

        // Relaunch in dark mode
        let darkApp = XCUIApplication()
        darkApp.launchEnvironment["UITEST_DARK_MODE"] = "1"
        darkApp.launchArguments += ["-AppleLanguages", "(ar)", "-AppleLocale", "ar_SA"]
        darkApp.launch()
        let darkWebView = darkApp.webViews.element(boundBy: 0)
        XCTAssertTrue(darkWebView.waitForExistence(timeout: 10))
        let darkShot = XCUIScreen.main.screenshot()
        let darkAttachment = XCTAttachment(screenshot: darkShot)
        darkAttachment.lifetime = .keepAlways
        darkAttachment.name = "Home-Dark-ar"
        add(darkAttachment)
    }
}


