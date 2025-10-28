package com.gudcity.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.gudcity.app.data.db.dao.CardDao
import com.gudcity.app.data.db.dao.NotificationDao
import com.gudcity.app.data.db.dao.ProfileDao
import com.gudcity.app.data.db.entities.CardEntity
import com.gudcity.app.data.db.entities.NotificationEntity
import com.gudcity.app.data.db.entities.ProfileEntity

@Database(
    entities = [ProfileEntity::class, CardEntity::class, NotificationEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun profileDao(): ProfileDao
    abstract fun cardDao(): CardDao
    abstract fun notificationDao(): NotificationDao
}


