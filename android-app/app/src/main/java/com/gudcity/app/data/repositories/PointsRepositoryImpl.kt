package com.gudcity.app.data.repositories

import com.gudcity.app.data.api.ApiService
import com.gudcity.app.data.api.AwardPointsRequest
import com.gudcity.app.domain.repositories.PointsRepository

class PointsRepositoryImpl(private val api: ApiService) : PointsRepository {
    override suspend fun awardPoints(customerId: String, points: Int): Boolean {
        val res = api.awardPoints(AwardPointsRequest(customerId, points))
        return res.success
    }
}


