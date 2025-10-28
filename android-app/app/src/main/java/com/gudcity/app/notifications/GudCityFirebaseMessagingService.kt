package com.gudcity.app.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.gudcity.app.R
import com.gudcity.app.ui.activities.MainActivity
import com.google.firebase.messaging.FirebaseMessaging

class GudCityFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // TODO: send token to backend if required by server
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: getString(R.string.app_name)
        val body = message.notification?.body ?: ""
        val path = message.data["path"] ?: "/"

        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            action = Intent.ACTION_VIEW
            // Let MainActivity/WebViewFragment navigate to this path
            data = android.net.Uri.parse(getString(R.string.web_base_url).trimEnd('/') + path)
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT else PendingIntent.FLAG_ONE_SHOT
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, pendingFlags)

        val notification = NotificationCompat.Builder(this, "default")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }
}


