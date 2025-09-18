import Foundation
import CoreData

final class CoreDataStack {
    static let shared = CoreDataStack()

    let persistentContainer: NSPersistentContainer

    private init() {
        let model = CoreDataStack.makeModel()
        persistentContainer = NSPersistentContainer(name: "VcardaStore", managedObjectModel: model)
        let desc = persistentContainer.persistentStoreDescriptions.first
        desc?.shouldMigrateStoreAutomatically = true
        desc?.shouldInferMappingModelAutomatically = true
        persistentContainer.loadPersistentStores { storeDesc, error in
            if let error = error {
                // Cache-only data: if incompatible, wipe and recreate the store
                if let url = storeDesc.url {
                    try? self.persistentContainer.persistentStoreCoordinator.destroyPersistentStore(at: url, ofType: NSSQLiteStoreType, options: nil)
                    do {
                        try self.persistentContainer.persistentStoreCoordinator.addPersistentStore(ofType: NSSQLiteStoreType, configurationName: nil, at: url, options: [NSMigratePersistentStoresAutomaticallyOption: true, NSInferMappingModelAutomaticallyOption: true])
                    } catch {
                        assertionFailure("Core Data store recreate failed: \(error)")
                    }
                }
            }
        }
        persistentContainer.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        persistentContainer.viewContext.automaticallyMergesChangesFromParent = true
    }

    var context: NSManagedObjectContext { persistentContainer.viewContext }

    func saveContext() {
        let context = persistentContainer.viewContext
        guard context.hasChanges else { return }
        do { try context.save() } catch { print("Core Data save error: \(error)") }
    }

    private static func makeModel() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()

        let entity = NSEntityDescription()
        entity.name = "CachedResponse"
        entity.managedObjectClassName = "NSManagedObject"

        let keyAttr = NSAttributeDescription()
        keyAttr.name = "key"
        keyAttr.attributeType = .stringAttributeType
        keyAttr.isOptional = false
        keyAttr.isIndexed = true

        let blobAttr = NSAttributeDescription()
        blobAttr.name = "blob"
        blobAttr.attributeType = .binaryDataAttributeType
        blobAttr.isOptional = false

        let updatedAtAttr = NSAttributeDescription()
        updatedAtAttr.name = "updatedAt"
        updatedAtAttr.attributeType = .dateAttributeType
        updatedAtAttr.isOptional = false

        entity.properties = [keyAttr, blobAttr, updatedAtAttr]

        model.entities = [entity]
        return model
    }
}


