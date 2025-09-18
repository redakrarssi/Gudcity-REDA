import Foundation
import CoreData

protocol CardRepositoryProtocol {
    func fetchCards(completion: @escaping (Result<[LoyaltyCard], Error>) -> Void)
}

final class CardRepository: CardRepositoryProtocol {
    private let api: ApiClient
    private let coreData: CoreDataStack
    private let cache = CacheStore.shared

    init(api: ApiClient = .shared, coreData: CoreDataStack = .shared) {
        self.api = api
        self.coreData = coreData
    }

    func fetchCards(completion: @escaping (Result<[LoyaltyCard], Error>) -> Void) {
        // Stale-while-revalidate: return cached immediately if available
        if let cached = cache.loadWithTimestamp(for: "cards")?.data,
           let decoded = try? JSONDecoder().decode([LoyaltyCard].self, from: cached) {
            completion(.success(decoded))
        }
        api.getJSON(path: "/api/cards", as: [LoyaltyCard].self) { [weak self] result in
            if case .success(let cards) = result, let data = try? JSONEncoder().encode(cards) {
                self?.cache.save(data: data, for: "cards")
            }
            completion(result)
        }
    }
}


