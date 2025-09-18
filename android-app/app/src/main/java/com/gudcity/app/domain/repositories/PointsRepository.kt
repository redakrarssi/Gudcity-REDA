package com.gudcity.app.domain.repositories

interface PointsRepository {
    suspend fun awardPoints(customerId: String, points: Int): Boolean
}


