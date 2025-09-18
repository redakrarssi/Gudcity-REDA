import Foundation

protocol ProfileRepositoryProtocol {
    func fetchProfile(completion: @escaping (Result<UserProfile, Error>) -> Void)
}

final class ProfileRepository: ProfileRepositoryProtocol {
    private let api: ApiClient
    private let cache = CacheStore.shared

    init(api: ApiClient = .shared) { self.api = api }

    func fetchProfile(completion: @escaping (Result<UserProfile, Error>) -> Void) {
        if let cached = cache.loadWithTimestamp(for: "profile")?.data,
           let decoded = try? JSONDecoder().decode(UserProfile.self, from: cached) {
            completion(.success(decoded))
        }
        api.getJSON(path: "/api/profile", as: UserProfile.self) { [weak self] result in
            if case .success(let profile) = result, let data = try? JSONEncoder().encode(profile) {
                self?.cache.save(data: data, for: "profile")
            }
            completion(result)
        }
    }
}


