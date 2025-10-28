package com.gudcity.app.realtime

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class RealtimeWebSocketManager(private val client: OkHttpClient) {
    private var socket: WebSocket? = null

    fun connect(url: String, listener: WebSocketListener) {
        val request = Request.Builder().url(url).build()
        socket = client.newWebSocket(request, listener)
    }

    fun disconnect() {
        socket?.close(1000, null)
        socket = null
    }
}


