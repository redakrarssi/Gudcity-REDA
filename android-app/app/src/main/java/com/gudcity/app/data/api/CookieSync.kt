package com.gudcity.app.data.api

import android.content.Context
import android.webkit.CookieManager
import android.webkit.WebView

object CookieSync {
    fun setupForDomain(webView: WebView, acceptThirdPartyCookies: Boolean) {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, acceptThirdPartyCookies)
    }

    fun warmUp(context: Context, baseUrl: String) {
        try {
            CookieManager.getInstance().getCookie(baseUrl)
        } catch (_: Throwable) {
        }
        syncNow()
    }

    fun syncNow() {
        try {
            CookieManager.getInstance().flush()
        } catch (_: Throwable) {
        }
    }
}


