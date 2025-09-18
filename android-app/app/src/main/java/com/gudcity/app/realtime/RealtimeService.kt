package com.gudcity.app.realtime

import android.content.Context
import com.gudcity.app.R
import com.gudcity.app.data.api.NetworkModule
import com.gudcity.app.data.db.DatabaseModule
import com.gudcity.app.data.repositories.CardRepository
import com.gudcity.app.data.repositories.NotificationRepository
import com.gudcity.app.data.repositories.ProfileRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString

class RealtimeService(private val context: Context) {
    private val scope = CoroutineScope(Dispatchers.IO)
    private var webSocket: WebSocket? = null
    private var reconnectJob: Job? = null

    private val okHttpClient: OkHttpClient by lazy { NetworkModule.provideOkHttpClient(context) }

    fun start() {
        connect()
    }

    fun stop() {
        reconnectJob?.cancel()
        webSocket?.close(1000, null)
        webSocket = null
    }

    private fun connect() {
        val baseUrl = context.getString(R.string.web_base_url)
        val wsUrl = baseUrl.replaceFirst(Regex("^https"), "wss").replaceFirst(Regex("^http"), "ws").trimEnd('/') + "/ws"
        val request = Request.Builder().url(wsUrl).build()
        webSocket = okHttpClient.newWebSocket(request, listener)
    }

    private val listener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: okhttp3.Response) {
            // Connected
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            handleMessage(text)
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
            handleMessage(bytes.utf8())
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: okhttp3.Response?) {
            scheduleReconnect()
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            scheduleReconnect()
        }
    }

    private fun handleMessage(payload: String) {
        // Minimal routing; in real app use a proper JSON model and types
        scope.launch {
            val db = DatabaseModule.provideDatabase(context)
            val api = NetworkModule.provideApiService(context)
            val profileRepo = ProfileRepository(api, db.profileDao())
            val cardRepo = CardRepository(api, db.cardDao())
            val notifRepo = NotificationRepository(api, db.notificationDao())

            // For now, on any message, refresh caches (read-only parity)
            profileRepo.refresh()
            cardRepo.refresh()
            notifRepo.refresh()
        }
    }

    private fun scheduleReconnect() {
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch {
            var delayMs = 1000L
            while (isActive) {
                delay(delayMs)
                try {
                    connect()
                    break
                } catch (_: Throwable) {
                }
                delayMs = (delayMs * 2).coerceAtMost(60_000L)
            }
        }
    }
}


