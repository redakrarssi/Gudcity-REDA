package com.gudcity.app

import android.app.Application
import android.webkit.WebView

class GudCityApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
    }
}


