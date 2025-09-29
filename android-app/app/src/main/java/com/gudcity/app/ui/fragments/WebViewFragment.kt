package com.gudcity.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment
import com.gudcity.app.BuildConfig
import com.gudcity.app.R
import com.gudcity.app.databinding.FragmentWebviewBinding
import com.gudcity.app.data.api.CookieSync

class WebViewFragment : Fragment() {

    private var _binding: FragmentWebviewBinding? = null
    private val binding get() = _binding!!

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


