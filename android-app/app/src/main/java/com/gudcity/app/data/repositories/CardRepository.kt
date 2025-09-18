package com.gudcity.app.data.repositories

import com.gudcity.app.data.api.ApiService
import com.gudcity.app.data.db.dao.CardDao
import com.gudcity.app.data.db.entities.CardEntity
import kotlinx.coroutines.flow.Flow

class CardRepository(
    private val api: ApiService,
    private val dao: CardDao
) {
    fun observeCards(): Flow<List<CardEntity>> = dao.observeCards()

    suspend fun refresh() {
        // TODO: map from real endpoint to entities
        // For now, leave cached data as-is to respect read-only parity
    }
}


