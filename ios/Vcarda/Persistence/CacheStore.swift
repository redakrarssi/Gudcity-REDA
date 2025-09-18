import Foundation
import CoreData

final class CacheStore {
    static let shared = CacheStore()
    private let stack = CoreDataStack.shared

    func save(data: Data, for key: String) {
        let ctx = stack.context
        let fetch = NSFetchRequest<NSManagedObject>(entityName: "CachedResponse")
        fetch.predicate = NSPredicate(format: "key == %@", key)
        let entity = NSEntityDescription.entity(forEntityName: "CachedResponse", in: ctx)!
        let obj = (try? ctx.fetch(fetch).first) ?? NSManagedObject(entity: entity, insertInto: ctx)
        obj.setValue(key, forKey: "key")
        obj.setValue(data, forKey: "blob")
        obj.setValue(Date(), forKey: "updatedAt")
        stack.saveContext()
    }

    func load(for key: String) -> Data? {
        let ctx = stack.context
        let fetch = NSFetchRequest<NSManagedObject>(entityName: "CachedResponse")
        fetch.predicate = NSPredicate(format: "key == %@", key)
        return try? ctx.fetch(fetch).first?.value(forKey: "blob") as? Data
    }

    func loadWithTimestamp(for key: String) -> (data: Data, updatedAt: Date)? {
        let ctx = stack.context
        let fetch = NSFetchRequest<NSManagedObject>(entityName: "CachedResponse")
        fetch.predicate = NSPredicate(format: "key == %@", key)
        if let obj = try? ctx.fetch(fetch).first,
           let data = obj.value(forKey: "blob") as? Data,
           let updated = obj.value(forKey: "updatedAt") as? Date {
            return (data, updated)
        }
        return nil
    }
}


