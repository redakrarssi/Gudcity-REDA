package com.gudcity.app

import android.app.Application
import android.webkit.WebView
import com.gudcity.app.sync.PeriodicSync

class GudCityApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        PeriodicSync.schedule(this)
    }
}


