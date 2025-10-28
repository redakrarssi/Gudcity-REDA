import Foundation

final class AppViewModel {
    private let cards: CardRepositoryProtocol
    private(set) var latestCards: [LoyaltyCard] = []

    init(cards: CardRepositoryProtocol = CardRepository()) {
        self.cards = cards
    }

    func refreshCards(completion: @escaping (Bool) -> Void) {
        cards.fetchCards { result in
            switch result {
            case .success(let cards):
                self.latestCards = cards
                completion(true)
            case .failure:
                completion(false)
            }
        }
    }
}


