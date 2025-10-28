import Foundation
import BackgroundTasks
import CoreData

enum BackgroundTasksHelper {
    static func register() {
        if #available(iOS 13.0, *) {
            BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.yourorg.vcarda.refresh", using: nil) { task in
                performRefresh { success in
                    scheduleRefresh()
                    task.setTaskCompleted(success: success)
                }
            }
        }
    }

    static func scheduleRefresh() {
        if #available(iOS 13.0, *) {
            let request = BGAppRefreshTaskRequest(identifier: "com.yourorg.vcarda.refresh")
            request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
            _ = try? BGTaskScheduler.shared.submit(request)
        }
    }

    static func performRefresh(completion: @escaping (Bool) -> Void) {
        // Lightweight sync: fetch cards and cache raw JSON blob
        ApiClient.shared.get(path: "/api/cards") { result in
            switch result {
            case .failure:
                completion(false)
            case .success(let data):
                CacheStore.shared.save(data: data, for: "cards")
                completion(true)
            }
        }
    }
}


