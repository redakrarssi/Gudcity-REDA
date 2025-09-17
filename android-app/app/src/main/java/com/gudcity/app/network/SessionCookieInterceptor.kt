package com.gudcity.app.network

import android.webkit.CookieManager
import okhttp3.Interceptor
import okhttp3.Response

class SessionCookieInterceptor(private val baseUrl: String, private val csrfCookieName: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val cookieString = CookieManager.getInstance().getCookie(baseUrl)
        val csrf = readCsrfTokenFor(baseUrl, csrfCookieName)
        val request = original.newBuilder().apply {
            if (!cookieString.isNullOrBlank()) header("Cookie", cookieString)
            if (!csrf.isNullOrBlank()) header("x-csrf-token", csrf)
        }.build()
        return chain.proceed(request)
    }

    private fun readCsrfTokenFor(url: String, cookieName: String): String? {
        val cookie = CookieManager.getInstance().getCookie(url) ?: return null
        return cookie.split(';')
            .map { it.trim() }
            .firstOrNull { it.startsWith("$cookieName=") }
            ?.substringAfter('=')
    }
}


