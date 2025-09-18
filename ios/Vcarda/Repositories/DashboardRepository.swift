import Foundation

struct DashboardSnapshot: Codable, Equatable {
    let cards: [LoyaltyCard]
    let updatedAt: Date
}

protocol DashboardRepositoryProtocol {
    func fetchDashboard(completion: @escaping (Result<DashboardSnapshot, Error>) -> Void)
}

final class DashboardRepository: DashboardRepositoryProtocol {
    private let api: ApiClient
    private let cache = CacheStore.shared

    init(api: ApiClient = .shared) { self.api = api }

    func fetchDashboard(completion: @escaping (Result<DashboardSnapshot, Error>) -> Void) {
        if let cached = cache.loadWithTimestamp(for: "dashboard")?.data,
           let decoded = try? JSONDecoder().decode(DashboardSnapshot.self, from: cached) {
            completion(.success(decoded))
        }
        api.getJSON(path: "/api/dashboard", as: DashboardSnapshot.self) { [weak self] result in
            if case .success(let snap) = result, let data = try? JSONEncoder().encode(snap) {
                self?.cache.save(data: data, for: "dashboard")
            }
            completion(result)
        }
    }
}


