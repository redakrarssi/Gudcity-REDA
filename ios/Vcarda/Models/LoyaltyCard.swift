import Foundation

struct LoyaltyCard: Codable, Equatable {
    let id: String
    let customerId: String
    let businessId: String
    let programId: String
    let cardNumber: String
    let points: Int
}


