import UIKit

final class OfflineOverlay: UIView {
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private let backoff = BackoffScheduler()
    var onRetry: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .systemBackground

        titleLabel.text = NSLocalizedString("offline_title", comment: "")
        titleLabel.font = .preferredFont(forTextStyle: .title2)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.isAccessibilityElement = true
        titleLabel.accessibilityTraits = .header

        subtitleLabel.text = NSLocalizedString("offline_subtitle", comment: "")
        subtitleLabel.font = .preferredFont(forTextStyle: .subheadline)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.adjustsFontForContentSizeCategory = true
        subtitleLabel.isAccessibilityElement = true

        retryButton.setTitle(NSLocalizedString("retry", comment: ""), for: .normal)
        retryButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        retryButton.accessibilityLabel = NSLocalizedString("retry_loading", comment: "")
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        retryButton.accessibilityTraits = [.button]

        let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func retryTapped() {
        onRetry?()
    }

    func scheduleAutoRetry() {
        let delay = backoff.nextDelay()
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.onRetry?()
        }
    }

    func resetBackoff() { backoff.reset() }
}


