package com.gudcity.app.ui.activities

import android.net.Uri
import android.os.Bundle
import android.os.Build
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import com.gudcity.app.R
import com.gudcity.app.databinding.ActivityMainBinding
import com.gudcity.app.ui.viewmodels.MainViewModel
import com.gudcity.app.data.api.CookieSync
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHost = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHost.navController

        // Warm up and sync cookies for the site domain on app start
        CookieSync.warmUp(this, getString(R.string.web_base_url))

        handleDeepLink(intent?.data)

        // Request notifications permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val launcher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ -> }
            launcher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        handleDeepLink(intent?.data)
    }

    private fun handleDeepLink(data: Uri?) {
        if (data != null) {
            val path = data.path ?: ""
            val args = Bundle().apply { putString("path", path) }
            navController.navigate(R.id.webViewFragment, args)
        }
    }
}


