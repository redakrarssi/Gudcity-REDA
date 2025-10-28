package com.gudcity.app.data.db

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        // Example future migration: add indices or new columns
        // database.execSQL("CREATE INDEX IF NOT EXISTS idx_cards_updatedAt ON cards(updatedAt)")
    }
}


