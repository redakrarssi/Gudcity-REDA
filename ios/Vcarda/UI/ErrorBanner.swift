import UIKit

final class ErrorBanner: UIView {
    private let label = UILabel()
    private var hideWorkItem: DispatchWorkItem?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor.systemRed.withAlphaComponent(0.95)
        isAccessibilityElement = true
        accessibilityTraits = .staticText

        label.textColor = .white
        label.font = .preferredFont(forTextStyle: .subheadline)
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 2
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            label.topAnchor.constraint(equalTo: topAnchor, constant: 10),
            label.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10)
        ])
        layer.cornerRadius = 10
        layer.masksToBounds = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func show(in view: UIView, message: String, duration: TimeInterval = 3) {
        label.text = sanitized(NSLocalizedString(messageKey(for: message), comment: ""))
        accessibilityLabel = label.text
        alpha = 0
        translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(self)
        NSLayoutConstraint.activate([
            leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 12),
            trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -12),
            topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12)
        ])
        if UIAccessibility.isReduceMotionEnabled {
            self.alpha = 1
        } else {
            UIView.animate(withDuration: 0.25) { self.alpha = 1 }
        }
        hideWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.dismiss() }
        hideWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + duration, execute: work)
        UIAccessibility.post(notification: .announcement, argument: label.text)
    }

    func dismiss() {
        if UIAccessibility.isReduceMotionEnabled {
            self.alpha = 0
            self.removeFromSuperview()
        } else {
            UIView.animate(withDuration: 0.25, animations: { self.alpha = 0 }) { _ in self.removeFromSuperview() }
        }
    }

    private func sanitized(_ text: String) -> String {
        let redactedEmails = text.replacingOccurrences(of: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", with: "[redacted]", options: [.regularExpression, .caseInsensitive])
        return redactedEmails.replacingOccurrences(of: "[0-9]{5,}", with: "[redacted]", options: [.regularExpression])
    }

    private func messageKey(for raw: String) -> String {
        switch raw {
        case "Load failed. Check your connection.": return "load_failed"
        case "Unable to load. You might be offline.": return "load_unable"
        case "Content refreshed": return "content_refreshed"
        default: return raw
        }
    }
}


