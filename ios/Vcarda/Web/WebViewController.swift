import UIKit
import WebKit
import SafariServices

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let allowedHost = AppConfig.domain
    private let refreshControl = UIRefreshControl()
    private var banner: ErrorBanner?
    private var offlineOverlay: OfflineOverlay?

    private lazy var webView: WKWebView = {
        let pagePrefs = WKWebpagePreferences()
        pagePrefs.allowsContentJavaScript = true // site requires JS

        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = pagePrefs
        config.limitsNavigationsToAppBoundDomains = false
        config.allowsInlineMediaPlayback = false
        config.mediaTypesRequiringUserActionForPlayback = .all
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(iOS 14.0, *) {
            config.allowsPictureInPictureMediaPlayback = false
        }
        if #available(iOS 10.0, *) {
            config.allowsAirPlayForMediaPlayback = false
        }

        let wv = WKWebView(frame: .zero, configuration: config)
        let ua = wv.value(forKey: "userAgent") as? String ?? "iOS"
        wv.customUserAgent = ua + " Vcarda-iOS"
        return wv
    }()

    private func setupContentBlockingRules() {
        // Content rules: block mixed content and common trackers
        let rules = """
        [
          {"trigger": {"url-filter": "^http://"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*\\.doubleclick\\.net/"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*\\.googletagmanager\\.com/"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*\\.google-analytics\\.com/"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*connect\\.facebook\\.net/"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*\\.facebook\\.net/"}, "action": {"type": "block"}},
          {"trigger": {"url-filter": ".*analytics\\.tiktok\\.com/"}, "action": {"type": "block"}}
        ]
        """
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "VcardaContentRules", encodedContentRuleList: rules) { [weak self] list, _ in
            guard let list = list, let controller = self?.webView.configuration.userContentController else { return }
            controller.add(list)
            // Ensure no injected user scripts; register a narrow audited message handler
            controller.removeAllUserScripts()
            let handler = SafeScriptMessageHandler(allowedHost: self?.allowedHost ?? AppConfig.domain) { event, params in
                AnalyticsService.logAction(event, parameters: params)
            }
            controller.add(handler, name: "vcardaSafe")
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        overrideUserInterfaceStyle = .unspecified
        webView.navigationDelegate = self
        webView.uiDelegate = self
        view.backgroundColor = .systemBackground
        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        setupContentBlockingRules()
        setupAccessibility()
        setupRefreshControl()
        applyDynamicTypeZoom()
        NotificationCenter.default.addObserver(self, selector: #selector(contentSizeCategoryChanged), name: UIContentSizeCategory.didChangeNotification, object: nil)
        AnalyticsService.logScreen("WebView:Home")
        webView.load(URLRequest(url: AppConfig.baseURL))
        NotificationCenter.default.addObserver(self, selector: #selector(handleUniversalLink(_:)), name: UniversalLinkHandler.notificationName, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func setupAccessibility() {
        webView.isAccessibilityElement = true
        webView.accessibilityLabel = NSLocalizedString("accessibility_webview_label", comment: "")
        webView.accessibilityHint = NSLocalizedString("accessibility_webview_hint", comment: "")
        webView.accessibilityTraits = .allowsDirectInteraction
    }

    private func setupRefreshControl() {
        refreshControl.addTarget(self, action: #selector(refreshTriggered), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
    }

    @objc private func refreshTriggered() {
        webView.reload()
    }

    @objc private func contentSizeCategoryChanged() {
        applyDynamicTypeZoom()
    }

    private func applyDynamicTypeZoom() {
        if #available(iOS 14.0, *) {
            let category = traitCollection.preferredContentSizeCategory
            webView.pageZoom = zoomFactor(for: category)
        }
    }

    private func zoomFactor(for category: UIContentSizeCategory) -> CGFloat {
        switch category {
        case .extraSmall: return 0.85
        case .small: return 0.9
        case .medium: return 0.95
        case .large: return 1.0
        case .extraLarge: return 1.08
        case .extraExtraLarge: return 1.16
        case .extraExtraExtraLarge: return 1.24
        case .accessibilityMedium: return 1.35
        case .accessibilityLarge: return 1.5
        case .accessibilityExtraLarge: return 1.7
        case .accessibilityExtraExtraLarge: return 1.9
        case .accessibilityExtraExtraExtraLarge: return 2.1
        default: return 1.0
        }
    }

    @objc private func handleUniversalLink(_ note: Notification) {
        guard let url = note.userInfo?["url"] as? URL else { return }
        if let host = url.host, host.contains(allowedHost) {
            webView.load(URLRequest(url: url))
        } else {
            let vc = SFSafariViewController(url: url)
            present(vc, animated: true)
        }
    }

    // MARK: WKNavigationDelegate
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        // Allow only http(s) schemes
        guard scheme == "https" || scheme == "http" else {
            decisionHandler(.cancel)
            return
        }
        // Restrict to our domain; open external links in Safari
        if let host = url.host, host.contains(allowedHost) {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            let vc = SFSafariViewController(url: url)
            present(vc, animated: !UIAccessibility.isReduceMotionEnabled)
        }
    }

    // MARK: WKUIDelegate (handle target=_blank, etc.)
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if refreshControl.isRefreshing {
            refreshControl.endRefreshing()
            UIAccessibility.post(notification: .announcement, argument: "Content refreshed")
        }
        if let url = webView.url {
            AnalyticsService.logScreen("WebView:\(url.path.isEmpty ? "/" : url.path)")
        }
        hideOffline()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showError("Load failed. Check your connection.")
        showOffline()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showError("Unable to load. You might be offline.")
        showOffline()
    }

    private func showError(_ message: String) {
        if banner == nil { banner = ErrorBanner() }
        if let banner, let container = view { banner.show(in: container, message: message) }
    }

    private func showOffline() {
        guard offlineOverlay == nil else { return }
        let overlay = OfflineOverlay(frame: view.bounds)
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.onRetry = { [weak self] in self?.webView.reload() }
        view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        overlay.scheduleAutoRetry()
        offlineOverlay = overlay
    }

    private func hideOffline() {
        offlineOverlay?.removeFromSuperview()
        offlineOverlay = nil
    }
}


