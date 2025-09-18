package com.gudcity.app

import android.content.Intent
import android.net.Uri
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gudcity.app.ui.activities.MainActivity
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DeepLinkInstrumentedTest {
    @Test
    fun deepLink_to_cards_opens_activity() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://vcarda.com/cards"))
        ActivityScenario.launch<MainActivity>(intent).use { }
    }
}


