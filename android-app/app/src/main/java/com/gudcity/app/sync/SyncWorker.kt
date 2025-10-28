package com.gudcity.app.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.gudcity.app.data.api.NetworkModule
import com.gudcity.app.data.db.DatabaseModule
import com.gudcity.app.data.repositories.CardRepository
import com.gudcity.app.data.repositories.NotificationRepository
import com.gudcity.app.data.repositories.ProfileRepository

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        return try {
            val context = applicationContext
            val db = DatabaseModule.provideDatabase(context)
            val api = NetworkModule.provideApiService(context)

            val profileRepo = ProfileRepository(api, db.profileDao())
            val cardRepo = CardRepository(api, db.cardDao())
            val notifRepo = NotificationRepository(api, db.notificationDao())

            // Fetch → cache → serve (read-only parity)
            profileRepo.refresh()
            cardRepo.refresh()
            notifRepo.refresh()

            // Push pending ops if any (placeholder)
            // e.g., pending local logs or telemetry could be sent here in future

            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }
}


