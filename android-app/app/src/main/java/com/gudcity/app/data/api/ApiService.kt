package com.gudcity.app.data.api

import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("/api/points/award")
    suspend fun awardPoints(@Body body: AwardPointsRequest): AwardPointsResponse
}

data class AwardPointsRequest(val customerId: String, val points: Int)
data class AwardPointsResponse(val success: Boolean)


