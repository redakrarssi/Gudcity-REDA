package com.gudcity.app.data.api

import android.content.Context
import com.gudcity.app.R
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object NetworkModule {
    @Volatile private var retrofitInstance: Retrofit? = null
    @Volatile private var apiServiceInstance: ApiService? = null
    @Volatile private var okHttpInstance: OkHttpClient? = null

    fun provideOkHttpClient(context: Context): OkHttpClient {
        val existing = okHttpInstance
        if (existing != null) return existing

        val baseUrl = context.getString(R.string.web_base_url).trimEnd('/') + "/"
        val csrfName = context.getString(R.string.csrf_cookie_name)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val host = baseUrl.removePrefix("https://").removePrefix("http://").substringBefore('/')
        val pinnerBuilder = CertificatePinner.Builder()
        val certPin = com.gudcity.app.BuildConfig.CERT_PIN
        if (certPin.isNotBlank()) {
            pinnerBuilder.add(host, certPin)
        }
        val pinner = pinnerBuilder.build()

        val cacheSize = 10L * 1024L * 1024L // 10MB
        val cache = okhttp3.Cache(context.cacheDir, cacheSize)
        val client = OkHttpClient.Builder()
            .cache(cache)
            .addNetworkInterceptor { chain ->
                val request = chain.request()
                val response = chain.proceed(request)
                if (request.method == "GET" && response.header("Cache-Control").isNullOrBlank()) {
                    response.newBuilder()
                        .header("Cache-Control", "public, max-age=60")
                        .build()
                } else response
            }
            .addInterceptor { chain ->
                // Ensure gzip accepted and basic caching headers respected
                val req = chain.request().newBuilder()
                    .header("Accept-Encoding", "gzip")
                    .build()
                val res = chain.proceed(req)
                res
            }
            .addInterceptor(SessionCookieInterceptor(baseUrl, csrfName))
            .addInterceptor(logging)
            .certificatePinner(pinner)
            .build()

        okHttpInstance = client
        return client
    }

    fun provideRetrofit(context: Context): Retrofit {
        val existing = retrofitInstance
        if (existing != null) return existing

        val baseUrl = context.getString(R.string.web_base_url).trimEnd('/') + "/"
        val client = provideOkHttpClient(context)

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

        retrofitInstance = retrofit
        return retrofit
    }

    fun provideApiService(context: Context): ApiService {
        val existing = apiServiceInstance
        if (existing != null) return existing
        val service = provideRetrofit(context).create(ApiService::class.java)
        apiServiceInstance = service
        return service
    }
}


