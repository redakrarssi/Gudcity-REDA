package com.gudcity.app.domain.usecases

import com.gudcity.app.domain.repositories.PointsRepository

class AwardPointsUseCase(private val repository: PointsRepository) {
    suspend operator fun invoke(customerId: String, points: Int): Boolean {
        return repository.awardPoints(customerId, points)
    }
}


