package com.gudcity.app.ui.fragments

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.gudcity.app.BuildConfig
import com.gudcity.app.R
import com.gudcity.app.databinding.FragmentWebviewBinding
import com.gudcity.app.data.api.CookieSync

class WebViewFragment : Fragment() {

    private var _binding: FragmentWebviewBinding? = null
    private val binding get() = _binding!!
    
    private var permissionRequest: PermissionRequest? = null
    
    // Camera permission launcher
    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            // Permission granted, grant the web permission request
            permissionRequest?.grant(permissionRequest?.resources)
        } else {
            // Permission denied, deny the web permission request
            permissionRequest?.deny()
        }
        permissionRequest = null
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentWebviewBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val webView = binding.webView
        val swipe = binding.swipeRefresh
        val settings = webView.settings
        val enableJs = resources.getBoolean(R.bool.webview_enable_js)
        val accept3p = resources.getBoolean(R.bool.webview_accept_third_party_cookies)

        settings.javaScriptEnabled = enableJs
        settings.domStorageEnabled = true
        settings.userAgentString = settings.userAgentString + " VcardaAndroidApp"
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportMultipleWindows(false)

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            try {
                settings.safeBrowsingEnabled = true
            } catch (_: Throwable) {
            }
        }

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        CookieSync.setupForDomain(webView, accept3p)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean = false

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Sync cookies after each navigation
                CookieSync.syncNow()
                swipe.isRefreshing = false
            }
        }
        
        // WebChromeClient to handle camera permission for QR scanner
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                
                // Check if the request is for camera access
                val cameraPermissionRequested = request.resources.any { 
                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE 
                }
                
                if (cameraPermissionRequested) {
                    // Check if we already have camera permission
                    when {
                        ContextCompat.checkSelfPermission(
                            requireContext(),
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED -> {
                            // Permission already granted, allow the web request
                            request.grant(request.resources)
                        }
                        else -> {
                            // Need to request permission from user
                            permissionRequest = request
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    }
                } else {
                    // Not a camera request, deny it
                    request.deny()
                }
            }
        }

        // Only enable pull-to-refresh when WebView is at the top
        webView.viewTreeObserver.addOnScrollChangedListener {
            // Check if WebView is scrolled to the top
            val atTop = webView.scrollY == 0
            // Enable swipe refresh only when at the top
            swipe.isEnabled = atTop
        }
        
        val baseUrl = getString(R.string.web_base_url)
        val path = arguments?.getString("path").orEmpty()
        val urlToLoad = if (path.isNotBlank()) baseUrl.trimEnd('/') + path else baseUrl
        swipe.setOnRefreshListener {
            webView.reload()
        }
        webView.loadUrl(urlToLoad)
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}


