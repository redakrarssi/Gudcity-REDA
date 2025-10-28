import UIKit
#if canImport(AppTrackingTransparency)
import AppTrackingTransparency
#endif

final class PrivacyViewController: UIViewController {
    private let textView = UITextView()
    private let acceptAnalytics = UISwitch()
    private let acceptCrash = UISwitch()
    private let acceptTracking = UISwitch()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let policy = NSLocalizedString("privacy_policy_text", comment: "")
        let terms = NSLocalizedString("terms_text", comment: "")
        textView.text = policy + "\n\n" + terms
        textView.isEditable = false
        textView.adjustsFontForContentSizeCategory = true
        textView.font = .preferredFont(forTextStyle: .body)
        textView.translatesAutoresizingMaskIntoConstraints = false

        let analyticsLabel = UILabel()
        analyticsLabel.text = NSLocalizedString("allow_analytics", comment: "")
        analyticsLabel.font = .preferredFont(forTextStyle: .body)

        let crashLabel = UILabel()
        crashLabel.text = NSLocalizedString("allow_crash", comment: "")
        crashLabel.font = .preferredFont(forTextStyle: .body)

        let trackLabel = UILabel()
        trackLabel.text = NSLocalizedString("allow_tracking", comment: "")
        trackLabel.font = .preferredFont(forTextStyle: .body)

        acceptAnalytics.isOn = PrivacySettings.analyticsEnabled
        acceptCrash.isOn = PrivacySettings.crashReportingEnabled
        acceptTracking.isOn = PrivacySettings.trackingEnabled
        acceptAnalytics.addTarget(self, action: #selector(toggleChanged), for: .valueChanged)
        acceptCrash.addTarget(self, action: #selector(toggleChanged), for: .valueChanged)
        acceptTracking.addTarget(self, action: #selector(toggleChanged), for: .valueChanged)

        let stack = UIStackView(arrangedSubviews: [textView, analyticsLabel, acceptAnalytics, crashLabel, acceptCrash, trackLabel, acceptTracking])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16)
        ])
    }

    @objc private func toggleChanged() {
        PrivacySettings.analyticsEnabled = acceptAnalytics.isOn
        PrivacySettings.crashReportingEnabled = acceptCrash.isOn
        PrivacySettings.trackingEnabled = acceptTracking.isOn
        AnalyticsService.configureIfAllowed()
        requestATTIfNeeded()
    }

    private func requestATTIfNeeded() {
        #if canImport(AppTrackingTransparency)
        guard PrivacySettings.trackingEnabled else { return }
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization { _ in }
        }
        #endif
    }
}


