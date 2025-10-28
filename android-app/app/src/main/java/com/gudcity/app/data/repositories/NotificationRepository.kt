package com.gudcity.app.data.repositories

import com.gudcity.app.data.api.ApiService
import com.gudcity.app.data.db.dao.NotificationDao
import com.gudcity.app.data.db.entities.NotificationEntity
import kotlinx.coroutines.flow.Flow

class NotificationRepository(
    private val api: ApiService,
    private val dao: NotificationDao
) {
    fun observeNotifications(): Flow<List<NotificationEntity>> = dao.observeNotifications()

    suspend fun refresh() {
        // TODO: map from real endpoint
    }

    suspend fun markRead(id: String) {
        dao.markRead(id)
    }
}


