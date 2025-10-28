package com.gudcity.app.data.repositories

import com.gudcity.app.data.api.ApiService
import com.gudcity.app.data.db.dao.ProfileDao
import com.gudcity.app.data.db.entities.ProfileEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.flow

class ProfileRepository(
    private val api: ApiService,
    private val dao: ProfileDao
) {
    fun observeProfile(): Flow<ProfileEntity?> = dao.observeProfile()

    suspend fun refresh() {
        // TODO: Replace with real endpoint mapping
        val existing = dao.observeProfile().firstOrNull()
        if (existing == null) {
            dao.upsert(ProfileEntity(id = "me", name = "", email = "", updatedAt = System.currentTimeMillis()))
        }
    }
}


