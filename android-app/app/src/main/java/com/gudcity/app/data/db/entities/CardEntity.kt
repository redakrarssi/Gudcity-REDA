package com.gudcity.app.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cards")
data class CardEntity(
    @PrimaryKey val id: String,
    val customerId: String,
    val businessId: String,
    val programId: String,
    val cardNumber: String,
    val points: Int,
    val updatedAt: Long
)


