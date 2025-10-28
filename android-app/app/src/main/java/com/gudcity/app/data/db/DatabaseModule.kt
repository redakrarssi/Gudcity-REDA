package com.gudcity.app.data.db

import android.content.Context
import androidx.room.Room

object DatabaseModule {
    @Volatile private var instance: AppDatabase? = null

    fun provideDatabase(context: Context): AppDatabase {
        val existing = instance
        if (existing != null) return existing

        val db = Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "gudcity.db")
            .fallbackToDestructiveMigration()
            //.addMigrations(MIGRATION_1_2) // Enable when version > 1
            .build()
        instance = db
        return db
    }
}


